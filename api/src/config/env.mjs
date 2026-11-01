if (process.env.NODE_ENV !== 'test') {
  try {
    process.loadEnvFile();
  } catch {
    // Environment variables may instead be supplied by the hosting platform.
  }
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  dbStorage: process.env.DB_STORAGE ?? './data/events.sqlite',
  amqpUrl: process.env.AMQP_URL,
  redisUrl: process.env.REDIS_URL,
  smtpUrl: process.env.SMTP_URL,
  mailFrom:
    process.env.MAIL_FROM ??
    'Campus Events <no-reply@example.com>'
});
