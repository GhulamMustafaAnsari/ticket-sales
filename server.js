const express = require('express');
const db = require('./db');

const app = express();
app.use(express.json());

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'body must be valid JSON' });
  }
  next(err);
});

// ---- GET /events/:id/seats?status=free — list seats for an event ----
app.get('/events/:id/seats', (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId)) {
    return res.status(400).json({ error: 'id: event id must be an integer' });
  }

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'id: no event found with this id' });
  }

  const status = req.query.status;

  const limit = Math.min(Number(req.query.limit) || 500, 2000);
  const offset = Number(req.query.offset) || 0;
  if (!Number.isInteger(limit) || limit <= 0) {
    return res.status(400).json({ error: 'limit: must be a positive integer' });
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return res.status(400).json({ error: 'offset: must be a non-negative integer' });
  }

  let rows;
  if (status) {
    if (!['free', 'reserved'].includes(status)) {
      return res.status(400).json({ error: 'status: must be "free" or "reserved"' });
    }
    rows = db
      .prepare('SELECT * FROM seats WHERE event_id = ? AND status = ? ORDER BY id LIMIT ? OFFSET ?')
      .all(eventId, status, limit, offset);
  } else {
    rows = db
      .prepare('SELECT * FROM seats WHERE event_id = ? ORDER BY id LIMIT ? OFFSET ?')
      .all(eventId, limit, offset);
  }

  res.status(200).json(rows);
});

// ---- POST /events/:id/seats/:seatId/reserve — reserve a specific seat ----
app.post('/events/:id/seats/:seatId/reserve', (req, res) => {
  const eventId = Number(req.params.id);
  const seatId = Number(req.params.seatId);
  if (!Number.isInteger(eventId) || !Number.isInteger(seatId)) {
    return res.status(400).json({ error: 'id: event id and seat id must be integers' });
  }

  const seat = db
    .prepare('SELECT * FROM seats WHERE id = ? AND event_id = ?')
    .get(seatId, eventId);
  if (!seat) {
    return res.status(404).json({ error: 'seatId: no such seat for this event' });
  }

  const reservedBy = (req.body && req.body.reservedBy) || 'anonymous';

  const reserve = db.transaction(() => {
    const result = db
      .prepare("UPDATE seats SET status = 'reserved' WHERE id = ? AND status = 'free'")
      .run(seatId);

    if (result.changes === 0) {
      return null;
    }

    db.prepare(
      'INSERT INTO reservations (seat_id, reserved_by, reserved_at) VALUES (?, ?, ?)'
    ).run(seatId, reservedBy, new Date().toISOString());

    return db.prepare('SELECT * FROM seats WHERE id = ?').get(seatId);
  });

  const updatedSeat = reserve();

  if (!updatedSeat) {
    return res.status(409).json({ error: 'seatId: seat is already reserved' });
  }

  res.status(200).json({ reserved: true, seat: updatedSeat });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: 'request could not be processed' });
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Ticket sales service listening on port ${PORT}`));
}

module.exports = app;
