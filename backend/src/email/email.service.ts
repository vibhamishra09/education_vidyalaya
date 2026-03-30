import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { appendFile } from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger';

/** Asia Pacific (Mumbai). Override with `AWS_SES_REGION` in `.env` (do not use `AWS_REGION` — that is for S3/other). */
const DEFAULT_SES_REGION = 'ap-south-1';
/** Must match a verified identity in SES (same region). Override with `SES_FROM_EMAIL`. */
const DEFAULT_SES_FROM_EMAIL = 'notifications@webyalaya.com';

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  /**
   * When the API is not production (NODE_ENV !== 'production', including unset) or
   * WEBINAR_EXPOSE_EMAIL_PREVIEW_IN_API=true. Lets registration JSON include HTML for DevTools.
   */
  debugEmailPreview?: {
    to: string;
    subject: string;
    html: string;
  };
}

@Injectable()
export class EmailService implements OnModuleInit {
  private sesClient: SESClient;
  /** Verified identity in SES (domain or single address). Override via SES_FROM_EMAIL for dev/sandbox. */
  private readonly fromEmail: string;
  private region: string;
  private readonly hasExplicitSesCredentials: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(EmailService.name);
    this.fromEmail =
      this.configService.get<string>('SES_FROM_EMAIL')?.trim() ||
      DEFAULT_SES_FROM_EMAIL;
    // SES region only: never inherit AWS_REGION (often us-west-2 / us-east-1 for S3).
    this.region =
      this.configService.get<string>('AWS_SES_REGION')?.trim() ||
      DEFAULT_SES_REGION;

    const accessKeyId =
      this.configService.get<string>('AWS_ACCESS_KEY_ID')?.trim() || '';
    const secretAccessKey =
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY')?.trim() || '';
    const hasExplicitCredentials = Boolean(accessKeyId && secretAccessKey);
    this.hasExplicitSesCredentials = hasExplicitCredentials;

    /**
     * Passing empty strings for credentials disables the SDK default chain (shared
     * `~/.aws/credentials`, IAM role, ECS task role, etc.). Only pass credentials
     * when both key and secret are set; otherwise let the SDK resolve credentials.
     */
    this.sesClient = new SESClient({
      region: this.region,
      ...(hasExplicitCredentials
        ? {
            credentials: {
              accessKeyId,
              secretAccessKey,
            },
          }
        : {}),
    });

