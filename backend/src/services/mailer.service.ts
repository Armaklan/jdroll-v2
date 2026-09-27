import nodemailer from 'nodemailer';
import { SmtpParams, loadSmtpParams } from '../config/smtp.js';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailTransporter {
  sendMail(mail: { from: string; to: string; subject: string; html: string; text?: string }): Promise<unknown>;
}

export interface IMailerService {
  readonly siteUrl: string | null;
  isConfigured(): boolean;
  sendEmail(input: SendEmailInput): Promise<boolean>;
}

export class MailerService implements IMailerService {
  readonly siteUrl: string | null;
  private transporter: IEmailTransporter | null = null;

  constructor(
    private readonly params: SmtpParams | null,
    private readonly createTransporter: (params: SmtpParams) => IEmailTransporter = defaultCreateTransporter
  ) {
    this.siteUrl = params?.siteUrl ?? null;
  }

  isConfigured(): boolean {
    return this.params !== null;
  }

  async sendEmail(input: SendEmailInput): Promise<boolean> {
    if (this.params === null || !input.to || input.to.trim() === '') {
      return false;
    }

    try {
      if (this.transporter === null) {
        this.transporter = this.createTransporter(this.params);
      }
      await this.transporter.sendMail({
        from: this.params.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return true;
    } catch (error) {
      console.error("[Mailer] Échec de l'envoi de l'email", { to: input.to, subject: input.subject, error });
      return false;
    }
  }
}

function defaultCreateTransporter(params: SmtpParams): IEmailTransporter {
  return nodemailer.createTransport({
    host: params.host,
    port: params.port,
    secure: params.secure,
    auth: params.user !== undefined ? { user: params.user, pass: params.pass } : undefined,
  }) as unknown as IEmailTransporter;
}

export const mailerService = new MailerService(loadSmtpParams());
