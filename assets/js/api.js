// Same-origin API requests. Run the project with `npm.cmd run dev` instead of Live Server.
export async function apiPost(path, payload) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error('Cannot connect to the API. Please check your connection and try again. For local development, use npm.cmd run dev.');
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('The API returned an unexpected response. The server may not be configured. For local development, use http://localhost:3000.'); }
  if (!response.ok) throw new Error(data?.error?.message || `Request failed (HTTP ${response.status}).`);
  // The receipt authorizes only this booking; it is never an organizer credential.
  const token = response.headers.get('x-booking-token');
  if (token && data.booking?.id) {
    try { localStorage.setItem(`crescent.receipt.${data.booking.id}`, token); } catch { /* Existing booking cache still works. */ }
  }
  return data;
}
