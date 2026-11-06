import { allEvents, categories } from "./data.js";
import { card, heading, icon, esc } from "./components.js";
import { filterEvents } from "./filters.js";
import { list, KEYS } from "./storage.js";
export function discover() {
  return `<section class="container page-intro"><span class="eyebrow">FIND YOUR NEXT “YOU HAD TO BE THERE.”</span><div class="page-title-row"><h1>Go where you<br><em>feel something.</em></h1><p>A new sound. A new face. A new favorite place.<br>There’s something here with your name on it.</p></div></section><section class="container discover-section"><form id="filters"><div class="discovery-search">${icon("search")}<input id="search" name="q" type="search" placeholder="Search events, artists, venues…" aria-label="Search events"><button type="button" id="filter-toggle" class="btn btn-outline" aria-expanded="false" aria-controls="advanced-filters">Filters ${icon("plus")}</button></div><div class="filter-categories" role="group" aria-label="Event category"><button type="button" data-category="" aria-pressed="true" class="chip active">All experiences</button>${categories.map((c) => `<button type="button" class="chip" data-category="${c}" aria-pressed="false">${c}</button>`).join("")}</div><div id="advanced-filters" class="advanced-filters"><label>City<select name="city"><option value="">All cities</option>${[...new Set(allEvents().map((e) => e.city))].map((c) => `<option>${esc(c)}</option>`).join("")}</select></label><label>When<select name="date"><option value="">Any date</option><option value="week">Next 7 days</option><option value="month">Next 30 days</option></select></label><label>Admission<select name="price"><option value="">Free & paid</option><option value="free">Free entry</option><option value="paid">Paid events</option></select></label><label>Maximum price<select name="max"><option value="">Any price</option><option value="1000">PKR 1,000</option><option value="3000">PKR 3,000</option><option value="5000">PKR 5,000</option></select></label><label class="saved-filter"><input name="saved" type="checkbox"> Saved only</label></div><div class="results-toolbar"><p id="result-count" role="status" aria-atomic="true"></p><div><button type="button" id="clear-filters" class="text-link">Clear filters</button><label class="sort-label">Sort by <select name="sort" aria-label="Sort events"><option value="date">Date: soonest</option><option value="popular">Popularity</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label></div></div></form><h2 id="discovery-results-heading" class="sr-only">Upcoming experiences</h2><div id="discovery-grid" class="event-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12" aria-labelledby="discovery-results-heading"></div></section>`;
}
export function initDiscover() {
  const form = document.getElementById("filters");
  const initiallyOpen = matchMedia("(min-width: 601px)").matches;
  document
    .getElementById("filter-toggle")
    .setAttribute("aria-expanded", String(initiallyOpen));
  document
    .getElementById("advanced-filters")
    .classList.toggle("filters-open", initiallyOpen);
  const params = new URLSearchParams(location.search);
  let category = params.get("category") || "";
  for (const name of ["q", "city", "date", "price", "max", "sort"])
    if (params.has(name)) form.elements[name].value = params.get(name);
  form.elements.saved.checked = params.get("saved") === "1";
  function update() {
    const focusedFavorite = document.activeElement?.dataset.favorite;
    const filters = Object.fromEntries(new FormData(form));
    filters.category = category;
    filters.saved = form.elements.saved.checked;
    const matches = filterEvents(allEvents(), filters, list(KEYS.favorites));
    document.getElementById("result-count").textContent =
      `${matches.length} experience${matches.length === 1 ? "" : "s"} to look forward to`;
    document.getElementById("discovery-grid").innerHTML = matches.length
      ? matches.map((e) => card(e)).join("")
      : `<div class="empty-state col-span-full"><div class="empty-icon">${icon("search")}</div><h2>Nothing here. Yet.</h2><p>Try another city, a broader search, or clear your filters.</p><button class="btn btn-dark" id="empty-clear">Clear filters ${icon("arrow")}</button></div>`;
    form.querySelectorAll("[data-category]").forEach((b) => {
      const active = b.dataset.category === category;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", active);
    });
    document.getElementById("empty-clear")?.addEventListener("click", clear);
    const url = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== "date") url.set(k, v === true ? "1" : v);
    });
    history.replaceState(
      null,
      "",
      `${location.pathname}${url.size ? "?" + url : ""}`,
    );
    // Refreshing favorites must not drop a keyboard user's focus into the body.
    if (focusedFavorite) {
      const replacement = [
        ...document.querySelectorAll("[data-favorite]"),
      ].find((button) => button.dataset.favorite === focusedFavorite);
      (replacement || form.elements.saved).focus({ preventScroll: true });
    }
  }
  function clear() {
    form.reset();
    category = "";
    update();
  }
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("input", update);
  form.addEventListener("click", (e) => {
    const b = e.target.closest("[data-category]");
    if (b) {
      category = b.dataset.category;
      update();
    }
  });
  document.getElementById("clear-filters").addEventListener("click", clear);
  document.getElementById("filter-toggle").addEventListener("click", (e) => {
    const b = e.currentTarget;
    const open = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", open);
    document
      .getElementById("advanced-filters")
      .classList.toggle("filters-open", open);
  });
  window.addEventListener("favoriteschanged", update);
  update();
}
