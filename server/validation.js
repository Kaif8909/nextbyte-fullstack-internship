export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s().-]{7,25}$/;
const stringIs = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
const integerIs = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function invalid(fields) {
  throw new ApiError(422, 'VALIDATION_ERROR', 'Please correct the submitted fields.', fields);
}
export function validatePerson(raw, withPhone = false) {
  if (!isObject(raw)) invalid([{ field: 'customer', message: 'An object is required.' }]);
  const name = raw.full_name ?? raw.name;
  const email = raw.email;
  const phone = raw.phone;
  const errors = [];
  if (!stringIs(name, 2, 100)) errors.push({ field: 'name', message: 'Use 2 to 100 characters.' });
  if (typeof email !== 'string' || email.length > 150 || !emailPattern.test(email))
    errors.push({ field: 'email', message: 'Enter a valid email (maximum 150 characters).' });
  if (withPhone && (typeof phone !== 'string' || !phonePattern.test(phone) || phone.replace(/\D/g, '').length < 7))
    errors.push({ field: 'phone', message: 'Enter a valid phone number (7 to 25 characters).' });
  if (errors.length) invalid(errors);
  return { name: name.trim(), email: email.trim().toLowerCase(), ...(withPhone ? { phone: phone.trim() } : {}) };
}
export const categories = new Set(['Music', 'Concerts', 'Festivals', 'Technology', 'Business', 'Sports', 'Food', 'Arts', 'Workshops', 'Nightlife']);
export function validateEvent(raw) {
  if (!isObject(raw)) invalid([{ field: 'body', message: 'Expected an object.' }]);
  const fields = [
    ['title', 5, 100], ['description', 25, 1800], ['city', 2, 70],
    ['venue', 3, 120], ['organizer', 2, 100]
  ];
  const errors = [];
  for (const [key, min, max] of fields) {
    if (!stringIs(raw[key], min, max)) errors.push({ field: key, message: `Use ${min} to ${max} characters.` });
  }
  if (!categories.has(raw.category)) errors.push({ field: 'category', message: 'Choose a supported category.' });
  if (!integerIs(raw.capacity, 1, 100000)) errors.push({ field: 'capacity', message: 'Use a whole number from 1 to 100000.' });
  if (!integerIs(raw.price, 0, 1000000)) errors.push({ field: 'price', message: 'Use a whole number from 0 to 1000000.' });
  const date = typeof raw.date === 'string' ? raw.date : '';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date) <= new Date())
    errors.push({ field: 'date', message: 'Enter a future ISO 8601 date with a timezone offset.' });
  if (errors.length) invalid(errors);
  return Object.fromEntries([...fields.map(([key]) => [key, raw[key].trim()]),
    ['category', raw.category], ['date', date], ['capacity', raw.capacity], ['price', raw.price]]);
}
export function validateBooking(raw) {
  if (!isObject(raw)) invalid([{ field: 'body', message: 'Expected an object.' }]);
  const customer = validatePerson(raw.customer, true);
  const errors = [];
  if (!stringIs(raw.eventId, 1, 80)) errors.push({ field: 'eventId', message: 'Valid event ID required.' });
  if (!['demo-card', 'demo-wallet'].includes(raw.payment)) errors.push({ field: 'payment', message: 'Select a supported demo payment method.' });
  if (raw.consent !== true) errors.push({ field: 'consent', message: 'Confirm this is a demo booking.' });
  const items = raw.items;
  if (!Array.isArray(items) || items.length < 1 || items.length > 3) {
    errors.push({ field: 'items', message: 'Select 1 to 3 ticket types.' });
  } else {
    const seen = new Set();
    let quantity = 0;
    for (const [index, item] of items.entries()) {
      if (!isObject(item) || !['early', 'general', 'vip'].includes(item.id) || seen.has(item.id) || !integerIs(item.quantity, 1, 10))
        errors.push({ field: `items[${index}]`, message: 'Use a unique valid ticket type and quantity from 1 to 10.' });
      if (isObject(item)) { seen.add(item.id); quantity += Number.isInteger(item.quantity) ? item.quantity : 0; }
    }
    if (quantity > 10) errors.push({ field: 'items', message: 'Maximum 10 tickets per booking.' });
  }
  if (errors.length) invalid(errors);
  return { eventId: raw.eventId, customer, payment: raw.payment, items: items.map(x => ({ id: x.id, quantity: x.quantity })) };
}
