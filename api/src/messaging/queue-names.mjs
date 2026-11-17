export const mailQueueName =
  'registration-confirmation-emails';

export const mailRetryQueueName =
  `${mailQueueName}.retry`;

export const mailDeadLetterQueueName =
  `${mailQueueName}.dead`;