import rateLimit from "express-rate-limit";

// Global API Rate Limiter
// 300 requests per 15 minutes per IP
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { message: "Too many requests from this IP, please try again later." },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict Auth Rate Limiter
// Limits login and registration attempts to prevent brute-force attacks
// 5 requests per 15 minutes per IP
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Too many authentication attempts, please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});
