// Central error handler. Mount last, after notFound.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  console.error(`[${req.id}] Unhandled request error:`, err);
  const status = Number(err?.status) >= 400 ? Number(err.status) : 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message || 'Request failed' });
}
