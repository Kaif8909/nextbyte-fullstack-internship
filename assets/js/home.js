import { events, categories, money, shortDate } from "./data.js";
import { card, heading, icon } from "./components.js";
export function home() {
  const categoryIcons = [
    "music",
    "ticket",
    "sun",
    "code",
    "users",
    "sun",
    "food",
    "art",
    "spark",
    "music",
  ];
  return `
<section class="hero container"><div class="hero-copy"><div class="eyebrow hero-eyebrow"><span class="live-dot"></span> GOOD PEOPLE. GREAT PLACES. REAL MOMENTS.</div><div class="hero-title"><h1>Life happens<br>when you<br><span>show up.</span></h1><div class="hero-aside"><p>For the nights you’ll talk about.<br> The people you haven’t met.<br> The moments that stay.</p><a class="circle-link" href="events.html" aria-label="Discover events">${icon("arrow")}</a></div></div><div class="hero-bottom"><span>YOUR NEXT GREAT STORY STARTS HERE</span><a href="#featured">SCROLL TO EXPLORE ↓</a></div></div><div class="hero-photo"><img src="assets/images/hero.jpg" alt="A crowd sharing an unforgettable evening at an outdoor concert" fetchpriority="high" width="1800" height="1200"><div class="hero-photo-shade"></div><span class="hero-live"><span class="live-dot"></span> MADE FOR MOMENTS LIKE THIS</span><div class="hero-photo-caption"><div><span class="eyebrow">THE CITY IS CALLING</span><h2>Be there.<br>Feel everything.</h2></div><a href="event.html?id=after-hours" class="hero-photo-link" aria-label="Explore After Hours">${icon("arrow")}</a></div><div class="photo-index"><span id="slide-index" aria-live="polite" aria-atomic="true">01 / 03</span><div role="group" aria-label="Featured experiences"><button class="selected" data-slide="0" aria-label="Show live music experience" aria-pressed="true"></button><button data-slide="1" aria-label="Show festival experience" aria-pressed="false"></button><button data-slide="2" aria-label="Show jazz experience" aria-pressed="false"></button></div><span>LIVE A LITTLE MORE</span></div></div></section>
<section class="container search-section" aria-label="Find an experience"><form action="events.html" class="hero-search"><label class="search-query">${icon("search")}<span><span class="field-label">WHAT ARE YOU INTO?</span><input name="q" placeholder="Events, artists, or a little adventure…" aria-label="Search events or artists"></span></label><label class="search-city">${icon("pin")}<span><span class="field-label">IN YOUR NEIGHBORHOOD</span><select name="city" aria-label="Select location"><option value="">All cities</option><option>Karachi</option><option>Lahore</option><option>Islamabad</option></select></span></label><button class="btn btn-red" type="submit">Discover events ${icon("arrow")}</button></form><div class="search-foot"><span>GOOD PLANS, ZERO GUESSWORK.</span><div><span class="mini-avatars" aria-hidden="true"><b>A</b><b>M</b><b>S</b></span>For the curious. The spontaneous. The you.</div></div></section>
<section id="featured" class="container section-space">${heading("THE PLANS WORTH MAKING", "A little out of the ordinary.")}<div class="event-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${events
    .slice(0, 4)
    .map((e) => card(e))
    .join("")}</div></section>
<section class="category-section section-space"><div class="container">${heading("FOLLOW YOUR CURIOSITY", "Find your kind of thing.", "", "")}<div class="category-grid">${categories.map((c, i) => `<a href="events.html?category=${c}" class="category-tile reveal">${icon(categoryIcons[i])}<span>${c}</span>${icon("arrow", "category-arrow")}</a>`).join("")}</div></div></section>
<section class="container section-space">${heading("ON EVERYONE’S RADAR", "Good energy. Great company.", "events.html?sort=popular", "See what’s trending")}<div class="event-grid grid grid-cols-1 md:grid-cols-3 gap-7">${[events[5], events[6], events[11]].map((e, i) => card(e, i + 1)).join("")}</div></section>
<section id="collections" class="edit-section"><div class="container"><div class="edit-intro"><div><span class="eyebrow">THE CRESCENT EDIT / VOL. 01</span><h2>Less ordinary.<br>More <em>unforgettable.</em></h2></div><p>A few things we think you’ll love.<br>Thoughtfully picked. Entirely worth it.</p></div><div class="edit-grid"><a href="events.html?category=Music" class="editorial-card reveal"><img loading="lazy" src="assets/images/acoustic.jpg" alt="An acoustic guitar ready for an intimate live set"><div><span class="eyebrow">01 / SOUND GOOD?</span><h3>Small rooms.<br>Big feelings.</h3><span class="text-link">Find your next live session ${icon("arrow")}</span></div></a><a href="events.html?category=Food" class="editorial-card reveal"><img loading="lazy" src="assets/images/rooftop.jpg" alt="A warmly lit restaurant made for long conversations"><div><span class="eyebrow">02 / PULL UP A CHAIR</span><h3>Good food.<br>Better stories.</h3><span class="text-link">Take a seat at the table ${icon("arrow")}</span></div></a></div></div></section>
<section class="container section-space">${heading("MAKE ROOM IN YOUR CALENDAR", "This week looks good.", "events.html?date=week", "See this week")}<div class="week-list">${events
    .slice(0, 3)
    .map(
      (e) =>
        `<a class="week-row reveal" href="event.html?id=${e.id}"><span class="week-date">${shortDate(e.date).replace(" ", "<small>")}</small></span><img src="${e.image}" alt="" loading="lazy"><div><span class="eyebrow">${e.category} / ${e.city}</span><h3>${e.title}</h3><p>${e.venue}</p></div><span class="week-price">From ${money(Math.round(e.price * 0.8))}</span><span class="circle-link">${icon("arrow")}</span></a>`,
    )
    .join("")}</div></section>
<section class="container organizer-banner"><div class="banner-art" aria-hidden="true"><span>MAKE<br>ROOM.</span><svg viewBox="0 0 180 180"><path d="M145 12C75-9 10 36 10 94s57 97 119 72C64 170 31 106 63 54c17-28 47-43 82-42Z" fill="currentColor"/></svg></div><div class="banner-copy"><span class="eyebrow">FOR THE ONES WHO BRING PEOPLE TOGETHER</span><h2>You bring the idea.<br>We’ll bring the people.</h2><p>Big nights or small gatherings. Give your event a home on CRESCENT and make something happen.</p><a class="btn btn-dark" href="organizer.html">Host an event ${icon("arrow")}</a></div></section>
<section class="newsletter container"><div><span class="eyebrow">A LITTLE SOMETHING TO LOOK FORWARD TO</span><h2>Good plans. In your inbox.</h2><p>A handpicked edit of what’s happening. No noise, just the good stuff.</p></div><form id="newsletter-form"><label class="sr-only" for="newsletter-email">Email address</label><div class="newsletter-input"><input id="newsletter-email" type="email" required placeholder="Your email address" maxlength="150"><button type="submit" aria-label="Subscribe to newsletter">${icon("arrow")}</button></div><p id="newsletter-status">Demo subscription · stored only in this browser.</p></form></section>`;
}

