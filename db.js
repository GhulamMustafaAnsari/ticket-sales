const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tickets.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    venue TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id),
    section TEXT NOT NULL,
    row TEXT NOT NULL,
    number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'free'
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seat_id INTEGER NOT NULL UNIQUE REFERENCES seats(id),
    reserved_by TEXT NOT NULL,
    reserved_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_seats_event_status ON seats(event_id, status);
`);

module.exports = db;
