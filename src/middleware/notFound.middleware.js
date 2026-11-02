function notFoundHandler(req, res) {
  return res.status(404).json({
    error: 'Not found.',
    message: 'The requested API endpoint does not exist.',
  });
}

module.exports = notFoundHandler;
