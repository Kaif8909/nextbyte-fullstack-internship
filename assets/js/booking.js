import {
  getEvent,
  events,
  ticketTypes,
  remaining,
  money,
  dateLabel,
} from "./data.js";
import { esc, icon, card, eventMini, empty, toast } from "./components.js";
import { KEYS, read, save, list } from "./storage.js";
export function calculate(items) {
  const subtotal = items.reduce((s, t) => s + t.price * t.quantity, 0);
  const fee = Math.round(subtotal * 0.05);
  return {
    subtotal,
    fee,
    total: subtotal + fee,
    quantity: items.reduce((s, t) => s + t.quantity, 0),
  };
}
export function validateCart(cart) {
  if (!cart || !Array.isArray(cart.items) || !cart.items.length)
    return { error: "Choose at least one ticket to continue." };
  const event = getEvent(cart.eventId);
  if (!event) return { error: "This experience is no longer available." };
  if (new Date(event.date) <= new Date())
    return { error: "This event has already ended." };
  const seen = new Set();
  const items = [];
  for (const item of cart.items) {
    if (!item || typeof item !== "object")
      return {
        error:
          "Your ticket selection could not be read. Choose your tickets again.",
      };
    const type = ticketTypes(event).find((t) => t.id === item.id);
    if (
      !type ||
      seen.has(item.id) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 10 ||
      item.quantity > remaining(event, type)
    )
      return {
        error:
          "Some tickets are no longer available. Please update your selection.",
      };
    seen.add(item.id);
    items.push({ ...type, quantity: item.quantity });
  }
  if (calculate(items).quantity > 10)
    return { error: "You can select up to 10 tickets per booking." };
  return { event, items, ...calculate(items) };
}
export function eventDetail(e) {
  if (!e)
    return empty(
      "This one got away.",
      "We couldn’t find that event. There are plenty more good plans waiting.",
    );
  return `<section class="container detail-page"><a class="back-link" href="events.html">← All experiences</a><div class="detail-cover"><img src="${esc(e.image)}" alt="${esc(e.title)}" fetchpriority="high"><span class="image-label">${esc(e.category)} / ${esc(e.city)}</span><button class="share-button btn" id="share-event">${icon("share")} Share event</button></div><div class="detail-layout"><div><div class="eyebrow red-text">GOOD PLANS START HERE</div><h1 class="detail-title">${esc(e.title)}</h1><div class="detail-meta"><span>${icon("calendar")} ${esc(dateLabel(e.date))}</span><span>${icon("clock")} 7:00 PM · ${esc(e.duration || "3 hours")}</span><span>${icon("pin")} ${esc(e.venue)}, ${esc(e.city)}</span></div><div class="organizer-line"><span class="organizer-avatar">${esc(e.organizer?.slice(0, 1) || "C")}</span><div><small>CURATED & HOSTED BY</small><strong>${esc(e.organizer || "Independent host")}</strong></div>${icon("check")}</div><section class="detail-section"><h2>A moment worth making.</h2><p>${esc(e.description)}</p><p>Come as you are, bring someone along, or meet someone new. This is your invitation to step out of the everyday and be part of something good.</p></section><section class="detail-section"><h2>What makes it special</h2><ul class="highlight-list">${(e.highlights || ["Meet your local community", "An independently hosted experience", "Make a memory worth keeping"]).map((t) => `<li>${icon("spark")} ${esc(t)}</li>`).join("")}</ul></section><section class="detail-section"><h2>The evening, at a glance.</h2><div class="schedule">${(
    e.schedule || [
      ["18:30", "Doors open"],
      ["19:00", "Experience begins"],
      ["21:30", "Wrap up & connect"],
    ]
  )
    .map((t) => `<div><time>${esc(t[0])}</time><span>${esc(t[1])}</span></div>`)
    .join(
      "",
    )}</div></section><section class="detail-section"><h2>Good to know</h2><p>Tickets are for a simulated experience. Arrive 30 minutes before the start. Your demo booking is saved in this browser; no real payment or event admission is included.</p></section></div><aside class="booking-panel"><span class="eyebrow">YOUR PLACE IN THE MOMENT</span><div class="from-price"><small>Tickets from</small><strong>${money(Math.round(e.price * 0.8))}</strong></div><p class="availability"><span class="live-dot"></span> ${ticketTypes(e).reduce((n, t) => n + remaining(e, t), 0)} demo tickets available</p><div class="ticket-options-preview">${ticketTypes(
    e,
  )
    .map(
      (t) =>
        `<div><span>${t.name}<small>${remaining(e, t)} available</small></span><strong>${money(t.price)}</strong></div>`,
    )
    .join(
      "",
    )}</div><label class="field-label" for="detail-quantity">HOW MANY ARE COMING?</label><select class="detail-quantity" id="detail-quantity" aria-label="Initial ticket quantity">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option value="${n}">${n} ticket${n > 1 ? "s" : ""}</option>`).join("")}</select><p class="detail-estimate" id="detail-estimate" aria-live="polite"></p><button id="book-event" class="btn btn-red w-full">Book tickets ${icon("arrow")}</button><p class="fine-print">${icon("shield")} Secure demo checkout · 5% service fee</p></aside></div><section class="section-space"><div class="section-heading"><div><span class="eyebrow">KEEP THE GOOD PLANS COMING</span><h2>You might also love.</h2></div><a class="text-link" href="events.html">Explore more ${icon("arrow")}</a></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">${events
    .filter((x) => x.id !== e.id)
    .slice(0, 3)
    .map((x) => card(x))
    .join("")}</div></section></section>`;
}
export function initDetail(e) {
  if (!e) return;
  const quantity = document.getElementById("detail-quantity");
  const estimate = () => {
    const total = calculate([
      { price: Math.round(e.price * 0.8), quantity: Number(quantity.value) },
    ]);
    document.getElementById("detail-estimate").textContent =
      `From ${money(total.total)} including service fee`;
  };
  quantity.addEventListener("change", estimate);
  estimate();
  document
    .getElementById("book-event")
    .addEventListener(
      "click",
      () =>
        (location.href = `tickets.html?id=${encodeURIComponent(e.id)}&qty=${quantity.value}`),
    );
  document.getElementById("share-event").addEventListener("click", async () => {
    try {
      if (navigator.share)
        await navigator.share({ title: e.title, url: location.href });
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(location.href);
        toast("Event link copied. Make it a shared plan.");
      } else toast("Copy the event link from your address bar to share.");
    } catch (err) {
      if (err.name !== "AbortError")
        toast("Copy the event link from your address bar to share.");
    }
  });
}
export function steps(active) {
  return `<nav class="booking-steps" aria-label="Booking progress">${["Your tickets", "Your details", "You’re going"].map((s, i) => `<span class="${i <= active ? "active" : ""}" ${i === active ? 'aria-current="step"' : ""}><b>${i + 1}</b> ${s}</span>${i < 2 ? "<i></i>" : ""}`).join("")}</nav>`;
}
export function ticketSelection(e) {
  if (!e)
    return empty(
      "Let’s find your experience.",
      "Choose an event before selecting tickets.",
    );
  return `<section class="container booking-page">${steps(0)}<a class="back-link" href="event.html?id=${e.id}">← Back to the experience</a><div class="section-heading"><div><span class="eyebrow">THE START OF A GOOD PLAN</span><h1>Make it a date.</h1><p>Pick your tickets. We’ll take care of the rest.</p></div></div><div class="checkout-layout"><div class="ticket-types">${ticketTypes(
    e,
  )
    .map(
      (t) =>
        `<article class="ticket-type" data-type="${t.id}"><div><span class="eyebrow">${t.id === "early" ? "A LITTLE THANK YOU FOR PLANNING AHEAD" : t.id === "vip" ? "MAKE THE NIGHT EXTRA SPECIAL" : "THE CLASSIC WAY TO SHOW UP"}</span><h2>${t.name}</h2><p>${t.description}</p><small>${remaining(e, t)} available · up to 10 per order</small></div><div class="ticket-type-bottom"><strong>${money(t.price)} <small>/ person</small></strong><div class="quantity-control"><button data-delta="-1" data-ticket="${t.id}" aria-label="Remove ${t.name} ticket">${icon("minus")}</button><output id="qty-${t.id}" aria-label="${t.name} quantity" aria-live="polite">0</output><button data-delta="1" data-ticket="${t.id}" aria-label="Add ${t.name} ticket">${icon("plus")}</button></div></div></article>`,
    )
    .join(
      "",
    )}<p class="fine-print">${icon("shield")} This is a frontend demo. Tickets are not valid for admission.</p></div><aside class="order-summary"><span class="eyebrow">YOUR NEXT GOOD MEMORY</span>${eventMini(e)}<div id="selection-summary"></div><p id="ticket-error" class="form-error" role="alert"></p><button id="continue-checkout" class="btn btn-red w-full">Continue to checkout ${icon("arrow")}</button><p class="fine-print">Demo payment. Real good design.</p></aside></div></section>`;
}
export function summaryMarkup(items) {
  const t = calculate(items);
  return `<div class="summary-lines">${items.length ? items.map((i) => `<div><span>${i.quantity} × ${esc(i.name)}</span><strong>${money(i.price * i.quantity)}</strong></div>`).join("") : "<p>Your next great plan starts with a ticket.</p>"}<div><span>Subtotal</span><span>${money(t.subtotal)}</span></div><div><span>Service fee (5%)</span><span>${money(t.fee)}</span></div></div><div class="summary-total"><span>Total <small>PKR</small></span><strong>${money(t.total)}</strong></div>`;
}
export function initSelection(e) {
  if (!e) return;
  const types = ticketTypes(e),
    quantities = { early: 0, general: 0, vip: 0 };
  let initial = Number(new URLSearchParams(location.search).get("qty") || 1);
  if (!Number.isInteger(initial) || initial < 1 || initial > 10) initial = 1;
  const first = types.find((t) => remaining(e, t) > 0);
  if (first) quantities[first.id] = Math.min(initial, remaining(e, first));
  const selected = () =>
    types
      .filter((t) => quantities[t.id] > 0)
      .map((t) => ({ ...t, quantity: quantities[t.id] }));
  function update() {
    types.forEach((t) => {
      const output = document.getElementById(`qty-${t.id}`);
      if (output.textContent !== String(quantities[t.id])) {
        output.textContent = quantities[t.id];
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          output.animate(
            [
              { opacity: 0.4, transform: "translateY(-3px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 160, easing: "ease-out" },
          );
        }
      }
      document
        .querySelector(`[data-type="${t.id}"]`)
        .classList.toggle("selected", quantities[t.id] > 0);
      document.querySelector(
        `[data-ticket="${t.id}"][data-delta="-1"]`,
      ).disabled = quantities[t.id] === 0;
      document.querySelector(
        `[data-ticket="${t.id}"][data-delta="1"]`,
      ).disabled =
        quantities[t.id] >= remaining(e, t) ||
        calculate(selected()).quantity >= 10;
    });
    document.getElementById("selection-summary").innerHTML =
      summaryMarkup(selected());
    document.getElementById("continue-checkout").disabled =
      selected().length === 0;
  }
  document.querySelector(".ticket-types").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-ticket]");
    if (!b) return;
    const id = b.dataset.ticket;
    const next = quantities[id] + Number(b.dataset.delta);
    if (
      next < 0 ||
      next >
        remaining(
          e,
          types.find((t) => t.id === id),
        )
    )
      return;
    quantities[id] = next;
    document.getElementById("ticket-error").textContent = "";
    update();
  });
  document.getElementById("continue-checkout").addEventListener("click", () => {
    const cart = {
      eventId: e.id,
      items: selected().map(({ id, quantity }) => ({ id, quantity })),
    };
    const validated = validateCart(cart);
    if (validated.error) {
      document.getElementById("ticket-error").textContent = validated.error;
      return;
    }
    if (!save(KEYS.cart, cart)) {
      document.getElementById("ticket-error").textContent =
        "Browser storage is unavailable. Enable local storage to continue.";
      return;
    }
    location.href = "checkout.html";
  });
  update();
}
export function checkout() {
  const v = validateCart(read(KEYS.cart, null));
  if (v.error) return empty("Your plans need a ticket.", v.error);
  return `<section class="container booking-page">${steps(1)}<a class="back-link" href="tickets.html?id=${v.event.id}">← Back to tickets</a><div class="section-heading"><div><span class="eyebrow">JUST A FEW DETAILS</span><h1>Almost a memory.</h1><p>Tell us who’s coming. Your demo tickets are one step away.</p></div></div><div class="checkout-layout"><form id="checkout-form" class="checkout-form" aria-labelledby="checkout-form-heading"><h2 id="checkout-form-heading">Your details</h2><p>All fields are required. Your details stay in this browser.</p><label for="customer-name">Full name<input id="customer-name" name="name" autocomplete="name" placeholder="Your full name" minlength="2" maxlength="100" required></label><label for="customer-email">Email address<input id="customer-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="150" required></label><label for="customer-phone">Phone number<input id="customer-phone" name="phone" type="tel" autocomplete="tel" placeholder="+92 300 1234567" maxlength="25" required></label><fieldset><legend>Choose a demo payment method</legend><label class="payment-option"><input type="radio" name="payment" value="demo-card" checked> ${icon("shield")} Simulated card payment <span>DEMO</span></label><label class="payment-option"><input type="radio" name="payment" value="demo-wallet"> ${icon("ticket")} Simulated mobile wallet <span>DEMO</span></label></fieldset><div class="demo-note">${icon("shield")}<div><strong>All the excitement. None of the charge.</strong><p>This checkout simulates a successful payment. Do not enter real card or financial details. No payment information is requested or saved.</p></div></div><label class="checkbox-label"><input type="checkbox" name="consent" required> I understand this is a demo booking and tickets are not valid for event admission.</label><p id="checkout-error" class="form-error" role="alert"></p><button type="submit" class="btn btn-red w-full" id="confirm-booking">Confirm demo booking ${icon("arrow")}</button></form><aside class="order-summary"><span class="eyebrow">LOOKING FORWARD TO THIS?</span>${eventMini(v.event)}${summaryMarkup(v.items)}<p class="fine-print">${icon("shield")} No real payment will be processed.</p></aside></div></section>`;
}
export function initCheckout() {
  const form = document.getElementById("checkout-form");
  if (!form) return;
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const error = document.getElementById("checkout-error");
    const v = validateCart(read(KEYS.cart, null));
    if (v.error) {
      error.textContent = v.error;
      return;
    }
    const f = new FormData(form);
    const name = f.get("name").trim(),
      email = f.get("email").trim(),
      phone = f.get("phone").trim();
    if (
      name.length < 2 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      phone.replace(/\D/g, "").length < 7
    ) {
      error.textContent =
        "Please add your name, a valid email address, and a phone number with at least 7 digits.";
      return;
    }
    const b = document.getElementById("confirm-booking");
    b.disabled = true;
    b.textContent = "Making your plans…";
    let id;
    do {
      id = "CR-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    } while (list(KEYS.bookings).some((booking) => booking.id === id));
    const booking = {
      id,
      eventId: v.event.id,
      event: { ...v.event },
      items: v.items.map(({ id, name, price, quantity }) => ({
        id,
        name,
        price,
        quantity,
      })),
      subtotal: v.subtotal,
      fee: v.fee,
      total: v.total,
      customer: { name, email, phone },
      payment: f.get("payment"),
      createdAt: new Date().toISOString(),
    };
    if (!save(KEYS.bookings, [...list(KEYS.bookings), booking])) {
      error.textContent =
        "Your browser could not save this booking. Free some storage and try again.";
      b.disabled = false;
      b.textContent = "Confirm demo booking";
      return;
    }
    save(KEYS.cart, null);
    location.href = `confirmation.html?ref=${encodeURIComponent(id)}`;
  });
}
export function bookingFromUrl() {
  return list(KEYS.bookings).find(
    (b) => b.id === new URLSearchParams(location.search).get("ref"),
  );
}
export function ticketPreview(b) {
  const e = b.event || getEvent(b.eventId);
  return `<div class="admission-ticket"><div class="ticket-banner"><span>CRESCENT®</span><span>DEMO / NOT VALID FOR ENTRY</span></div><img class="ticket-cover" src="${esc(e.image)}" alt="${esc(e.title)}"><div class="ticket-body"><span class="eyebrow">A GOOD MOMENT IS ON THE CALENDAR</span><h2>${esc(e.title)}</h2><p>${esc(dateLabel(e.date))} · 7:00 PM</p><p>${esc(e.venue)}, ${esc(e.city)}</p><div class="ticket-perforation"></div><div class="ticket-stub"><div><span class="eyebrow">BOOKING REFERENCE</span><strong>${esc(b.id)}</strong><p>${b.items.map((t) => `${t.quantity} × ${esc(t.name)}`).join("<br>")}</p><small>${esc(b.customer.name)}</small></div><div class="qr-code" data-qr="${esc(b.id)}" role="img" aria-label="QR code for demo reference ${esc(b.id)}"></div></div><p class="ticket-demo">Demo ticket · not a valid entry pass</p></div></div>`;
}
export function confirmation() {
  const b = bookingFromUrl();
  if (!b)
    return empty(
      "No booking found.",
      "Complete a demo checkout or view your saved tickets.",
      "my-tickets.html",
      "View my tickets",
    );
  return `<section class="container confirmation-page"><div class="confirmation-copy"><div class="success-mark">${icon("check")}</div><span class="eyebrow">IT’S OFFICIALLY A PLAN</span><h1>You’re going.<br><em>Good things await.</em></h1><p>Your demo booking is confirmed. Here’s a little reminder of something to look forward to.</p><div class="confirmation-details"><div><span>BOOKING REFERENCE</span><strong>${esc(b.id)}</strong></div><div><span>BOOKED BY</span><strong>${esc(b.customer.name)}</strong><small>${esc(b.customer.email)}</small><small>${esc(b.customer.phone)}</small></div><div><span>DEMO TOTAL</span><strong>${money(b.total)}</strong></div></div><a class="btn btn-red" href="my-tickets.html">View my tickets ${icon("arrow")}</a><p class="fine-print">Saved in this browser. No email is sent. No charge was made.<br>This demo ticket is not valid for entry.</p></div><div class="confirmation-ticket">${ticketPreview(b)}</div></section>`;
}
export function myTickets() {
  return `<section class="container page-intro"><span class="eyebrow">YOUR PLANS, ALL IN ONE PLACE</span><div class="page-title-row"><h1>Something to<br><em>look forward to.</em></h1><p>Your saved demo bookings live here.<br>The best part? Showing up.</p></div></section><section class="container tickets-section"><div class="tabs" role="group" aria-label="Ticket status"><button class="active" data-booking-tab="upcoming" aria-pressed="true">Upcoming plans</button><button data-booking-tab="past" aria-pressed="false">Past memories</button></div><div id="bookings-list"></div></section><dialog id="ticket-dialog" aria-labelledby="ticket-dialog-title"><div class="dialog-header"><h2 id="ticket-dialog-title">Your demo ticket</h2><button class="icon-button" id="close-dialog" aria-label="Close ticket">${icon("close")}</button></div><div id="ticket-dialog-content"></div></dialog>`;
}
export function renderQR(root = document) {
  root.querySelectorAll("[data-qr]").forEach((el) => {
    if (typeof window.qrcode !== "function") {
      el.textContent = el.dataset.qr;
      return;
    }
    const qr = window.qrcode(0, "M");
    qr.addData(`CRESCENT DEMO - NOT VALID FOR ENTRY - ${el.dataset.qr}`);
    qr.make();
    el.innerHTML = qr.createSvgTag({ cellSize: 3, margin: 4, scalable: true });
  });
}
export function initMyTickets() {
  let active = "upcoming";
  const dialog = document.getElementById("ticket-dialog");
  function render() {
    const bookings = list(KEYS.bookings)
      .filter((b) => {
        const e = b.event || getEvent(b.eventId);
        return (
          e &&
          (active === "upcoming"
            ? new Date(e.date) >= new Date()
            : new Date(e.date) < new Date())
        );
      })
      .reverse();
    document.getElementById("bookings-list").innerHTML = bookings.length
      ? bookings
          .map((b) => {
            const e = b.event || getEvent(b.eventId);
            return `<article class="booking-card"><img src="${esc(e.image)}" alt="${esc(e.title)}"><div><span class="eyebrow">${esc(dateLabel(e.date))} · ${esc(e.city)}</span><h2>${esc(e.title)}</h2><p>${esc(e.venue)} · ${b.items.reduce((n, t) => n + t.quantity, 0)} ticket(s)</p><small>${esc(b.id)} · DEMO BOOKING</small></div><button class="btn btn-dark" data-view-ticket="${esc(b.id)}">View ticket ${icon("ticket")}</button></article>`;
          })
          .join("")
      : empty(
          active === "upcoming"
            ? "Your calendar is calling."
            : "The memories are still ahead.",
          active === "upcoming"
            ? "No tickets yet. Find an experience that feels like you."
            : "Completed demo events will appear here once their date has passed.",
        );
  }
  document.querySelectorAll("[data-booking-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      active = b.dataset.bookingTab;
      document.querySelectorAll("[data-booking-tab]").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-pressed", x === b);
      });
      render();
    }),
  );
  document.getElementById("bookings-list").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-view-ticket]");
    if (!btn) return;
    const b = list(KEYS.bookings).find((b) => b.id === btn.dataset.viewTicket);
    document.getElementById("ticket-dialog-content").innerHTML =
      ticketPreview(b);
    renderQR(dialog);
    dialog.showModal();
  });
  document
    .getElementById("close-dialog")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  render();
}
