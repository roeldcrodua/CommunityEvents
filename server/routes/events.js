const express = require('express');

module.exports = function createApiRoutes({ getEvents }) {
  const router = express.Router();

  router.get('/events', async (req, res) => {
    try {
      const events = await getEvents();
      res.status(200).json(events);
    } catch (error) {
      res.status(409).json({
        message: 'Error fetching events from database',
        error: error.message
      });
    }
  });

  router.get('/events/:id', async (req, res) => {
    try {
      const eventId = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(eventId)) {
        return res.status(409).json({
          message: 'Invalid event id'
        });
      }

      const events = await getEvents();
      const event = events.find((item) => Number.parseInt(String(item.id), 10) === eventId);

      if (!event) {
        return res.status(409).json({
          message: 'Event not found'
        });
      }

      res.status(200).json(event);
    } catch (error) {
      res.status(409).json({
        message: 'Error fetching event from database',
        error: error.message
      });
    }
  });

  return router;
};
