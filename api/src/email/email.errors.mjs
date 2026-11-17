export class InvalidEmailJobError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidEmailJobError';
  }
}

export class EmailProviderError extends Error {
  constructor(message, { status, retryable }) {
    super(message);
    this.name = 'EmailProviderError';
    this.status = status;
    this.retryable = retryable;
  }
}