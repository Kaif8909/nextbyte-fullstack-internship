import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ApiError } from './validation.js';

const unauthorized = () => new ApiError(401, 'UNAUTHORIZED', 'A valid bearer token is required.');
const forbidden = () => new ApiError(403, 'FORBIDDEN', 'You do not have access to this event or booking.');
export function createAuth(env = process.env) {
  const secret = env.BOOKING_TOKEN_SECRET;
  let organizers;
  try {
    organizers = JSON.parse(env.ORGANIZER_CREDENTIALS || '[]');
    if (!Array.isArray(organizers) || organizers.some(item =>
      !/^[a-f0-9]{64}$/.test(item.tokenHash) || !Array.isArray(item.eventIds) ||
      item.eventIds.some(id => typeof id !== 'string' || !id || id === '*')))
      throw new Error('Invalid credential mapping');
  } catch { throw new Error('ORGANIZER_CREDENTIALS must contain tokenHash and explicit eventIds arrays.'); }
  function signingKey() {
    if (!secret || Buffer.byteLength(secret) < 32)
      throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'Booking access is not configured.');
    return secret;
  }
  const signature = text => createHmac('sha256', signingKey()).update(text).digest();
  return {
    assertBookingConfigured: signingKey,
    issueBookingToken(id) {
      const payload = Buffer.from(JSON.stringify({ bookingId: id, expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 })).toString('base64url');
      return `${payload}.${signature(payload).toString('base64url')}`;
    },
    authenticate(req, { organizerOnly = false } = {}) {
      const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
      if (!match || match[1].length > 2048) throw unauthorized();
      const token = match[1];
      const hash = createHash('sha256').update(token).digest('hex');
      const organizer = organizers.find(item => timingSafeEqual(Buffer.from(item.tokenHash), Buffer.from(hash)));
      if (organizer) return { type: 'organizer', eventIds: organizer.eventIds };
      if (organizerOnly) throw unauthorized();
      const parts = token.split('.');
      if (parts.length !== 2) throw unauthorized();
      let payload;
      try {
        const provided = Buffer.from(parts[1], 'base64url');
        const expected = signature(parts[0]);
        if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw unauthorized();
        payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      } catch (error) {
        if (error.status === 503) throw error;
        throw unauthorized();
      }
      if (typeof payload.bookingId !== 'string' || !Number.isInteger(payload.expires) || payload.expires <= Date.now() / 1000) throw unauthorized();
      return { type: 'booking', bookingId: payload.bookingId };
    },
    authorize(identity, eventId, bookingId) {
      if (identity.type === 'organizer' ? !identity.eventIds.includes(eventId) : identity.bookingId !== bookingId) throw forbidden();
    }
  };
}
