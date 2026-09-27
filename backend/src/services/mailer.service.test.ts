import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MailerService, SendEmailInput, IEmailTransporter } from './mailer.service.js';
import { SmtpParams } from '../config/smtp.js';

describe('MailerService', () => {
  let sentMails: { from: string; to: string; subject: string; html: string; text?: string }[];
  let transporterCreated: number;
  let fakeTransporter: IEmailTransporter;

  const validParams: SmtpParams = {
    host: 'localhost',
    port: 1025,
    secure: false,
    from: 'noreply@jdroll.fr',
    user: 'user',
    pass: 'pass',
    siteUrl: 'http://localhost:8080',
  };

  beforeEach(() => {
    sentMails = [];
    transporterCreated = 0;
    fakeTransporter = {
      sendMail: async (mail) => {
        sentMails.push(mail);
        return {};
      },
    };
  });

  it('should expose the configured site url', () => {
    const mailer = new MailerService(validParams, () => fakeTransporter);
    assert.equal(mailer.siteUrl, 'http://localhost:8080');
  });

  it('should report configured only when smtp params are provided', () => {
    assert.equal(new MailerService(null, () => fakeTransporter).isConfigured(), false);
    assert.equal(new MailerService(validParams, () => fakeTransporter).isConfigured(), true);
  });

  it('should not send any email when smtp is not configured', async () => {
    const mailer = new MailerService(null, () => {
      transporterCreated += 1;
      return fakeTransporter;
    });

    const result = await mailer.sendEmail({ to: 'user@test.com', subject: 'Sujet', html: '<p>Test</p>' });

    assert.equal(result, false);
    assert.equal(sentMails.length, 0);
    assert.equal(transporterCreated, 0);
  });

  it('should not send any email when the recipient is empty', async () => {
    const mailer = new MailerService(validParams, () => fakeTransporter);

    const result = await mailer.sendEmail({ to: '  ', subject: 'Sujet', html: '<p>Test</p>' });

    assert.equal(result, false);
    assert.equal(sentMails.length, 0);
  });

  it('should send an email through the transporter when configured', async () => {
    const mailer = new MailerService(validParams, () => fakeTransporter);

    const input: SendEmailInput = {
      to: 'user@test.com',
      subject: 'Sujet du mail',
      html: '<p>Contenu</p>',
      text: 'Contenu',
    };
    const result = await mailer.sendEmail(input);

    assert.equal(result, true);
    assert.equal(sentMails.length, 1);
    assert.equal(sentMails[0].from, 'noreply@jdroll.fr');
    assert.equal(sentMails[0].to, 'user@test.com');
    assert.equal(sentMails[0].subject, 'Sujet du mail');
    assert.equal(sentMails[0].html, '<p>Contenu</p>');
    assert.equal(sentMails[0].text, 'Contenu');
  });

  it('should return false instead of throwing when the transporter fails', async () => {
    const failingTransporter: IEmailTransporter = {
      sendMail: async () => {
        throw new Error('SMTP unavailable');
      },
    };
    const mailer = new MailerService(validParams, () => failingTransporter);

    const result = await mailer.sendEmail({ to: 'user@test.com', subject: 'Sujet', html: '<p>Test</p>' });

    assert.equal(result, false);
  });
});
