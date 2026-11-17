import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildRegistrationConfirmationEmail,
  sendRegistrationConfirmationEmail
} from '../../src/email/registration-confirmation.mjs';

const job = {
  email: 'student@example.com',
  name: 'Alex Student',
  eventTitle: 'Campus Coding Night',
  startsAt: '2026-12-01T18:00:00.000Z',
  location: 'Main Library'
};

describe('registration confirmation email', () => {
  test('builds an email from a registration job', () => {
    const email =
      buildRegistrationConfirmationEmail(job);

    assert.equal(
      email.recipientEmail,
      'student@example.com'
    );

    assert.equal(email.recipientName, 'Alex Student');

    assert.equal(
      email.subject,
      'Registration confirmed: Campus Coding Night'
    );

    assert.match(email.htmlContent, /Alex Student/);
    assert.match(email.htmlContent, /Campus Coding Night/);
    assert.match(email.htmlContent, /Main Library/);
  });

  test('escapes user-controlled HTML', () => {
    const email = buildRegistrationConfirmationEmail({
      ...job,
      name: '<script>alert("bad")</script>'
    });

    assert.doesNotMatch(
      email.htmlContent,
      /<script>/
    );

    assert.match(
      email.htmlContent,
      /&lt;script&gt;/
    );
  });

  test('passes the built email to the provider', async () => {
    const sentEmails = [];

    const response =
      await sendRegistrationConfirmationEmail(job, {
        sendEmail: async (email) => {
          sentEmails.push(email);

          return {
            messageId: 'brevo-message-123'
          };
        }
      });

    assert.equal(sentEmails.length, 1);

    assert.equal(
      sentEmails[0].recipientEmail,
      job.email
    );

    assert.deepEqual(response, {
      messageId: 'brevo-message-123'
    });
  });
});