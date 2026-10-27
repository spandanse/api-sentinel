const ALLOWED_TARGET = 'http://127.0.0.1:4001';

function validateTarget(target) {
  let url;

  try {
    url = new URL(target);
  } catch {
    throw new Error('Invalid target URL');
  }

  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    url.port !== '4001' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `Target not allowed. Only ${ALLOWED_TARGET} is permitted.`
    );
  }

  return ALLOWED_TARGET;
}

module.exports = { validateTarget };
