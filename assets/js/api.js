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
    throw new Error('Cannot connect to the API. Start the project with npm.cmd run dev and open http://localhost:3000.');
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('The API returned an unexpected response. Open the site at http://localhost:3000, not Live Server.'); }
  if (!response.ok) throw new Error(data?.error?.message || `Request failed (HTTP ${response.status}).`);
  return data;
}
