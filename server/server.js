const express = require('express');
const path = require('path');
const createRoutes = require('./routes');
const { getAllEvents } = require('./config/databasequery');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
async function getEvents() {
  return getAllEvents();
}

app.use(express.static(publicDir));
app.use(express.json());

app.use(
  createRoutes({
    api: {
      getEvents
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

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         🎉 Listicle App Server Running                       ║
║                                                               ║
║  🔗 Visit: http://localhost:${PORT}                           ║
║  📋 API:   http://localhost:${PORT}/api/events               ║
║  ℹ️  Scraper is manual: npm run scrape                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
