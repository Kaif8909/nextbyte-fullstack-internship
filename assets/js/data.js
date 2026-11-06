import { list, KEYS } from "./storage.js";
export const categories = [
  "Music",
  "Concerts",
  "Festivals",
  "Technology",
  "Business",
  "Sports",
  "Food",
  "Arts",
  "Workshops",
  "Nightlife",
];
const seed = [
  [
    "after-hours",
    "After Hours: Live under the stars",
    "Music",
    "Karachi",
    "Beach Luxury Hotel",
    4500,
    "concert",
    1,
    "The city’s favorite open-air session returns. A live band, sea breeze, and a crowd that knows every word.",
    "After Hours Collective",
  ],
  [
    "jazz-garden",
    "Jazz in the Garden",
    "Concerts",
    "Lahore",
    "Haveli Garden",
    3200,
    "jazz",
    2,
    "An intimate evening of jazz standards and fresh improvisation, set in a beautiful courtyard.",
    "The Listening Room",
  ],
  [
    "taste-karachi",
    "A Taste of Karachi",
    "Food",
    "Karachi",
    "Frere Hall Gardens",
    1800,
    "food",
    3,
    "Meet independent chefs and discover a new side of the city’s food scene, one delicious plate at a time.",
    "Table Stories",
  ],
  [
    "art-after-dark",
    "Art After Dark",
    "Arts",
    "Islamabad",
    "Pakistan National Council of the Arts",
    1500,
    "art",
    4,
    "Step into a gallery after hours for contemporary art, artist conversations, and a new perspective.",
    "Open Studio",
  ],
  [
    "future-forward",
    "Future Forward Summit",
    "Technology",
    "Lahore",
    "Arfa Software Technology Park",
    6000,
    "tech",
    5,
    "Meet the builders shaping tomorrow through thoughtful talks, product demos, and practical conversations.",
    "Future People",
  ],
  [
    "soundscape",
    "Soundscape Festival",
    "Festivals",
    "Karachi",
    "DHA Sunset Club",
    7500,
    "festival",
    6,
    "Two stages. One shared rhythm. Discover independent artists and dance through a full day of live music.",
    "Soundscape Pakistan",
  ],
  [
    "midnight-sessions",
    "Midnight Sessions",
    "Nightlife",
    "Lahore",
    "The Warehouse",
    3500,
    "nightlife",
    7,
    "An intimate electronic music session with carefully selected local DJs and an immersive sound system.",
    "Room 02",
  ],
  [
    "write-your-story",
    "Write Your Story",
    "Workshops",
    "Islamabad",
    "The Black Hole",
    1200,
    "workshop",
    8,
    "Find your voice in a friendly writing workshop led by published storytellers. Bring your curiosity and a notebook.",
    "Story Circle",
  ],
  [
    "founders-table",
    "The Founders’ Table",
    "Business",
    "Karachi",
    "NIC Karachi",
    0,
    "business",
    9,
    "Honest conversations about building a business, with founders who share both the wins and the hard lessons.",
    "Build Together",
  ],
  [
    "city-games",
    "City Games: Community Cup",
    "Sports",
    "Lahore",
    "Model Town Sports Club",
    800,
    "sports",
    10,
    "Bring your friends for a day of friendly matches, good energy, and community. All skill levels are welcome.",
    "Play Society",
  ],
  [
    "clay-and-conversation",
    "Clay & Conversation",
    "Workshops",
    "Karachi",
    "Studio Mitti",
    2800,
    "pottery",
    11,
    "Slow down and make something with your hands. Learn the basics of hand-built ceramics over a cup of tea.",
    "Studio Mitti",
  ],
  [
    "rooftop-supper",
    "The Rooftop Supper Club",
    "Food",
    "Lahore",
    "Old City Rooftop",
    5500,
    "rooftop",
    12,
    "A seasonal tasting menu above the old city, made for long conversations and new friendships.",
    "Supper Society",
  ],
  [
    "cinema-under-stars",
    "Cinema Under the Stars",
    "Arts",
    "Islamabad",
    "Fatima Jinnah Park",
    1400,
    "film",
    13,
    "A much-loved independent film, an outdoor screen, and a comfortable spot on the lawn. Popcorn included.",
    "Open Air Cinema",
  ],
  [
    "sunday-strides",
    "Sunday Strides",
    "Sports",
    "Karachi",
    "Sea View Promenade",
    0,
    "running",
    2,
    "An easy-paced sunrise run by the sea followed by coffee and conversation. Choose a 3 km or 5 km route.",
    "Run Club Karachi",
  ],
  [
    "design-dialogues",
    "Design Dialogues",
    "Technology",
    "Islamabad",
    "Daftarkhwan",
    2200,
    "design",
    15,
    "Explore how good design changes everyday life with local creatives, product designers, and independent makers.",
    "Design Assembly",
  ],
  [
    "coffee-lab",
    "The Coffee Lab",
    "Workshops",
    "Lahore",
    "Third Culture Coffee",
    2400,
    "coffee",
    16,
    "Learn to brew a better cup with a guided tasting, hands-on brewing, and stories from origin to cup.",
    "Third Culture",
  ],
  [
    "movement-collective",
    "The Movement Collective",
    "Arts",
    "Karachi",
    "Arts Council",
    1600,
    "dance",
    17,
    "A contemporary dance performance that brings fresh voices and bold choreography to the stage.",
    "Movement Collective",
  ],
  [
    "makers-market",
    "The Makers’ Market",
    "Festivals",
    "Islamabad",
    "Lok Virsa",
    0,
    "market",
    18,
    "Shop handmade objects, meet the people who make them, and spend an afternoon among good things.",
    "Local Made",
  ],
  [
    "unplugged",
    "Unplugged: An Acoustic Evening",
    "Music",
    "Lahore",
    "Alhamra Courtyard",
    2600,
    "acoustic",
    19,
    "Stripped-back sets and honest songwriting from emerging local musicians in an intimate courtyard.",
    "Soft Sounds",
  ],
  [
    "creative-retreat",
    "A Day Away: Creative Retreat",
    "Workshops",
    "Islamabad",
    "Margalla Hills Retreat",
    8500,
    "nature",
    22,
    "Trade your screen for fresh air. A guided nature walk, creative exercises, and a shared lunch in the hills.",
    "Outside Studio",
  ],
  [
    "candlelight-strings",
    "Candlelight & Strings",
    "Concerts",
    "Karachi",
    "Mohatta Palace Courtyard",
    4800,
    "candle",
    24,
    "An atmospheric string quartet performance featuring familiar melodies in a beautiful historic setting.",
    "The Listening Room",
  ],
  [
    "next-chapter",
    "Your Next Chapter",
    "Business",
    "Lahore",
    "Daftarkhwan",
    0,
    "business",
    28,
    "A practical career conversation with mentors, small-group discussions, and a supportive professional community.",
    "Next Chapter Club",
  ],
];
const today = new Date("2026-11-06T12:00:00Z");
export const events = seed.map((r, i) => {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + r[7]);
  return {
    id: r[0],
    title: r[1],
    category: r[2],
    city: r[3],
    venue: r[4],
    price: r[5],
    image: `assets/images/${r[6]}.jpg`,
    date: d.toISOString().slice(0, 10) + "T19:00:00+05:00",
    description: r[8],
    organizer: r[9],
    capacity: 100 + i * 12,
    popularity: 990 - i * 23,
    duration: "3 hours",
    highlights: [
      "A thoughtfully curated, in-person experience",
      "Meet your local community",
      "Hosted by independent creators",
    ],
    schedule: [
      ["18:30", "Doors open & welcome"],
      ["19:00", "The experience begins"],
      ["21:30", "Wind down & connect"],
    ],
  };
});
export function allEvents() {
  return [
    ...events,
    ...list(KEYS.events).filter(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.title === "string" &&
        Number.isFinite(e.price) &&
        e.price >= 0 &&
        Number.isFinite(e.capacity) &&
        e.capacity > 0 &&
        !isNaN(Date.parse(e.date)),
    ),
  ];
}
export function getEvent(id) {
  return allEvents().find((e) => e.id === id);
}
export function ticketTypes(e) {
  return [
    {
      id: "early",
      name: "Early Bird",
      description: "The same great experience, a little less.",
      price: Math.round(e.price * 0.8),
      capacity: Math.min(20, e.capacity),
    },
    {
      id: "general",
      name: "General Admission",
      description: "Your place in the middle of it all.",
      price: e.price,
      capacity: Math.max(
        0,
        e.capacity -
          Math.min(20, e.capacity) -
          Math.min(15, Math.max(0, e.capacity - 20)),
      ),
    },
    {
      id: "vip",
      name: "VIP Experience",
      description: "Priority entry and the best view in the house.",
      price: Math.round(e.price * 1.75),
      capacity: Math.min(15, Math.max(0, e.capacity - 20)),
    },
  ];
}
export function remaining(e, type) {
  const sold = list(KEYS.bookings)
    .filter((b) => b.eventId === e.id)
    .reduce(
      (n, b) =>
        n +
        (b.items || [])
          .filter((t) => t.id === type.id)
          .reduce((a, t) => a + t.quantity, 0),
      0,
    );
  return Math.max(0, type.capacity - sold);
}
export const money = (n) =>
  n === 0 ? "Free" : `PKR ${n.toLocaleString("en-PK")}`;
export const dateLabel = (d) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(new Date(d));
export const shortDate = (d) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Karachi",
  }).format(new Date(d));
