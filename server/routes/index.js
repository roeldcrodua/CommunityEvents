const express = require('express');
const createApiRoutes = require('./events');
const createPageRoutes = require('./pages');

module.exports = function createRoutes({ api, pages }) {
  const router = express.Router();

  router.use('/api', createApiRoutes(api));
  router.use('/', createPageRoutes(pages));

  return router;
};
