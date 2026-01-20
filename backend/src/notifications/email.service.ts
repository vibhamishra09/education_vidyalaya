import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private readonly fromEmail = 'notify@noreply.webyalaya.com';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');

    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY not configured. Email notifications will not work.',
      );
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
    try {
      if (!this.resend) {
        this.logger.warn(
          'Resend not initialized. Skipping email notification.',
        );
        return false;
      }

      // Get user email from database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user || !user.email) {
        this.logger.warn(`User ${userId} not found or has no email address`);
        return false;
      }

      // Send email via Resend
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: user.email,
        subject,
        html: this.formatEmailHtml(user.name || 'User', message),
      });

      if (error) {
        this.logger.error('Failed to send email via Resend:', {
          error,
          message: error.message,
          name: error.name,
          from: this.fromEmail,
          to: user.email,
          subject,
        });
        return false;
      }

      this.logger.log(
        `✅ Email sent successfully to ${user.email} (ID: ${data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error('Error sending email notification:', {
        error,
        message: error instanceof Error ? error.message : String(error),
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
