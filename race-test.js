// Fires two REAL concurrent HTTP requests at the same seat and prints
// both responses, proving only one can succeed.
// Usage: node race-test.js <eventId> <seatId>  (server must already be running)
const BASE = process.env.BASE_URL || 'http://localhost:3001';

async function reserve(eventId, seatId, who) {
  const res = await fetch(`${BASE}/events/${eventId}/seats/${seatId}/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservedBy: who }),
  });
  const body = await res.json();
  return { who, status: res.status, body };
}

(async () => {
  const eventId = process.argv[2] || 1;
  const seatId = process.argv[3] || 1;

  console.log(`Firing two concurrent reservation requests for seat ${seatId} on event ${eventId}...\n`);

  const [a, b] = await Promise.all([
    reserve(eventId, seatId, 'user-A'),
    reserve(eventId, seatId, 'user-B'),
  ]);

  console.log('Response 1:', JSON.stringify(a));
  console.log('Response 2:', JSON.stringify(b));

  const statuses = [a.status, b.status].sort();
  if (JSON.stringify(statuses) === JSON.stringify([200, 409])) {
    console.log('\nPASS: exactly one request succeeded (200) and one was rejected (409).');
  } else {
    console.log('\nFAIL: expected one 200 and one 409.');
  }
})();
