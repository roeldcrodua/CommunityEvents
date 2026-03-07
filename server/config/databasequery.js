const fs = require('fs');
const path = require('path');
const pg = require('pg');
require('./dotenv');
const { pool } = require('./database');

const dataPath = path.join(__dirname, '..', 'data', 'events.json');
const TABLE_NAME = 'events';

const createTableQuery = `
CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  datetime TEXT,
  date TEXT,
  description TEXT,
  location TEXT,
  image TEXT,
  url TEXT,
  contact TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
`;

async function createDatabaseIfNotExists() {
  const adminClient = new pg.Client({
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await adminClient.connect();
    const databaseName = process.env.PGDATABASE;
    const result = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);

    if (result.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${databaseName}"`);
      console.log(`✅ Database created: ${databaseName}`);
    } else {
      console.log(`ℹ️  Database already exists: ${databaseName}`);
    }
  } catch (error) {
    console.warn(`⚠️  Skipping explicit database creation: ${error.message}`);
  } finally {
    await adminClient.end().catch(() => {});
  }
}

async function createEventsTable() {
  await pool.query(createTableQuery);
  console.log('✅ Events table is ready');
}

function readEventsFromJson() {
  if (!fs.existsSync(dataPath)) {
    return [];
  }

  const content = fs.readFileSync(dataPath, 'utf-8');
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : [];
}

function normalizeId(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEvent(event) {
  const id = normalizeId(event.id);
  if (id === null) {
    return null;
  }

  return {
    id,
    name: event.name || 'Untitled Event',
    datetime: event.dateTime || '',
    date: event.date || '',
    description: event.description || '',
    location: event.location || '',
    image: event.image || '',
    url: event.url || '',
    contact: event.contact || ''
  };
}

async function insertEvent(event) {
  await pool.query(
    `
      INSERT INTO ${TABLE_NAME} (id, name, datetime, date, description, location, image, url, contact)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      event.id,
      event.name,
      event.datetime,
      event.date,
      event.description,
      event.location,
      event.image,
      event.url,
      event.contact
    ]
  );
}

async function updateEvent(event) {
  await pool.query(
    `
      UPDATE ${TABLE_NAME}
      SET
        name = $2,
        datetime = $3,
        date = $4,
        description = $5,
        location = $6,
        image = $7,
        url = $8,
        contact = $9,
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      event.id,
      event.name,
      event.datetime,
      event.date,
      event.description,
      event.location,
      event.image,
      event.url,
      event.contact
    ]
  );
}

async function deleteEventById(id) {
  await pool.query(`DELETE FROM ${TABLE_NAME} WHERE id = $1`, [id]);
}

async function getAllEvents() {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        datetime AS "dateTime",
        date,
        description,
        location,
        image,
        url,
        contact
      FROM ${TABLE_NAME}
    `
  );

  const parseEventTimestamp = (event) => {
    const dateCandidate = String(event?.date || '').replace(/\u00a0/g, ' ').trim();
    const dateWithoutWeekday = dateCandidate.includes(',')
      ? dateCandidate.substring(dateCandidate.indexOf(',') + 1).trim()
      : dateCandidate;

    const dateTimestamp = Date.parse(dateWithoutWeekday);
    if (!Number.isNaN(dateTimestamp)) {
      return dateTimestamp;
    }

    const dateTimeCandidate = String(event?.dateTime || '').replace(/\u00a0/g, ' ').trim();
    const dateTimeMatch = dateTimeCandidate.match(/([A-Za-z]+\s+\d{1,2},\s*\d{4})/);
    if (dateTimeMatch && dateTimeMatch[1]) {
      const dateTimeTimestamp = Date.parse(dateTimeMatch[1]);
      if (!Number.isNaN(dateTimeTimestamp)) {
        return dateTimeTimestamp;
      }
    }

    return Number.NEGATIVE_INFINITY;
  };

  return result.rows.sort((firstEvent, secondEvent) => {
    return parseEventTimestamp(secondEvent) - parseEventTimestamp(firstEvent);
  });
}

async function syncEventsFromJson() {
  await createDatabaseIfNotExists();
  await createEventsTable();

  const events = readEventsFromJson()
    .map(normalizeEvent)
    .filter(Boolean);

  const existingRows = await pool.query(`SELECT id FROM ${TABLE_NAME}`);
  const existingIds = new Set(existingRows.rows.map((row) => Number.parseInt(String(row.id), 10)));
  const incomingIds = new Set(events.map((event) => event.id));

  let inserted = 0;
  let updated = 0;
  let deleted = 0;

  for (const event of events) {
    if (!existingIds.has(event.id)) {
      await insertEvent(event);
      inserted += 1;
      continue;
    }

    await updateEvent(event);
    updated += 1;
  }

  for (const id of existingIds) {
    if (!incomingIds.has(id)) {
      await deleteEventById(id);
      deleted += 1;
    }
  }

  return {
    inserted,
    updated,
    deleted,
    totalIncoming: events.length
  };
}

async function runDatabaseSync() {
  try {
    const summary = await syncEventsFromJson();
    console.log('✅ Database sync complete', summary);
    return summary;
  } finally {
    await pool.end().catch(() => {});
  }
}

module.exports = {
  createTableQuery,
  createDatabaseIfNotExists,
  createEventsTable,
  insertEvent,
  updateEvent,
  deleteEventById,
  getAllEvents,
  syncEventsFromJson,
  runDatabaseSync
};

if (require.main === module) {
  runDatabaseSync().catch((error) => {
    console.error('❌ Database sync failed:', error.message);
    process.exit(1);
  });
}
