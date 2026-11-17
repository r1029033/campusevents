import path from 'node:path';

if (process.env.NODE_ENV !== 'test') {
  const envFiles = [
    path.resolve(import.meta.dirname, '../../../.env.local'),
    path.resolve(import.meta.dirname, '../../.env')
  ];

  for (const envFile of envFiles) {
    try {
      process.loadEnvFile(envFile);
    } catch {
      // The file is optional because Render supplies variables directly.
    }
  }
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  dbStorage: process.env.DB_STORAGE ?? './data/events.sqlite',
  brevoApiKey: process.env.BREVO_API_KEY,
mailFromAddress: process.env.MAIL_FROM_ADDRESS,
mailFromName: process.env.MAIL_FROM_NAME ?? 'Campus Events',
  databaseUrl: process.env.DATABASE_URL,
  databaseUrlUnpooled: process.env.DATABASE_URL_UNPOOLED,
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
  amqpUrl: process.env.AMQP_URL,
  redisUrl: process.env.REDIS_URL,
  smtpUrl: process.env.SMTP_URL,
  mailFrom:
    process.env.MAIL_FROM ??
    'Campus Events <no-reply@example.com>'
});


