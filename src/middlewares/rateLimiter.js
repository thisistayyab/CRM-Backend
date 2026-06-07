import rateLimit from 'express-rate-limit';

const jsonHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please wait a few minutes and try again.',
    data: null,
  });
};

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GENERAL) || 400,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_EMAIL) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many email requests. Please wait an hour before trying again.',
      data: null,
    });
  },
});
