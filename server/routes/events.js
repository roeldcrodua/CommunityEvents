const express = require('express');

module.exports = function createApiRoutes({ getEvents, reloadEvents }) {
  const router = express.Router();

  router.get('/events', (req, res) => {
    res.json(getEvents());
  });

  router.get('/reload', (req, res) => {
    const count = reloadEvents();
    res.json({ success: true, count, message: `Reloaded ${count} events` });
  });

  return router;
};
