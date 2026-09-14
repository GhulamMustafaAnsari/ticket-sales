# Ticket Sales

Models events, seats and reservations. Built for the "a data model and the
queries on it" task — the core exercises are query performance at scale and
a genuine seat-reservation race condition.

## Data model

Three related tables, linked by foreign keys:

- **events** (id, name, date, venue)
- **seats** (id, `event_id` → events, section, row, number, status)
- **reservations** (id, `seat_id` → seats, reserved_by, reserved_at)

## Seeding

```bash
npm install
node seed.js
```

Seeds **10 events × 4 sections × 25 rows × 10 seats = 10,000 seats**.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/events/:id/seats?status=free` | List seats for an event (filter by `free`/`reserved`) |
| POST | `/events/:id/seats/:seatId/reserve` | Reserve a specific seat |

## Performance — query plan before and after the index

The index used is `idx_seats_event_status ON seats(event_id, status)`
(created automatically in `db.js`). Captured with `node explain.js` against
a fresh 10,000-row table:

**Before the index:**
```
[ { id: 2, parent: 0, notused: 216, detail: 'SCAN seats' } ]
50 runs, avg 0.622 ms/run (no index)
```

**After the index:**
```
[ { id: 2, parent: 0, notused: 56,
    detail: 'SEARCH seats USING COVERING INDEX idx_seats_event_status (event_id=? AND status=?)' } ]
50 runs, avg 0.237 ms/run (with index)
```

SQLite switches from a full table `SCAN` to an index `SEARCH`, and the
average query time drops by roughly 60%. Against the real running service
with 10,000 seeded seats, `GET /events/1/seats?status=free` measured with
`curl` returned in **15 ms**, well under the 200 ms budget.

## Concurrency — the race condition, demonstrated

Two requests to reserve the same seat must not both succeed. The reservation
handler does a single atomic statement:

```sql
UPDATE seats SET status = 'reserved' WHERE id = ? AND status = 'free'
```

This only changes a row if it is *still* free at that exact moment. Whoever's
`UPDATE` runs first flips it; the other one affects 0 rows and gets a 409.

**Commands run** (`node race-test.js 1 1`, firing two real concurrent HTTP
requests at seat 1 of event 1):

```
Firing two concurrent reservation requests for seat 1 on event 1...

Response 1: {"who":"user-A","status":200,"body":{"reserved":true,"seat":{"id":1,"event_id":1,"section":"A","row":"R1","number":1,"status":"reserved"}}}
Response 2: {"who":"user-B","status":409,"body":{"error":"seatId: seat is already reserved"}}

PASS: exactly one request succeeded (200) and one was rejected (409).
```

A follow-up request for the same seat afterward also correctly returns 409:

```
HTTP/1.1 409 Conflict
{"error":"seatId: seat is already reserved"}
```

## Running locally

```bash
npm install
node seed.js      # populate the database
npm start         # listens on PORT (default 3001)
node race-test.js <eventId> <seatId>   # in another terminal, to re-run the demo
```

## Deployment

Same as any Node service (Render/Railway/Fly.io):

1. Push to GitHub.
2. Connect the repo on your host.
3. Build: `npm install`. Start: `npm start`.
4. Run the seed once after first deploy (Render: use the Shell tab, run
   `node seed.js`).

## Tech stack

Node.js, Express, `better-sqlite3`.
