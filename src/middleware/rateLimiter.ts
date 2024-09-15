import { Request, Response, NextFunction } from "express";
import redis from "../config/redis";

const WINDOW_SIZE_IN_SECONDS = 15 * 60; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 10;

export const analyzeRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.ip;
  const key = `ratelimit:${ip}`;

  try {
    const requests = await redis.incr(key);

    if (requests === 1) {
      await redis.expire(key, WINDOW_SIZE_IN_SECONDS);
    }

    if (requests > MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        error: "Too many contract analysis requests, please try again later.",
      });
    }

    next();
  } catch (error) {
    console.error("Rate limiting error:", error);
    next(); // Proceed even if there's an error with rate limiting
  }
};