export function initHome() {
  const slides = [
    {
      image: "hero",
      title: "Be there.<br>Feel everything.",
      link: "after-hours",
      label: "THE CITY IS CALLING",
      alt: "An audience sharing a live concert beneath a shower of confetti",
    },
    {
      image: "festival",
      title: "One day.<br>All the good energy.",
      link: "soundscape",
      label: "FIND YOUR FREQUENCY",
      alt: "A festival crowd surrounded by colorful stage lights",
    },
    {
      image: "jazz",
      title: "A small room.<br>A big feeling.",
      link: "jazz-garden",
      label: "SOMETHING TO LISTEN FOR",
      alt: "A musician playing a brass instrument in warm light",
    },
  ];
  document.querySelectorAll("[data-slide]").forEach((button) =>
    button.addEventListener("click", () => {
      const i = Number(button.dataset.slide),
        slide = slides[i];
      const img = document.querySelector(".hero-photo>img");
      img.src = `assets/images/${slide.image}.jpg`;
      img.alt = slide.alt;
      document.querySelector(".hero-photo-caption h2").innerHTML = slide.title;
      document.querySelector(".hero-photo-caption .eyebrow").textContent =
        slide.label;
      const link = document.querySelector(".hero-photo-link");
      link.href = `event.html?id=${slide.link}`;
      link.setAttribute(
        "aria-label",
        `Explore ${slide.link.replaceAll("-", " ")}`,
      );
      document.getElementById("slide-index").textContent = `0${i + 1} / 03`;
      document.querySelectorAll("[data-slide]").forEach((b) => {
        b.classList.toggle("selected", b === button);
        b.setAttribute("aria-pressed", b === button);
      });
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        img.animate(
          [
            { opacity: 0.4, transform: "scale(1.025)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 450, easing: "ease-out" },
        );
    }),
  );
}