    if (!hasExplicitCredentials) {
      this.logger.warn(
        'AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not both set — SES uses the default AWS credential provider chain (environment, shared credentials file, IAM role). Ensure AWS CLI profile or instance role can call ses:SendEmail.',
      );
    }
    if (!this.configService.get<string>('SES_FROM_EMAIL')?.trim()) {
      this.logger.warn(
        `SES_FROM_EMAIL is not set — using default "${DEFAULT_SES_FROM_EMAIL}". It must be verified in Amazon SES in region ${this.region} or sending will fail.`,
      );
    }
  }

  onModuleInit(): void {
    const mailLogPath = this.getMailDetailsFilePath();
    this.logger.log({
      message: 'SES (email) bootstrap — outbound mail uses Amazon SES only',
      region: this.region,
      fromEmail: this.fromEmail,
      explicitAwsCredentials: this.hasExplicitSesCredentials,
      mailDetailsLogFile: mailLogPath,
      hint:
        `Defaults: region ${DEFAULT_SES_REGION}, from ${DEFAULT_SES_FROM_EMAIL}. Override via env; verify identity in SES; grant IAM ses:SendEmail.`,
    });
  }

  /** Path to append-only log of sent mail (default: `maildetails.txt` under process cwd, usually `backend/`). */
  private getMailDetailsFilePath(): string {
    const name =
      this.configService.get<string>('MAIL_DETAILS_FILE')?.trim() ||
      'maildetails.txt';
    return path.isAbsolute(name) ? name : path.join(process.cwd(), name);
  }

  /**
   * Appends a copy of each outbound email to a local text file (for debugging).
   * Failures here never block sending.
   */
  private async appendMailDetailsToFile(payload: {
    transport: 'ses';
    from: string;
    to: string;
    subject: string;
    html: string;
    success: boolean;
    messageId?: string;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const filePath = this.getMailDetailsFilePath();
      const lines = [
        '',
        '================================================================================',
        `Time (UTC): ${new Date().toISOString()}`,
        `Transport: ${payload.transport}`,
        `From: ${payload.from}`,
        `To: ${payload.to}`,
        `Subject: ${payload.subject}`,
        `Status: ${payload.success ? 'SUCCESS' : 'FAILED'}`,
        ...(payload.messageId ? [`MessageId: ${payload.messageId}`] : []),
        ...(payload.errorCode ? [`ErrorCode: ${payload.errorCode}`] : []),
        ...(payload.errorMessage ? [`Error: ${payload.errorMessage}`] : []),
        '--- HTML ---',
        payload.html,
        '',
      ];
      await appendFile(filePath, lines.join('\n'), 'utf-8');
    } catch (err) {
      this.logger.warn({
        message: 'Could not append to mail details file',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Send an email notification to a user
   * @param userId Database user ID (not clerkId)
   * @param subject Email subject
   * @param message Email message/body
   * @returns Promise<boolean> Success status
   */
  async sendEmailNotification(
    userId: string,
    subject: string,
    message: string,
  ): Promise<boolean> {
    let toEmail = '';
    let fullHtmlForLog = '';
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user || !user.email) {
        this.logger.warn(`User ${userId} not found or has no email address`);
        return false;
      }

      toEmail = user.email;
      fullHtmlForLog = this.formatEmailHtml(user.name || 'User', message);

      this.logger.log(
        `📧 Preparing to send email via SES from ${this.fromEmail} to ${user.email}`,
      );

      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [user.email],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: fullHtmlForLog,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const response = await this.sesClient.send(command);

      this.logger.log(
        `✅ Email sent successfully from ${this.fromEmail} to ${user.email} (MessageId: ${response.MessageId})`,
      );
      await this.appendMailDetailsToFile({
        transport: 'ses',
        from: this.fromEmail,
        to: toEmail,
        subject,
        html: fullHtmlForLog,
        success: true,
        messageId: response.MessageId,
      });
      return true;
    } catch (error) {
      this.logger.error({
        message: 'Error sending email notification',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        subject,
      });
      if (toEmail && fullHtmlForLog) {
        await this.appendMailDetailsToFile({
          transport: 'ses',
          from: this.fromEmail,
          to: toEmail,
          subject,
          html: fullHtmlForLog,
          success: false,
          errorMessage:
            error instanceof Error ? error.message : String(error),
        });
      }
      return false;
    }
  }

  async sendDirectEmailNotification(
    email: string,
    subject: string,
    message: string,
    recipientName: string = 'User',
  ): Promise<EmailDeliveryResult> {
    const fullHtml = this.formatEmailHtml(recipientName, message);

    try {
      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: fullHtml,
              Charset: 'UTF-8',
            },
          },
        },
      });
      const response = await this.sesClient.send(command);
      this.logger.log({
        message: '✅ Direct email sent successfully',
        source: this.fromEmail,
        destination: email,
        subject,
        messageId: response.MessageId,
        region: this.region,
      });
      await this.appendMailDetailsToFile({
        transport: 'ses',
        from: this.fromEmail,
        to: email,
        subject,
        html: fullHtml,
        success: true,
        messageId: response.MessageId,
      });
      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      const awsError = error as {
        name?: string;
        message?: string;
        $metadata?: { requestId?: string; httpStatusCode?: number };
      };
      this.logger.error({
        message: 'Error sending direct email notification',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        email,
        subject,
        source: this.fromEmail,
        region: this.region,
        awsErrorCode: awsError?.name,
        awsErrorMessage: awsError?.message,
        awsRequestId: awsError?.$metadata?.requestId,
        awsHttpStatusCode: awsError?.$metadata?.httpStatusCode,
      });
      await this.appendMailDetailsToFile({
        transport: 'ses',
        from: this.fromEmail,
        to: email,
        subject,
        html: fullHtml,
        success: false,
        errorCode: awsError?.name,
        errorMessage:
          awsError?.message ||
          (error instanceof Error ? error.message : String(error)),
      });
      return {
        success: false,
        errorCode: awsError?.name,
        errorMessage:
          awsError?.message ||
          (error instanceof Error ? error.message : String(error)),
      };
    }
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Intl throws RangeError for invalid dates or unknown IANA zones — never break the request. */
  private formatScheduledForEmail(scheduledAt: Date, timezone: string): string {
    const d =
      scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt as string);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    const tz = (timezone || 'UTC').trim() || 'UTC';
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: tz,
      }).format(d);
    } catch {
      try {
        return new Intl.DateTimeFormat('en-US', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: 'UTC',
        }).format(d);
      } catch {
        return d.toISOString();
      }
    }
  }

  /**
   * Nest often runs with NODE_ENV unset (`nest start --watch`), so `=== 'development'` never matched.
   * Treat any non-production env as dev-like; production must set NODE_ENV=production explicitly.
   */
  private shouldExposeWebinarRegistrationEmailPreview(): boolean {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return (
      this.configService.get<string>('WEBINAR_EXPOSE_EMAIL_PREVIEW_IN_API')?.trim() ===
        'true' ||
      this.configService.get<string>('LOG_WEBINAR_REGISTRATION_EMAIL')?.trim() === 'true'
    );
  }

  /** When true, prints the outbound webinar registration email to stdout (see LOG_WEBINAR_REGISTRATION_EMAIL). */
  private shouldLogWebinarRegistrationEmailToConsole(): boolean {
    if (this.shouldExposeWebinarRegistrationEmailPreview()) {
      return true;
    }
    return (
      this.configService.get<string>('LOG_WEBINAR_REGISTRATION_EMAIL')?.trim() ===
      'true'
    );
  }

  private logWebinarRegistrationEmailToConsole(payload: {
    fromEmail: string;
    recipientEmail: string;
    recipientName: string;
    subject: string;
    webinarTitle: string;
    passcode: string;
    joinPageUrl: string;
    waitingPageUrl: string;
    innerHtml: string;
    fullHtml: string;
  }): void {
    if (!this.shouldLogWebinarRegistrationEmailToConsole()) {
      return;
    }
    const lines = [
      '',
      '========== WEBINAR REGISTRATION EMAIL (console log) ==========',
      `From: ${payload.fromEmail}`,
      `To: ${payload.recipientEmail} (${payload.recipientName})`,
      `Subject: ${payload.subject}`,
      `Webinar: ${payload.webinarTitle}`,
      `Passcode: ${payload.passcode}`,
      `Join URL: ${payload.joinPageUrl}`,
      `Waiting room URL: ${payload.waitingPageUrl}`,
      '---------- Inner HTML (body fragment) ----------',
      payload.innerHtml,
      '---------- Full HTML (as sent via SES) ----------',
      payload.fullHtml,
      '========== END WEBINAR REGISTRATION EMAIL ==========',
      '',
    ];
    console.log(lines.join('\n'));
  }

  /**
   * Webinar: confirmation email — Join webinar (passcode), then waiting room if host uses it.
   */
  async sendWebinarRegistrationConfirmationEmail(params: {
    recipientEmail: string;
    recipientName: string;
    webinarTitle: string;
    webinarDescription: string | null;
    scheduledAt: Date;
    durationMinutes: number;
    timezone: string;
    hostName: string;
    joinPageUrl: string;
    waitingPageUrl: string;
    passcode: string;
  }): Promise<EmailDeliveryResult> {
    const {
      recipientEmail,
      recipientName,
      webinarTitle,
      webinarDescription,
      scheduledAt,
      durationMinutes,
      timezone,
      hostName,
      joinPageUrl,
      waitingPageUrl,
      passcode,
    } = params;

    const when = this.formatScheduledForEmail(scheduledAt, timezone);

    const subject = `You're registered: ${webinarTitle}`;

    const descBlock = webinarDescription?.trim()
      ? `<p style="margin:12px 0 0;color:#444;line-height:1.5;">${this.escapeHtml(webinarDescription.trim()).replace(/\r\n|\n|\r/g, '<br/>')}</p>`
      : '';

    const message = `
<p style="margin:0 0 16px;color:#333;">Thank you for registering.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
  <tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;width:120px;"><strong>Webinar</strong></td><td style="padding:6px 0;color:#0f172a;">${this.escapeHtml(webinarTitle)}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;"><strong>Host</strong></td><td style="padding:6px 0;color:#0f172a;">${this.escapeHtml(hostName)}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;"><strong>Scheduled</strong></td><td style="padding:6px 0;color:#0f172a;">${this.escapeHtml(when)}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;"><strong>Duration</strong></td><td style="padding:6px 0;color:#0f172a;">${durationMinutes} minutes</td></tr>
</table>
${descBlock}
<div style="margin:20px 0;padding:16px 18px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;">
  <p style="margin:0 0 8px;font-size:13px;color:#047857;font-weight:600;">Your passcode</p>
  <p style="margin:0;font-size:22px;letter-spacing:0.2em;font-family:ui-monospace,Menlo,monospace;color:#064e3b;">${this.escapeHtml(passcode)}</p>
</div>
<p style="margin:16px 0 0;color:#334155;line-height:1.55;font-size:14px;">Open <strong>Join webinar</strong> below, enter this passcode, then—if the host turned on a waiting room—you&apos;ll wait there until admitted and tap <strong>Join webinar</strong> again. If there is no waiting room, you&apos;ll join right after your passcode.</p>
<p style="margin:20px 0 0;"><a href="${this.escapeHtml(joinPageUrl)}" style="display:inline-block;padding:12px 22px;background:#16a34a;color:#ffffff !important;text-decoration:none;border-radius:8px;font-weight:600;">Join webinar</a></p>
<p style="margin:16px 0 0;font-size:13px;color:#64748b;">Returned after entering your passcode? <a href="${this.escapeHtml(waitingPageUrl)}" style="color:#2563eb;">Open waiting room</a></p>
`;

    const fullHtml = this.formatEmailHtml(recipientName, message);
    this.logWebinarRegistrationEmailToConsole({
      fromEmail: this.fromEmail,
      recipientEmail,
      recipientName,
      subject,
      webinarTitle,
      passcode,
      joinPageUrl,
      waitingPageUrl,
      innerHtml: message,
      fullHtml,
    });

    const sent = await this.sendDirectEmailNotification(
      recipientEmail,
      subject,
      message,
      recipientName,
    );
    if (this.shouldExposeWebinarRegistrationEmailPreview()) {
      return {
        ...sent,
        debugEmailPreview: {
          to: recipientEmail,
          subject,
          html: fullHtml,
        },
      };
    }
    return sent;
  }

  /**
   * Format email message as HTML
   */
  private formatEmailHtml(userName: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Webyalaya Notification</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin-top: 0;">Webyalaya Notification</h1>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
            <p style="margin-top: 0;">Hello ${userName},</p>
            <div style="margin: 12px 0;">${message}</div>
            <p style="margin-bottom: 0;">Best regards,<br>The Webyalaya Team</p>
          </div>
          <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">This is an automated notification from Webyalaya.</p>
            <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} Webyalaya. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }
}
