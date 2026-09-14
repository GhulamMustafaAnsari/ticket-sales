// Captures the REAL query plan and timing before and after adding the
// index used by GET /events/:id/seats?status=free. Run with: node explain.js
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'explain-tmp.db');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);
db.exec(`
  CREATE TABLE events (id INTEGER PRIMARY KEY, name TEXT);
  CREATE TABLE seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    status TEXT NOT NULL
  );
`);

console.log('Seeding 10,000 seats across 10 events...');
const insertSeat = db.prepare('INSERT INTO seats (event_id, status) VALUES (?, ?)');
const seedAll = db.transaction(() => {
  db.prepare('INSERT INTO events (id, name) VALUES (?, ?)').run(1, 'Event 1');
  for (let i = 0; i < 10000; i++) {
    const eventId = (i % 10) + 1;
    insertSeat.run(eventId, i % 3 === 0 ? 'reserved' : 'free');
  }
});
seedAll();

const query = "SELECT * FROM seats WHERE event_id = 1 AND status = 'free'";

console.log('\n=== BEFORE INDEX ===');
const planBefore = db.prepare(`EXPLAIN QUERY PLAN ${query}`).all();
console.log(planBefore);

let t0 = process.hrtime.bigint();
for (let i = 0; i < 50; i++) db.prepare(query).all();
let t1 = process.hrtime.bigint();
console.log(`50 runs, avg ${(Number(t1 - t0) / 1e6 / 50).toFixed(3)} ms/run (no index)`);

console.log('\nCreating index idx_seats_event_status ON seats(event_id, status)...');
db.exec('CREATE INDEX idx_seats_event_status ON seats(event_id, status);');

console.log('\n=== AFTER INDEX ===');
const planAfter = db.prepare(`EXPLAIN QUERY PLAN ${query}`).all();
console.log(planAfter);

t0 = process.hrtime.bigint();
for (let i = 0; i < 50; i++) db.prepare(query).all();
t1 = process.hrtime.bigint();
console.log(`50 runs, avg ${(Number(t1 - t0) / 1e6 / 50).toFixed(3)} ms/run (with index)`);

db.close();
fs.unlinkSync(dbPath);
if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
