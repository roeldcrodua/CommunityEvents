const express = require('express');
const path = require('path');
const fs = require('fs');
const createRoutes = require('./routes');
const runScraper = require('./scripts/scraper');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const dataPath = path.join(__dirname, 'data', 'events.json');

let events = [];

function loadEvents() {
  try {
    if (!fs.existsSync(dataPath)) {
      events = [];
      console.log('⚠️  events.json not found, using empty events list');
      return;
    }

    const data = fs.readFileSync(dataPath, 'utf-8');
    const parsed = JSON.parse(data);
    events = Array.isArray(parsed) ? parsed : [];
    console.log(`✅ Loaded ${events.length} events from events.json`);
  } catch (error) {
    console.error('❌ Error loading events:', error.message);
    events = [];
  }
}

function getEvents() {
  return events;
}

function reloadEvents() {
  console.log('\n🔄 Manual reload requested...');
  loadEvents();
  return events.length;
}

// Run scraper on startup to ensure fresh data
async function initializeServer() {
  console.log('🕷️  Running scraper to fetch latest events...');
  try {
    await runScraper();
    console.log('✅ Scraper completed successfully');
  } catch (error) {
    console.error('⚠️  Scraper failed:', error.message);
    console.log('📋 Loading existing events.json if available...');
  }
  loadEvents();
}

if (fs.existsSync(dataPath)) {
  let fsWait = false;
  fs.watch(dataPath, (event, filename) => {
    if (filename && event === 'change') {
      if (fsWait) return;
      fsWait = setTimeout(() => {
        fsWait = false;
      }, 100);
      console.log('\n🔄 events.json changed, reloading data...');
      loadEvents();
    }
  });
}

app.use(express.static(publicDir));
app.use(express.json());

app.use(
  createRoutes({
    api: {
      getEvents,
      reloadEvents
    },
    pages: {
      getEvents,
      publicDir
    }
  })
);

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Start server after initialization
initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         🎉 Listicle App Server Running                       ║
║                                                               ║
║  🔗 Visit: http://localhost:${PORT}                           ║
║  📋 API:   http://localhost:${PORT}/api/events               ║
║  📊 ${events.length} events loaded                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });
});
