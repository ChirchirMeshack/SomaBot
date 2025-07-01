import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware
 * Limits each IP to 10 requests per minute
 */
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
});

export default limiter; 