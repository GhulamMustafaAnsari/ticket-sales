const db = require('./db');

const EVENTS = 10;
const SECTIONS = ['A', 'B', 'C', 'D'];
const ROWS_PER_SECTION = 25;
const SEATS_PER_ROW = 10; // 10 events * 4 sections * 25 rows * 10 seats = 10,000 seats

console.log('Seeding database...');

db.exec('DELETE FROM reservations; DELETE FROM seats; DELETE FROM events;');

const insertEvent = db.prepare('INSERT INTO events (name, date, venue) VALUES (?, ?, ?)');
const insertSeat = db.prepare(
  'INSERT INTO seats (event_id, section, row, number, status) VALUES (?, ?, ?, ?, ?)'
);

const seedAll = db.transaction(() => {
  for (let e = 1; e <= EVENTS; e++) {
    const eventId = insertEvent.run(
      `Event ${e}`,
      new Date(Date.now() + e * 86400000).toISOString().slice(0, 10),
      `Venue ${((e - 1) % 3) + 1}`
    ).lastInsertRowid;

    for (const section of SECTIONS) {
      for (let r = 1; r <= ROWS_PER_SECTION; r++) {
        for (let n = 1; n <= SEATS_PER_ROW; n++) {
          insertSeat.run(eventId, section, `R${r}`, n, 'free');
        }
      }
    }
  }
});

seedAll();

const count = db.prepare('SELECT COUNT(*) AS c FROM seats').get().c;
console.log(`Seeded ${EVENTS} events and ${count} seats.`);
