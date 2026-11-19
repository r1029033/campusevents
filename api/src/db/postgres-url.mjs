const legacySslModes = new Set([
  'prefer',
  'require',
  'verify-ca'
]);

export function enforceFullTlsVerification(databaseUrl) {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get('sslmode');

  if (legacySslModes.has(sslMode)) {
    url.searchParams.set('sslmode', 'verify-full');
  }

  return url.toString();
}
