/**
 * Brute-force rate limiting for unauthenticated auth endpoints
 * (login, signup, forgot/reset password). Uses express-rate-limit (MIT).
 */
import { rateLimit } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** Login/signup: a modest number of attempts per IP per window. */
export const authRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

/** Password reset request/confirm: tighter, since each one sends an email. */
export const passwordResetRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});
