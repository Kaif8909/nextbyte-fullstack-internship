import { events, categories, getEvent } from "./data.js";
import {
  escapeHtml,
  formattedDate,
  formattedTime,
  eventArt,
  eventCard,
  mountShell,
  notFound,
} from "./components.js";

const STORAGE_KEY = "eventease_demo_registrations_v1";
const page = document.body.dataset.page;
mountShell();

function registrations() {
  try {
    let v = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function eventSeats(event) {
  return Math.max(
    0,
    event.capacity -
      event.registered -
      registrations().filter((reg) => reg.eventId === event.id).length,
  );
}
function safeEventFromUrl() {
  return getEvent(new URLSearchParams(location.search).get("id"));
}
function detailMeta(label, value) {
  return `<div class="detail-meta-item"><span class="meta-label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderHome() {
  const grid = document.getElementById("events-grid");
  const filters = document.getElementById("category-filters");
  const input = document.getElementById("event-search");
  const empty = document.getElementById("empty-state");
  let active = "All events";
  filters.innerHTML = categories
    .map(
      (cat) =>
        `<button type="button" class="filter-chip ${cat === active ? "active" : ""}" data-category="${escapeHtml(cat)}" aria-pressed="${cat === active}">${escapeHtml(cat)}</button>`,
    )
    .join("");
  function update() {
    const query = input.value.toLocaleLowerCase().trim();
    const matches = events.filter(
      (e) =>
        (active === "All events" || e.category === active) &&
        `${e.title} ${e.location} ${e.city} ${e.organizer}`
          .toLowerCase()
          .includes(query),
    );
    grid.innerHTML = matches.map(eventCard).join("");
    document.getElementById("event-count").textContent =
      `${matches.length} ${matches.length === 1 ? "event" : "events"}`;
    empty.classList.toggle("hidden", matches.length !== 0);
  }
  filters.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-category]");
    if (!btn) return;
    active = btn.dataset.category;
    for (const node of filters.querySelectorAll("button")) {
      const selected = node === btn;
      node.classList.toggle("active", selected);
      node.setAttribute("aria-pressed", String(selected));
    }
    update();
  });
  input.addEventListener("input", update);
  document.getElementById("reset-filters").addEventListener("click", () => {
    active = "All events";
    input.value = "";
    for (const btn of filters.querySelectorAll("button")) {
      const selected = btn.dataset.category === active;
      btn.classList.toggle("active", selected);
      btn.setAttribute("aria-pressed", String(selected));
    }
    update();
  });
  update();
  const banner = document.querySelector(".banner");
  const how = document.createElement("section");
  how.className = "how-section container";
  how.id = "how-it-works";
  how.innerHTML = `<div class="how-header"><div><span class="section-kicker">NO COMPLICATIONS</span><h2>Three steps to your next experience<span class="section-period">.</span></h2></div><p>Good plans should be easy to make.</p></div><div class="how-grid"><div class="how-step"><span>01</span><div class="how-icon">⌕</div><h3>Explore</h3><p>Browse workshops and meetups that spark your interest.</p></div><div class="how-step"><span>02</span><div class="how-icon">☑</div><h3>Register</h3><p>Save your spot in seconds with a simple form.</p></div><div class="how-step"><span>03</span><div class="how-icon">✦</div><h3>Show up</h3><p>Get the details you need to make it a great day.</p></div></div>`;
  banner.before(how);
}
function renderDetails() {
  const root = document.getElementById("event-detail-root");
  const event = safeEventFromUrl();
  if (!event) {
    root.innerHTML = notFound();
    return;
  }
  document.title = `${event.title} | EventEase`;
  const seats = eventSeats(event);
  root.innerHTML = `<a class="back-link" href="index.html#explore">← Back to all events</a><div class="details-layout"><div><div class="details-art">${eventArt(event, true)}</div><div class="details-description"><span class="section-kicker">ABOUT THIS EVENT</span><h2>What to expect</h2><p>${escapeHtml(event.description)}</p><h3>On the agenda</h3><ul class="agenda-list">${event.agenda.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div><aside class="details-aside"><span class="event-category-label">${escapeHtml(event.category)} EVENT</span><h1>${escapeHtml(event.title)}</h1><p class="organizer-line">Hosted by ${escapeHtml(event.organizer)}</p><div class="detail-meta">${detailMeta("DATE", formattedDate(event.date))}${detailMeta("TIME", `${formattedTime(event.date)} PKT`)}${detailMeta("VENUE", event.location)}${detailMeta("DURATION", event.duration)}${detailMeta("TICKET", event.price)}${detailMeta("AVAILABLE", `${seats} of ${event.capacity} spots left`)}</div><a href="register.html?id=${event.id}" class="btn btn-lime full-width ${seats === 0 ? "disabled-link" : ""}" ${seats === 0 ? 'aria-disabled="true" tabindex="-1"' : ""}>${seats === 0 ? "Event full" : "Register for this event"} <span aria-hidden="true">↗</span></a><p class="demo-note">Demo only. No payment or real ticket is issued.</p></aside></div>`;
}
function renderRegistration() {
  const root = document.getElementById("registration-root");
  const event = safeEventFromUrl();
  if (!event) {
    root.innerHTML = notFound();
    return;
  }
  document.title = `Register: ${event.title} | EventEase`;
  const seats = eventSeats(event);
  const full = seats === 0;
  root.innerHTML = `<a class="back-link" href="event.html?id=${event.id}">← Back to event details</a><div class="registration-layout"><div class="form-card"><span class="section-kicker">SAVE YOUR SPOT</span><h1>You're one step away<span class="section-period">.</span></h1><p class="form-intro">Enter your details below to reserve a demo spot for this event.</p><form id="registration-form" novalidate><div class="form-group"><label for="full-name">Full name <span aria-hidden="true">*</span></label><input id="full-name" name="fullName" type="text" autocomplete="name" maxlength="80" minlength="2" placeholder="e.g. Ayesha Khan" required><small class="field-error" id="name-error"></small></div><div class="form-group"><label for="email">Email address <span aria-hidden="true">*</span></label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="e.g. ayesha@example.com" required><small class="field-error" id="email-error"></small></div><div class="privacy-note"><span>ⓘ</span> This is a local browser demo. Your details remain in this browser and are not sent to a server.</div><div id="form-error" class="form-error hidden" role="alert"></div><button class="btn btn-dark full-width" type="submit" ${full ? "disabled" : ""}>${full ? "Event is full" : "Confirm my spot"} <span aria-hidden="true">↗</span></button></form></div><aside class="summary-card"><div class="summary-head"><span class="section-kicker">YOUR EVENT</span><span class="summary-demo">DEMO</span></div>${eventArt(event)}<h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(event.location)}</p><div class="summary-rows"><div><span>When</span><strong>${escapeHtml(formattedDate(event.date))}</strong></div><div><span>Time</span><strong>${escapeHtml(formattedTime(event.date))} PKT</strong></div><div><span>Price</span><strong>${escapeHtml(event.price)}</strong></div><div><span>Availability</span><strong>${seats} spots left</strong></div></div></aside></div>`;
  const form = document.getElementById("registration-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("full-name");
    const email = document.getElementById("email");
    const formError = document.getElementById("form-error");
    const nameError = document.getElementById("name-error");
    const emailError = document.getElementById("email-error");
    const cleanName = name.value.trim().replace(/\s+/g, " ");
    const cleanEmail = email.value.trim().toLowerCase();
    nameError.textContent = "";
    emailError.textContent = "";
    formError.classList.add("hidden");
    name.setAttribute("aria-invalid", "false");
    email.setAttribute("aria-invalid", "false");
    let valid = true;
    if (cleanName.length < 2) {
      nameError.textContent =
        "Please enter your full name (at least 2 characters).";
      name.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      emailError.textContent = "Enter a valid email address.";
      email.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!valid) return;
    const saved = registrations();
    if (
      saved.some((reg) => reg.eventId === event.id && reg.email === cleanEmail)
    ) {
      formError.textContent =
        "This email is already registered for this demo event.";
      formError.classList.remove("hidden");
      return;
    }
    if (eventSeats(event) === 0) {
      formError.textContent = "Sorry, there are no spots left for this event.";
      formError.classList.remove("hidden");
      return;
    }
    // Demo only: replace localStorage with POST /api/events/:id/registrations when backend is available.
    const code = `EE-${Date.now().toString(36).toUpperCase()}`;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          ...saved,
          {
            code,
            eventId: event.id,
            fullName: cleanName,
            email: cleanEmail,
            createdAt: new Date().toISOString(),
          },
        ]),
      );
      sessionStorage.setItem("eventease_last_confirmation", code);
      location.href = "success.html";
    } catch {
      formError.textContent =
        "Browser storage is unavailable. Please enable local storage and try again.";
      formError.classList.remove("hidden");
    }
  });
}
function renderSuccess() {
  const root = document.getElementById("success-root");
  const code = sessionStorage.getItem("eventease_last_confirmation");
  const registration = registrations().find((reg) => reg.code === code);
  const event = registration && getEvent(registration.eventId);
  if (!registration || !event) {
    root.innerHTML = `<section class="not-found"><span class="not-found-icon">✳</span><h1>No recent registration to show</h1><p>Complete a demo registration first to see a confirmation here.</p><a class="btn btn-dark" href="index.html#explore">Explore events ↗</a></section>`;
    return;
  }
  root.innerHTML = `<section class="success-card"><div class="success-icon" aria-hidden="true">✓</div><span class="section-kicker">SPOT SAVED</span><h1>You're on the list<span class="section-period">.</span></h1><p>Your demo registration for <strong>${escapeHtml(event.title)}</strong> has been saved in this browser.</p><div class="confirmation-details"><div><span>NAME</span><strong>${escapeHtml(registration.fullName)}</strong></div><div><span>EVENT</span><strong>${escapeHtml(event.title)}</strong></div><div><span>DATE</span><strong>${escapeHtml(formattedDate(event.date))}</strong></div><div><span>REFERENCE</span><strong>${escapeHtml(registration.code)}</strong></div></div><p class="demo-note">This is not a real ticket. No email was sent, and no backend was contacted.</p><a class="btn btn-dark" href="index.html#explore">Explore more events ↗</a></section>`;
}
if (page === "home") renderHome();
if (page === "event") renderDetails();
if (page === "register") renderRegistration();
if (page === "success") renderSuccess();
