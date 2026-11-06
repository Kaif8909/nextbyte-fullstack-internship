import { money, dateLabel, shortDate } from "./data.js";
import { list, KEYS } from "./storage.js";
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  arrow: "M7 17 17 7M7 7h10v10",
  right: "M4 12h16m-6-6 6 6-6 6",
  search: "m21 21-5-5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  ticket: "M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6V4Zm10 0v3m0 3v4m0 3v3",
  calendar:
    "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
  check: "m5 12 4 4L19 6",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "m6 6 12 12M6 18 18 6",
  share: "M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8",
  music:
    "M9 18V5l12-3v13M9 8l12-3M9 18a3 3 0 1 1-3-3c2 0 3 1 3 3Zm12-3a3 3 0 1 1-3-3c2 0 3 1 3 3",
  sun: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M13 3.1a4 4 0 0 1 0 7.8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z",
  food: "M4 3v7h6V3M7 3v19M20 3c-4 3-5 8 0 9v10V3",
  art: "M14 3c6 0 9 8 6 12-2 3-7-1-8 2s-1 5-5 4C-4 16 0 3 14 3Zm-7 5h.01M12 6h.01M17 9h.01M6 13h.01",
  code: "m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20",
  chevron: "m9 5 7 7-7 7",
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
  mail: "M3 5h18v14H3V5Zm0 0 9 8 9-8",
  shield: "m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Zm-4 10 3 3 5-6",
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.spark}"/></svg>`;
export const crescent = () =>
  `<svg class="crescent" viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M39 5C22-1 6 10 6 25s14 24 29 18C19 44 11 28 19 15c4-7 11-10 20-10Z"/></svg>`;
export function shell(page) {
  document.getElementById("site-header").innerHTML =
    `<a class="skip" href="#main">Skip to content</a><header class="site-nav"><div class="container nav-inner"><a href="index.html" class="brand" aria-label="Crescent home">${crescent()}<span>CRESCENT<span class="brand-dot">®</span></span></a><nav id="main-nav" aria-label="Main navigation"><a class="${page === "events" ? "active" : ""}" href="events.html">Discover events</a><a href="index.html#collections">The edit <span class="new-dot"></span></a><a class="${page === "organizer" ? "active" : ""}" href="organizer.html">For organizers ${icon("arrow")}</a><a class="mobile-tickets" href="my-tickets.html">My tickets</a></nav><div class="nav-actions"><label class="theme-control" for="theme-select">${icon("sun")}<span class="sr-only">Color theme</span><select id="theme-select" aria-label="Color theme"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label><a class="ticket-link" href="my-tickets.html">${icon("ticket")}<span>My tickets</span></a><button id="menu-toggle" class="icon-button menu-toggle" aria-label="Open menu" aria-controls="main-nav" aria-expanded="false">${icon("menu")}</button><a class="btn btn-dark nav-cta" href="events.html">Find your next ${icon("arrow")}</a></div></div></header>`;
  document.getElementById("site-footer").innerHTML =
    `<footer class="footer"><div class="container"><div class="footer-top"><div><a class="brand" href="index.html">${crescent()} CRESCENT®</a><p>Less scrolling. More living.<br>Find something worth showing up for.</p></div><div><span class="eyebrow">GO SOMEWHERE GOOD</span><a href="events.html">Discover events</a><a href="events.html?category=Music">Music & live shows</a><a href="events.html?category=Arts">Arts & culture</a></div><div><span class="eyebrow">MAKE IT HAPPEN</span><a href="organizer.html">Host an event</a><a href="my-tickets.html">My tickets</a><a href="events.html?saved=1">Saved experiences</a></div><div class="footer-note"><span class="live-dot"></span> MADE FOR THE MOMENT<p>An independent way to experience<br>Karachi, Lahore & Islamabad.</p></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} CRESCENT. Go make a memory.</span><span>Frontend demo · No real payments or entry passes.</span><a href="index.html#main">Back to top ↑</a></div></div></footer>`;
  document.querySelectorAll("#site-header a[href]").forEach((link) => {
    const target = new URL(link.href);
    if (
      target.pathname === location.pathname &&
      !target.hash &&
      !target.search
    ) {
      link.setAttribute("aria-current", "page");
    }
  });
}
export function card(e, rank) {
  const saved = list(KEYS.favorites).includes(e.id);
  return `<article class="event-card reveal"><div class="card-image"><a href="event.html?id=${encodeURIComponent(e.id)}" tabindex="-1" aria-hidden="true"><img src="${esc(e.image)}" alt="" loading="lazy" width="1000" height="670"></a><span class="image-label">${esc(e.category)}</span><button class="favorite ${saved ? "is-saved" : ""}" data-favorite="${esc(e.id)}" aria-label="${saved ? "Unsave" : "Save"} ${esc(e.title)}" aria-pressed="${saved}">${icon("heart")}</button>${rank ? `<span class="rank">0${rank}</span>` : ""}</div><div class="card-content"><div class="card-meta"><span>${esc(shortDate(e.date))} · 7:00 PM</span><span>${e.price === 0 ? "FREE ENTRY" : `FROM ${money(Math.round(e.price * 0.8))}`}</span></div><h3><a href="event.html?id=${encodeURIComponent(e.id)}">${esc(e.title)}</a></h3><p class="card-location">${icon("pin")} ${esc(e.venue)}, ${esc(e.city)}</p></div></article>`;
}
export function heading(
  kicker,
  title,
  link = "events.html",
  label = "Explore all events",
) {
  return `<div class="section-heading reveal"><div><span class="eyebrow">${kicker}</span><h2>${title}</h2></div>${link ? `<a href="${link}" class="text-link">${label} ${icon("arrow")}</a>` : ""}</div>`;
}
export function empty(
  title,
  description,
  link = "events.html",
  label = "Discover events",
) {
  return `<section class="empty-state"><div class="empty-icon">${icon("ticket")}</div><h2>${title}</h2><p>${description}</p><a class="btn btn-dark" href="${link}">${label} ${icon("arrow")}</a></section>`;
}
export function toast(message) {
  let n = document.getElementById("toast");
  n.textContent = message;
  n.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => n.classList.remove("show"), 3500);
}
export function eventMini(e) {
  return `<div class="summary-event"><img src="${esc(e.image)}" alt="${esc(e.category)} experience"><div><span class="eyebrow">${esc(e.category)}</span><h3>${esc(e.title)}</h3><p>${esc(dateLabel(e.date))} · ${esc(e.city)}</p></div></div>`;
}
