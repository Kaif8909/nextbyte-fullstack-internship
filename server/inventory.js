export function ticketPools(event) {
  const early = Math.min(20, event.capacity);
  const vip = Math.min(15, Math.max(0, event.capacity - 20));
  return [
    { id: 'early', name: 'Early Bird', price: Math.round(event.price * 0.8), capacity: early },
    { id: 'general', name: 'General Admission', price: event.price, capacity: event.capacity - early - vip },
    { id: 'vip', name: 'VIP Experience', price: Math.round(event.price * 1.75), capacity: vip }
  ];
}

export function remainingPools(event, sales, registrations) {
  const booked = new Map(sales.map(row => [row.id, Number(row.sold)]));
  const pools = ticketPools(event).map(pool => ({
    ...pool, remaining: Math.max(0, pool.capacity - (booked.get(pool.id) || 0))
  }));
  let unallocated = Number(registrations);
  for (const id of ['general', 'early', 'vip']) {
    const pool = pools.find(item => item.id === id);
    const used = Math.min(pool.remaining, unallocated);
    pool.remaining -= used;
    unallocated -= used;
  }
  return pools;
}
