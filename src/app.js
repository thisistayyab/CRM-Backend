import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { mongoDB_connection } from './Database/db.js';
import { router } from './routes/user.routes.js';
import { router as productRouter } from './routes/product.routes.js';
import { storeRouter } from './routes/store.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { inventoryRouter } from './routes/inventory.routes.js';
import { generalLimiter } from './middlewares/rateLimiter.js';
import { applyCorsHeaders, isOriginAllowed } from './config/cors.js';

const app = express();
const port = process.env.PORT || 8000;

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use(cookieParser());

app.use(async (req, res, next) => {
  try {
    await mongoDB_connection();
    next();
  } catch (err) {
    next(err);
  }
});

app.use(generalLimiter);

app.use('/v1/api/user', router);
app.use('/v1/api/product', productRouter);
app.use('/v1/api/store', storeRouter);
app.use('/v1/api/analytics', analyticsRouter);
app.use('/v1/api/inventory', inventoryRouter);

app.use((err, req, res, next) => {
  applyCorsHeaders(req, res);

  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: `Origin not allowed. Add ${req.headers.origin} to CORS_ORIGIN on the server.`,
      data: null,
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors || [],
    data: null,
  });
});

const startServer = async () => {
  try {
    await mongoDB_connection();
    app.listen(port);
  } catch {
    process.exit(1);
  }
};

if (!process.env.VERCEL) {
  startServer();
}

export default app;
