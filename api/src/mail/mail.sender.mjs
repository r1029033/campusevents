import nodemailer from 'nodemailer';
import { env } from '../config/env.mjs';

let transporter;

const getTransporter = () => {
  if (!env.smtpUrl) {
    throw new Error('SMTP_URL is required to send mail');
  }

  transporter ??= nodemailer.createTransport(env.smtpUrl);
  return transporter;
};

export async function sendRegistrationConfirmation(job) {
  const startsAt = new Intl.DateTimeFormat('en-BE', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Brussels'
  }).format(new Date(job.startsAt));

  return getTransporter().sendMail({
    from: env.mailFrom,
    to: job.email,
    subject: `Registration confirmed: ${job.eventTitle}`,
    text: [
      `Hello ${job.name},`,
      '',
      `You are registered for ${job.eventTitle}.`,
      `When: ${startsAt}`,
      `Where: ${job.location}`,
      '',
      'See you there!',
      'Campus Events'
    ].join('\n')
  });
}