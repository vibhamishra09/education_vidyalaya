import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger';

@Injectable()
export class EmailService {
  private sesClient: SESClient;
  private readonly fromEmail = 'notifications@webyalaya.com';
  private region: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(EmailService.name);
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
            <p>${message}</p>
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
