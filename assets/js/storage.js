export const KEYS = {
  bookings: "crescent.bookings.v1",
  favorites: "crescent.favorites.v1",
  events: "crescent.events.v1",
  cart: "crescent.cart.v1",
  newsletter: "crescent.newsletter.v1",
};
export function read(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}
export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function list(key) {
  const value = read(key);
  return Array.isArray(value) ? value : [];
}
export function toggleFavorite(id) {
  const ids = list(KEYS.favorites);
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  if (!save(KEYS.favorites, next))
    throw new Error(
      "Browser storage is full or unavailable. Please enable local storage.",
    );
  return next.includes(id);
}
