// Simple in-memory rate limiter
// Production: Use Redis-based rate limiter

class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
    
    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      if (!this.requests.has(ip)) {
        this.requests.set(ip, []);
      }
      
      const userRequests = this.requests.get(ip);
      
      // Remove old requests outside the window
      const recentRequests = userRequests.filter(time => now - time < this.windowMs);
      
      if (recentRequests.length >= this.maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(this.windowMs / 1000)
        });
      }
      
      recentRequests.push(now);
      this.requests.set(ip, recentRequests);
      
      next();
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, requests] of this.requests.entries()) {
      const recent = requests.filter(time => now - time < this.windowMs);
      if (recent.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, recent);
      }
    }
  }
}

module.exports = RateLimiter;
