const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://crm.taylancetech.com',
];

export function getAllowedOrigins() {
  const fromEnv = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  return [...new Set([...DEFAULT_ORIGINS, ...fromEnv])];
}

export function isOriginAllowed(origin) {
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}

export function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
}
