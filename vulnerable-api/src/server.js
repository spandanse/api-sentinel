const app = require('./app');

const PORT = Number(process.env.VULNERABLE_API_PORT) || 4001;

// Bind to loopback only. Do not expose this intentionally vulnerable API
// to your local network or the public internet.
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Vulnerable test API running at http://127.0.0.1:${PORT}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
