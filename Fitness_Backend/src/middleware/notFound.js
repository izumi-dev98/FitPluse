// 404 for unknown API routes. Mount after all routers.
export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}
