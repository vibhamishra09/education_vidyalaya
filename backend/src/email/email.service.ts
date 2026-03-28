import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger';

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class EmailService {
  private sesClient: SESClient;
  /** Verified identity in SES (domain or single address). Override via SES_FROM_EMAIL for dev/sandbox. */
  private readonly fromEmail: string;
  private region: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(EmailService.name);
    this.fromEmail =
      this.configService.get<string>('SES_FROM_EMAIL')?.trim() ||
      'notifications@webyalaya.com';
    // Use AWS_SES_REGION if set, otherwise fall back to AWS_REGION, default to us-east-1
    this.region =
      this.configService.get<string>('AWS_SES_REGION') ||
      this.configService.get<string>('AWS_REGION') ||
      'us-east-1';
    this.sesClient = new SESClient({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
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
    try {
      // Get user email from database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user || !user.email) {
        this.logger.warn(`User ${userId} not found or has no email address`);
        return false;
      }

      this.logger.log(
        `📧 Preparing to send email from ${this.fromEmail} to ${user.email}`,
      );

      // Send email via SES
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
              Data: this.formatEmailHtml(user.name || 'User', message),
              Charset: 'UTF-8',
            },
          },
        },
      });

      const response = await this.sesClient.send(command);

      this.logger.log(
        `✅ Email sent successfully from ${this.fromEmail} to ${user.email} (MessageId: ${response.MessageId})`,
      );
      return true;
    } catch (error) {
      this.logger.error({
        message: 'Error sending email notification',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        subject,
      });
      return false;
    }
  }

  async sendDirectEmailNotification(
    email: string,
    subject: string,
    message: string,
    recipientName: string = 'User',
  ): Promise<EmailDeliveryResult> {
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
              Data: this.formatEmailHtml(recipientName, message),
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

  /**
   * Webinar: registration confirmation (AWS SES). Includes details, join link, passcode, waiting-room link.
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
    waitingRoomUrl: string;
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
      waitingRoomUrl,
      passcode,
    } = params;

    const when = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: timezone?.trim() || 'UTC',
    }).format(scheduledAt);

    const subject = `You're registered: ${webinarTitle}`;

    const descBlock = webinarDescription?.trim()
      ? `<p style="margin:12px 0 0;color:#444;line-height:1.5;">${this.escapeHtml(webinarDescription.trim()).replace(/\r\n|\n|\r/g, '<br/>')}</p>`
      : '';

    const message = `
<p style="margin:0 0 16px;color:#333;">Thank you for registering. Below are your <strong>webinar details</strong>, your <strong>unique passcode</strong>, and the <strong>join link</strong>.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
  <tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;width:120px;"><strong>Webinar</strong></td><td style="padding:6px 0;color:#0f172a;">${this.escapeHtml(webinarTitle)}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;"><strong>Host</strong></td><td style="padding:6px 0;color:#0f172a;">${this.escapeHtml(hostName)}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;"><strong>Scheduled</strong></td><td style="padding:6px 0;color:#0f172a;">${this.escapeHtml(when)}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;"><strong>Duration</strong></td><td style="padding:6px 0;color:#0f172a;">${durationMinutes} minutes</td></tr>
</table>
${descBlock}
<div style="margin:20px 0;padding:16px 18px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;">
  <p style="margin:0 0 8px;font-size:13px;color:#047857;font-weight:600;">Your unique passcode</p>
  <p style="margin:0;font-size:22px;letter-spacing:0.2em;font-family:ui-monospace,Menlo,monospace;color:#064e3b;">${this.escapeHtml(passcode)}</p>
</div>
<p style="margin:18px 0 8px;font-size:14px;color:#0f172a;"><strong>Join link</strong></p>
<p style="margin:0 0 14px;"><a href="${joinPageUrl}" style="display:inline-block;padding:12px 22px;background:#16a34a;color:#ffffff !important;text-decoration:none;border-radius:8px;font-weight:600;">Join webinar</a></p>
<p style="margin:0 0 16px;font-size:12px;color:#64748b;word-break:break-all;">${this.escapeHtml(joinPageUrl)}</p>
<p style="margin:0 0 8px;font-size:14px;color:#0f172a;"><strong>How to join</strong></p>
<ol style="margin:0 0 16px;padding-left:20px;color:#334155;line-height:1.5;">
  <li>The host must <strong>approve</strong> your registration.</li>
  <li>Open the join link, enter the <strong>same full name and email</strong> you used to register, and your <strong>passcode</strong>.</li>
  <li>After approval, you will enter the session (you may briefly see a waiting state until admitted).</li>
</ol>
<p style="margin:0 0 8px;font-size:14px;color:#0f172a;"><strong>Waiting room (optional)</strong></p>
<p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Check status or open the join page from here: <a href="${waitingRoomUrl}" style="color:#16a34a;">${this.escapeHtml(waitingRoomUrl)}</a></p>
`;

    return this.sendDirectEmailNotification(
      recipientEmail,
      subject,
      message,
      recipientName,
    );
  }

  /**
   * Webinar: host approved the registrant — remind them to join with passcode.
   */
  async sendWebinarApprovalEmail(params: {
    recipientEmail: string;
    recipientName: string;
    webinarTitle: string;
    joinPageUrl: string;
    passcode: string;
  }): Promise<EmailDeliveryResult> {
    const { recipientEmail, recipientName, webinarTitle, joinPageUrl, passcode } =
      params;
    const subject = `You're approved: ${webinarTitle}`;
    const message = `
<p style="margin:0 0 12px;color:#333;">Good news — the host has <strong>approved</strong> your registration for <strong>${this.escapeHtml(webinarTitle)}</strong>.</p>
<p style="margin:0 0 16px;color:#475569;">Use your passcode below on the join page with the same name and email you registered with.</p>
<div style="margin:16px 0;padding:14px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;">
  <p style="margin:0 0 6px;font-size:12px;color:#047857;font-weight:600;">Passcode</p>
  <p style="margin:0;font-size:20px;letter-spacing:0.15em;font-family:ui-monospace,Menlo,monospace;color:#064e3b;">${this.escapeHtml(passcode)}</p>
</div>
<p style="margin:16px 0;"><a href="${joinPageUrl}" style="display:inline-block;padding:12px 22px;background:#16a34a;color:#ffffff !important;text-decoration:none;border-radius:8px;font-weight:600;">Join webinar</a></p>
<p style="margin:0;font-size:12px;color:#64748b;word-break:break-all;">${this.escapeHtml(joinPageUrl)}</p>
`;
    return this.sendDirectEmailNotification(
      recipientEmail,
      subject,
      message,
      recipientName,
    );
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
