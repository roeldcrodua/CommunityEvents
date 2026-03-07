const express = require('express');
const path = require('path');

module.exports = function createPageRoutes({ getEvents, publicDir }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  router.get('/event/:id', async (req, res) => {
    const eventId = Number.parseInt(req.params.id, 10);
    try {
      const events = await getEvents();
      const event = events.find((item) => Number.parseInt(String(item.id), 10) === eventId);

      if (!event) {
        return res.status(404).sendFile(path.join(publicDir, '404.html'));
      }

      const imageHtml = event.image
        ? `<img src="${event.image}" alt="${event.name}" class="detail-image" />`
        : '';

      const linkHtml = event.url
        ? `<p><strong>Event Link:</strong> <a href="${event.url}" target="_blank" rel="noopener noreferrer">🔗 Visit Event Page</a></p>`
        : '';

      const contactHtml = event.contact
        ? `<p><strong>Contact:</strong> ${event.contact}</p>`
        : '';

      res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${event.name} - Community Events</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css">
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <nav>
          <div class="nav-banner"></div>
        </nav>
        <main class="container">
          <article>
            <h1>${event.name}</h1>
            ${imageHtml}
            <div class="event-detail">
              ${event.date ? `<p><strong>Date:</strong> ${event.date}</p>` : ''}
              <p><strong>Date & Time:</strong> ${event.dateTime || 'TBA'}</p>
              <p><strong>Location:</strong> ${event.location || 'TBA'}</p>
              ${contactHtml}
              ${linkHtml}
              <p><strong>Description:</strong></p>
              <p>${event.description || 'No description available'}</p>
            </div>
            <footer>
              <a href="/" class="button">Back to All Events</a>
            </footer>
          </article>
        </main>
      </body>
      </html>
    `);
    } catch (error) {
      res.status(409).send(`Error loading event from database: ${error.message}`);
    }
  });

  return router;
};
