import { randomUUID } from 'node:crypto';

// Assigns a request id for log correlation. Exposed as X-Request-Id.
export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
