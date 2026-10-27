const express = require('express');

const app = express();

app.use(express.json());

// Health check: verifies that the API responds.
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-sentinel',
  });
});

module.exports = app;
