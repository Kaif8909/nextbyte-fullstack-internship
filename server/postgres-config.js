import { X509Certificate } from 'node:crypto';
import { initializationError } from './diagnostics.js';

export function parseDatabaseUrl(value) {
  if (!value) throw initializationError('DATABASE_URL_MISSING');
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) throw new Error();
    return url;
  } catch { throw initializationError('DATABASE_URL_INVALID'); }
}

export function normalizeCaCertificate(value) {
  if (!value) return undefined;
  // Dashboard pastes can contain literal backslash-n sequences instead of newlines.
  // Normalize those and CRLF only; never trim quotes or accept non-certificate text.
  const pem = value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
  const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  if (!blocks || blocks.join('').replace(/\s/g, '') !== pem.replace(/\s/g, ''))
    throw initializationError('DATABASE_CA_INVALID');
  try {
    for (const block of blocks) if (!new X509Certificate(block).ca) throw new Error();
  } catch { throw initializationError('DATABASE_CA_INVALID'); }
  return pem;
}
