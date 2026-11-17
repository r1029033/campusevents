import { env } from '../config/env.mjs';

const brevoEmailEndpoint = 'https://api.brevo.com/v3/smtp/email';

function validateConfiguration() {
  if (!env.brevoApiKey) {
    throw new Error('BREVO_API_KEY is required to send email');
  }

  if (!env.mailFromAddress) {
    throw new Error('MAIL_FROM_ADDRESS is required to send email');
  }
}

export async function sendTransactionalEmail({
  recipientEmail,
  recipientName,
  subject,
  htmlContent
}) {
  validateConfiguration();

  const response = await fetch(brevoEmailEndpoint, {
    method: 'POST',

    headers: {
      accept: 'application/json',
      'api-key': env.brevoApiKey,
      'content-type': 'application/json'
    },

    body: JSON.stringify({
      sender: {
        email: env.mailFromAddress,
        name: env.mailFromName
      },

      to: [
        {
          email: recipientEmail,
          name: recipientName
        }
      ],

      subject,
      htmlContent
    })
  });

  if (!response.ok) {
    const responseBody = await response.text();

    throw new Error(
      `Brevo rejected the email with status ${response.status}: ` +
        responseBody.slice(0, 500)
    );
  }

  return response.json();
}