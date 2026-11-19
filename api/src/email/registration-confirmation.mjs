import { env } from '../config/env.mjs';
import { sendTransactionalEmail } from './brevo.client.mjs';
import { InvalidEmailJobError } from './email.errors.mjs';

const requiredFields = [
  'email',
  'name',
  'eventTitle',
  'startsAt',
  'location'
];

function validateJob(job) {
  if (!job || typeof job !== 'object') {
    throw new InvalidEmailJobError(
      'Registration email job must be an object'
    );
  }

  for (const field of requiredFields) {
    if (
      typeof job[field] !== 'string' ||
      job[field].trim() === ''
    ) {
      throw new InvalidEmailJobError(
        `Registration email job is missing ${field}`
      );
    }
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll(/'/g, '&#039;');
}

function makeSingleLine(value) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function formatEventDate(startsAt) {
  const date = new Date(startsAt);

  if (Number.isNaN(date.getTime())) {
    throw new InvalidEmailJobError(
      'Registration email job has an invalid startsAt'
    );
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: env.eventTimeZone
  }).format(date);
}

export function buildRegistrationConfirmationEmail(job) {
  validateJob(job);

  const participantName = escapeHtml(job.name);
  const eventTitle = escapeHtml(job.eventTitle);
  const location = escapeHtml(job.location);
  const formattedDate = escapeHtml(
    formatEventDate(job.startsAt)
  );

  return {
    recipientEmail: job.email,
    recipientName: makeSingleLine(job.name),

    subject:
      'Registration confirmed: ' +
      makeSingleLine(job.eventTitle),

    htmlContent: `
      <!doctype html>
      <html lang="en">
        <body>
          <h1>Registration confirmed</h1>

          <p>Hello ${participantName},</p>

          <p>
            You are registered for
            <strong>${eventTitle}</strong>.
          </p>

          <p>
            <strong>Date:</strong> ${formattedDate}<br>
            <strong>Location:</strong> ${location}
          </p>

          <p>We look forward to seeing you there.</p>

          <p>Campus Events</p>
        </body>
      </html>
    `.trim()
  };
}

export async function sendRegistrationConfirmationEmail(
  job,
  {
    sendEmail = sendTransactionalEmail
  } = {}
) {
  const email = buildRegistrationConfirmationEmail(job);
  return sendEmail(email);
}
