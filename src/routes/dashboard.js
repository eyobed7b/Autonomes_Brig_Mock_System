const express = require('express');
const router = express.Router();
const { getDashboardOverview } = require('../db');

router.get('/overview', (req, res) => {
  const overview = getDashboardOverview();
  res.json(overview);
});

module.exports = router;
