# Ticket Sales

Models events, seats and reservations. Built for the "a data model and the
queries on it" task.

## The data model, explained

**events** (id, name, date, venue) — the root entity, everything else hangs off it.

**seats** (id, event_id, section, row, number, status) — event_id is a foreign
key because a seat without a real event is meaningless.

**reservations** (id, seat_id, reserved_by, reserved_at) — kept as its own
table because its UNIQUE constraint on seat_id makes double-booking
structurally impossible.

### Constraints, and what each one prevents

| Constraint | Prevents |
|---|---|
| seats.event_id FOREIGN KEY | A seat referencing an event that doesn't exist |
| reservations.seat_id FOREIGN KEY | A reservation for a seat that doesn't exist |
| reservations.seat_id UNIQUE | Two reservation rows pointing at the same seat |
| idx_seats_event_status index | Not integrity, performance — avoids scanning the whole table |

### Query plan

Measured on 10,000 rows: SCAN seats (0.622ms) -> SEARCH USING COVERING INDEX (0.237ms).

### What breaks first at 10x data

At 100,000 seats, the index still works (SEARCH, not SCAN), but the query
with no LIMIT returns 6,666 rows and 272KB instead of 666 rows — response
size grows linearly with data. Decision to revisit: add pagination.

## Running locally

npm install
node seed.js
npm start

## Changelog
- Added pagination, health check, and root info endpoints.
- Update 1: Ticket listing structure improved
