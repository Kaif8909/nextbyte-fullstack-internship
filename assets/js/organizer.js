import { categories } from "./data.js";
import { icon, toast } from "./components.js";
import { list, save, KEYS } from "./storage.js";
export function organizer() {
  return `<section class="container host-hero"><div><span class="eyebrow red-text">MAKE SOMETHING HAPPEN</span><h1>A great idea.<br>A room full<br>of <em>possibility.</em></h1><p>For the independent minds, the community builders, and the ones who always say “what if?” Your people are out there. Let’s bring them together.</p><a class="btn btn-red" href="#create-event">Create your event ${icon("arrow")}</a></div><div class="host-image"><img src="assets/images/business.jpg" alt="A thoughtfully prepared venue awaiting its guests"><span>YOUR IDEA. THEIR NEXT GREAT MEMORY.</span></div></section><section class="container host-benefits grid grid-cols-1 md:grid-cols-3 gap-10"><article>${icon("users")}<span class="eyebrow">01 / FIND YOUR PEOPLE</span><h2>The right crowd.</h2><p>Bring your experience to people who are looking for exactly what you do.</p></article><article>${icon("ticket")}<span class="eyebrow">02 / KEEP IT SIMPLE</span><h2>Less admin. More magic.</h2><p>Clear ticket options and an easy booking journey, from first click to the big day.</p></article><article>${icon("spark")}<span class="eyebrow">03 / MAKE IT YOURS</span><h2>Your event, beautifully.</h2><p>A beautiful home for your idea, whether it’s your first gathering or your fiftieth.</p></article></section><section id="create-event" class="container create-section"><div><span class="eyebrow">START SOMETHING GOOD</span><h2>Every great night<br>starts with an idea.</h2><p>Create a demo event and see it in Discover.<br>Saved locally. Ready to explore.</p><div class="demo-note">${icon("shield")}<p>Demo events stay in this browser. Publishing, attendee management, and real payments require a backend.</p></div></div><form id="organizer-form" class="organizer-form" aria-labelledby="event-form-heading"><h3 id="event-form-heading">Your event details</h3><p class="form-intro">All fields are required except the cover photo. Your event is saved in this browser.</p><label for="event-name">Event name<input id="event-name" name="title" required minlength="5" maxlength="100" placeholder="Give your idea a name"></label><div class="grid grid-cols-1 sm:grid-cols-2 gap-5"><label for="event-category">Category<select id="event-category" name="category">${categories.map((c) => `<option>${c}</option>`).join("")}</select></label><label for="event-city">City<input id="event-city" name="city" required minlength="2" maxlength="70" placeholder="Karachi"></label></div><label for="event-venue">Venue<input id="event-venue" name="venue" required minlength="3" maxlength="120" placeholder="Where will the good things happen?"></label><label for="event-description">The story<textarea id="event-description" name="description" required minlength="25" maxlength="1800" rows="4" placeholder="Tell people what makes this experience worth showing up for."></textarea></label><div class="grid grid-cols-1 sm:grid-cols-3 gap-5"><label for="event-date">Event date<input id="event-date" name="date" type="date" required></label><label for="event-capacity">Capacity<input id="event-capacity" name="capacity" type="number" min="1" max="100000" step="1" placeholder="100" required></label><label for="event-price">Ticket price (PKR)<input id="event-price" name="price" type="number" min="0" max="1000000" step="1" placeholder="0 for free" required></label></div><label for="event-organizer">Host / organizer<input id="event-organizer" name="organizer" required minlength="2" maxlength="100" placeholder="Your name or community"></label><label for="event-image">Event cover <small>(optional · JPEG, PNG or WebP, up to 5 MB)</small><input id="event-image" name="image" type="file" accept="image/jpeg,image/png,image/webp"></label><div class="upload-preview"><img id="image-preview" src="assets/images/hero.jpg" alt="Your event cover preview"></div><p class="form-error" id="organizer-error" role="alert"></p><button type="submit" class="btn btn-red w-full">Create demo event ${icon("arrow")}</button><div id="organizer-success" role="status" tabindex="-1"></div></form></section>`;
}
export function initOrganizer() {
  const form = document.getElementById("organizer-form");
  let image = "assets/images/hero.jpg",
    processing = false;
  const error = document.getElementById("organizer-error");
  document.getElementById("event-date").min = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  document.getElementById("event-image").addEventListener("change", (ev) => {
    error.textContent = "";
    const file = ev.target.files[0];
    if (!file) {
      image = "assets/images/hero.jpg";
      document.getElementById("image-preview").src = image;
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      error.textContent =
        "Choose a JPEG, PNG, or WebP image smaller than 5 MB.";
      ev.target.value = "";
      return;
    }
    processing = true;
    const objectURL = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 1200 / img.width);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      image = canvas.toDataURL("image/jpeg", 0.8);
      document.getElementById("image-preview").src = image;
      URL.revokeObjectURL(objectURL);
      processing = false;
    };
    img.onerror = () => {
      error.textContent = "That image could not be opened. Try another file.";
      URL.revokeObjectURL(objectURL);
      processing = false;
      ev.target.value = "";
    };
    img.src = objectURL;
  });
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    error.textContent = "";
    if (processing) {
      error.textContent =
        "Your image is still being prepared. Try again in a moment.";
      return;
    }
    const f = Object.fromEntries(new FormData(form));
    for (const field of ["title", "city", "venue", "description", "organizer"])
      f[field] = f[field].trim();
    if (
      f.title.length < 5 ||
      f.city.length < 2 ||
      f.venue.length < 3 ||
      f.description.length < 25 ||
      f.organizer.length < 2
    ) {
      error.textContent =
        "Please complete each field with meaningful event details.";
      return;
    }
    const date = f.date + "T19:00:00+05:00";
    if (new Date(date) <= new Date()) {
      error.textContent =
        "Choose a future event date. Demo events start at 7:00 PM Pakistan time.";
      return;
    }
    const capacity = Number(f.capacity),
      price = Number(f.price);
    if (
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 100000 ||
      !Number.isInteger(price) ||
      price < 0 ||
      price > 1000000
    ) {
      error.textContent =
        "Enter a whole-number capacity (1–100,000) and price (0–1,000,000).";
      return;
    }
    const event = {
      id: "host-" + crypto.randomUUID().slice(0, 12),
      title: f.title,
      category: f.category,
      city: f.city,
      venue: f.venue,
      description: f.description,
      organizer: f.organizer,
      date,
      capacity,
      price,
      image,
      popularity: 0,
      duration: "3 hours",
    };
    if (!save(KEYS.events, [...list(KEYS.events), event])) {
      error.textContent =
        "Your browser could not save this event. Try a smaller image or free some storage.";
      return;
    }
    form.reset();
    image = "assets/images/hero.jpg";
    document.getElementById("image-preview").src = image;
    const success = document.getElementById("organizer-success");
    success.innerHTML = `<div class="form-success">${icon("check")}<div><strong>Your idea has a home.</strong><p>Your demo event is now in Discover.</p><a class="text-link" href="event.html?id=${event.id}">View your event ${icon("arrow")}</a></div></div>`;
    success.focus();
    toast("Your demo event is ready to discover.");
  });
}
