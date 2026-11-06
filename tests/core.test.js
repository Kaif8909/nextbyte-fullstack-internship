import test from "node:test";
import assert from "node:assert/strict";
import { calculate, validateCart } from "../assets/js/booking.js";
import { filterEvents } from "../assets/js/filters.js";
import { events, ticketTypes, remaining } from "../assets/js/data.js";
import { KEYS } from "../assets/js/storage.js";
const db = new Map();
globalThis.localStorage = {
  getItem: (k) => db.get(k) ?? null,
  setItem: (k, v) => db.set(k, v),
};
test("mixed tickets use a rounded 5% fee and correct total", () => {
  assert.deepEqual(
    calculate([
      { price: 3600, quantity: 2 },
      { price: 7875, quantity: 1 },
    ]),
    { subtotal: 15075, fee: 754, total: 15829, quantity: 3 },
  );
  assert.equal(calculate([{ price: 0, quantity: 2 }]).total, 0);
});
test("catalog has 22 distinct events across all ten categories", () => {
  assert.equal(events.length, 22);
  assert.equal(new Set(events.map((e) => e.id)).size, 22);
  assert.equal(new Set(events.map((e) => e.category)).size, 10);
});
test("combined search, location, category and free filters intersect", () => {
  assert.equal(
    filterEvents(events, {
      q: "Karachi",
      category: "Sports",
      price: "free",
      city: "Karachi",
    }).length,
    1,
  );
  assert.equal(filterEvents(events, { q: "no-such-event" }).length, 0);
  assert.equal(
    filterEvents(events, { saved: true }, ["after-hours"]).length,
    1,
  );
  const sorted = filterEvents(events, { sort: "price-asc" });
  assert.ok(sorted.every((e, i) => !i || sorted[i - 1].price <= e.price));
});
test("all ticket pools sum to event capacity, including tiny events", () => {
  for (const capacity of [1, 8, 20, 25, 35, 100])
    assert.equal(
      ticketTypes({ ...events[0], capacity }).reduce(
        (n, t) => n + t.capacity,
        0,
      ),
      capacity,
    );
});
test("cart ignores client prices and rejects invalid quantities and duplicates", () => {
  const event = {
    ...events[0],
    id: "test-event",
    date: "2099-11-20T19:00:00+05:00",
  };
  db.set(KEYS.events, JSON.stringify([event]));
  const cart = {
    eventId: event.id,
    items: [{ id: "early", quantity: 2, price: 1 }],
  };
  assert.equal(validateCart(cart).subtotal, 7200);
  for (const quantity of [-1, 0, 1.5, 11])
    assert.ok(
      validateCart({ ...cart, items: [{ id: "early", quantity }] }).error,
    );
  assert.ok(
    validateCart({
      ...cart,
      items: [
        { id: "early", quantity: 1 },
        { id: "early", quantity: 1 },
      ],
    }).error,
  );
  assert.ok(validateCart({ eventId: event.id, items: [] }).error);
  assert.ok(validateCart({ eventId: "unknown", items: cart.items }).error);
});
test("bookings reduce local availability and reject overbooking", () => {
  const event = {
    ...events[0],
    id: "inventory-test",
    capacity: 8,
    date: "2099-11-20T19:00:00+05:00",
  };
  db.set(KEYS.events, JSON.stringify([event]));
  db.set(
    KEYS.bookings,
    JSON.stringify([
      { eventId: event.id, items: [{ id: "early", quantity: 7 }] },
    ]),
  );
  assert.equal(remaining(event, ticketTypes(event)[0]), 1);
  assert.ok(
    validateCart({ eventId: event.id, items: [{ id: "early", quantity: 2 }] })
      .error,
  );
  assert.equal(
    validateCart({ eventId: event.id, items: [{ id: "early", quantity: 1 }] })
      .quantity,
    1,
  );
  db.clear();
});
test("expired events cannot be booked", () => {
  db.set(
    KEYS.events,
    JSON.stringify([
      { ...events[0], id: "past", date: "2020-01-01T19:00:00+05:00" },
    ]),
  );
  assert.ok(
    validateCart({ eventId: "past", items: [{ id: "early", quantity: 1 }] })
      .error,
  );
  db.clear();
});
