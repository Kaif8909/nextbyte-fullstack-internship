import { shell, toast, icon } from "./components.js";
import { getEvent } from "./data.js";
import { home, initHome } from "./home.js";
import { discover, initDiscover } from "./events.js";
import {
  eventDetail,
  initDetail,
  ticketSelection,
  initSelection,
  checkout,
  initCheckout,
  confirmation,
  myTickets,
  initMyTickets,
  renderQR,
} from "./booking.js";
import { organizer, initOrganizer } from "./organizer.js";
import { KEYS, list, save, toggleFavorite } from "./storage.js";
import { animate } from "./animations.js";
import { initFormValidation } from "./forms.js";
const page = document.body.dataset.page;
const event = getEvent(new URLSearchParams(location.search).get("id"));
shell(page);
window.CrescentTheme?.init();
const render = {
  home,
  events: discover,
  event: () => eventDetail(event),
  tickets: () => ticketSelection(event),
  checkout,
  confirmation,
  "my-tickets": myTickets,
  organizer,
};
try {
  document.getElementById("main").innerHTML = (render[page] || home)();
  document
    .querySelectorAll("#checkout-form, #organizer-form")
    .forEach(initFormValidation);
  const init = {
    home: initHome,
    events: initDiscover,
    event: () => initDetail(event),
    tickets: () => initSelection(event),
    checkout: initCheckout,
    "my-tickets": initMyTickets,
    organizer: initOrganizer,
  };
  init[page]?.();
  renderQR();
} catch (err) {
  console.error(err);
  document.getElementById("main").innerHTML =
    '<section class="container empty-state"><h1>Let’s try that again.</h1><p>The page could not load. Your browser may have restricted local storage.</p><a class="btn btn-dark" href="events.html">Back to Discover</a></section>';
}
document
  .getElementById("main")
  .insertAdjacentHTML(
    "afterbegin",
    `<div class="container page-back-bar"><a id="page-back" class="page-back-button" href="index.html" aria-label="Go back to the previous page">${icon("right", "back-arrow")}<span>Back</span></a></div>`,
  );
document.getElementById("page-back").addEventListener("click", (event) => {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  // A fresh tab can count its initial blank page in history. The Navigation API
  // excludes that entry; referrer is the conservative fallback in older browsers.
  const canGoBack = window.navigation
    ? window.navigation.canGoBack
    : window.history.length > 1 && Boolean(document.referrer);
  if (canGoBack) {
    event.preventDefault();
    window.history.back();
  }
});

const menu = document.getElementById("menu-toggle");
function closeMenu(restoreFocus = false) {
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-label", "Open menu");
  menu.innerHTML = icon("menu");
  document.getElementById("main-nav").classList.remove("open");
  if (restoreFocus) menu.focus();
}
menu.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  menu.innerHTML = icon(open ? "close" : "menu");
  document.getElementById("main-nav").classList.toggle("open", open);
  if (open) document.querySelector("#main-nav a")?.focus();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menu.getAttribute("aria-expanded") === "true")
    closeMenu(true);
});
matchMedia("(max-width: 1100px)").addEventListener("change", () => closeMenu());
document.addEventListener("click", (ev) => {
  // The menu icon is replaced on toggle. Use the original event path so a
  // detached SVG target does not make the opening click look like an outside click.
  if (!ev.composedPath().includes(document.querySelector(".site-nav")))
    closeMenu();
  if (ev.target.closest("#main-nav a")) closeMenu();
  const b = ev.target.closest("[data-favorite]");
  if (!b) return;
  try {
    const saved = toggleFavorite(b.dataset.favorite);
    b.classList.toggle("is-saved", saved);
    b.setAttribute("aria-pressed", String(saved));
    b.setAttribute(
      "aria-label",
      b
        .getAttribute("aria-label")
        .replace(/^(Save|Unsave)/, saved ? "Unsave" : "Save"),
    );
    toast(
      saved
        ? "Saved for later. Good plans can wait."
        : "Removed from your saved experiences.",
    );
    window.dispatchEvent(new Event("favoriteschanged"));
  } catch (err) {
    toast(err.message);
  }
});
document.getElementById("newsletter-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("newsletter-email");
  const email = input.value.trim().toLowerCase();
  const emails = list(KEYS.newsletter);
  const status = document.getElementById("newsletter-status");
  if (emails.includes(email)) {
    status.textContent = "You’re already on the demo list. Good things await.";
    return;
  }
  if (save(KEYS.newsletter, [...emails, email])) {
    status.textContent = "You’re on the demo list. No emails are sent.";
    input.value = "";
    toast("A little something to look forward to. You’re on the demo list.");
  } else
    status.textContent = "Could not save. Your browser storage may be full.";
});
document.querySelectorAll("img").forEach((img) =>
  img.addEventListener("error", () => {
    if (!img.dataset.fallback) {
      img.dataset.fallback = "1";
      img.src = "assets/images/hero.jpg";
    }
  }),
);
animate();
