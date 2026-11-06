export function filterEvents(events, filters, favorites = []) {
  const q = (filters.q || "").toLowerCase().trim();
  const now = Date.now();
  return events
    .filter((e) => {
      const delta = new Date(e.date).getTime() - now;
      return (
        (!q ||
          `${e.title} ${e.city} ${e.venue} ${e.organizer}`
            .toLowerCase()
            .includes(q)) &&
        (!filters.category || e.category === filters.category) &&
        (!filters.city || e.city === filters.city) &&
        (!filters.saved || favorites.includes(e.id)) &&
        (!filters.price ||
          filters.price === "all" ||
          (filters.price === "free" ? e.price === 0 : e.price > 0)) &&
        (!filters.max || Math.round(e.price * 0.8) <= Number(filters.max)) &&
        (!filters.date ||
          (delta >= 0 &&
            delta <= (filters.date === "week" ? 7 : 30) * 86400000))
      );
    })
    .sort((a, b) =>
      filters.sort === "price-asc"
        ? a.price - b.price
        : filters.sort === "price-desc"
          ? b.price - a.price
          : filters.sort === "popular"
            ? b.popularity - a.popularity
            : new Date(a.date) - new Date(b.date),
    );
}
