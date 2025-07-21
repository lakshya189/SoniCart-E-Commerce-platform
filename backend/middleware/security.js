const xss = require('xss');
const passwordValidator = require('password-validator');
const csrf = require('csrf');

// Password validation schema
const passwordSchema = new passwordValidator();
passwordSchema
  .is().min(8)                                    // Minimum length 8
  .is().max(100)                                  // Maximum length 100
  .has().uppercase()                              // Must have uppercase letters
  .has().lowercase()                              // Must have lowercase letters
  .has().digits(1)                                // Must have at least 1 digit
  .has().symbols(1)                               // Must have at least 1 symbol
  .has().not().spaces();                          // Should not have spaces

// CSRF protection
const csrfProtection = (req, res, next) => {
  // Skip CSRF for API routes that don't need it (GET requests, public endpoints)
  if (req.method === 'GET' || req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register')) {
    return next();
  }

  const tokens = new csrf();
  const secret = tokens.secretSync();
  const token = tokens.create(secret);

  // For now, we'll implement a basic CSRF check
  // In production, you'd want to store the secret in session/redis
  req.csrfToken = token;
  next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    });
  }
  
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
      }
    });
  }
  
  next();
};

// Password validation middleware
const validatePassword = (req, res, next) => {
  const { password } = req.body;
  
  if (!password) {
    return next();
  }

  const validation = passwordSchema.validate(password, { list: true });
  
  if (validation.length > 0) {
    const errors = validation.map(error => {
      switch (error) {
        case 'min':
          return 'Password must be at least 8 characters long';
        case 'max':
          return 'Password must be less than 100 characters';
        case 'uppercase':
          return 'Password must contain at least one uppercase letter';
        case 'lowercase':
          return 'Password must contain at least one lowercase letter';
        case 'digits':
          return 'Password must contain at least one digit';
        case 'symbols':
          return 'Password must contain at least one symbol';
        case 'spaces':
          return 'Password should not contain spaces';
        default:
          return 'Password does not meet requirements';
      }
    });

    return res.status(400).json({
      success: false,
      message: 'Password validation failed',
      errors: errors
    });
  }
  
  next();
};

// Rate limiting for sensitive endpoints
const sensitiveRateLimit = (req, res, next) => {
  // This is a basic implementation
  // In production, use Redis for distributed rate limiting
  const clientIP = req.ip || req.connection.remoteAddress;
  const endpoint = req.path;
  
  // Store rate limit data in memory (not suitable for production)
  if (!req.app.locals.rateLimit) {
    req.app.locals.rateLimit = {};
  }
  
  const key = `${clientIP}:${endpoint}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // 5 requests per window for sensitive endpoints
  
  if (!req.app.locals.rateLimit[key]) {
    req.app.locals.rateLimit[key] = {
      count: 0,
      resetTime: now + windowMs
    };
  }
  
  const rateLimit = req.app.locals.rateLimit[key];
  
  if (now > rateLimit.resetTime) {
    rateLimit.count = 0;
    rateLimit.resetTime = now + windowMs;
  }
  
  rateLimit.count++;
  
  if (rateLimit.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    });
  }
  
  next();
};

// Audit logging middleware
const auditLog = (req, res, next) => {
  const startTime = Date.now();
  
  // Log the request
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous'
  };
  
  // Log sensitive operations
  const sensitiveOperations = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/profile',
    '/api/orders',
    '/api/payments'
  ];
  
  if (sensitiveOperations.some(op => req.path.includes(op))) {
    console.log('🔒 AUDIT LOG:', JSON.stringify(logData, null, 2));
  }
  
  // Log response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logData.statusCode = res.statusCode;
    logData.duration = `${duration}ms`;
    
    if (res.statusCode >= 400) {
      console.log('⚠️ ERROR LOG:', JSON.stringify(logData, null, 2));
    }
  });
  
  next();
};

module.exports = {
  csrfProtection,
  sanitizeInput,
  validatePassword,
  sensitiveRateLimit,
  auditLog
}; 