const { PrismaClient } = require('@prisma/client');

// Create a single Prisma client instance with optimized settings
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty',
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  __internal: {
    engine: {
      connectionLimit: 10, // Reduce connection limit
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000, // 30 seconds
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
      },
    },
  },
});

// Handle connection errors
prisma.$on('error', (e) => {
  console.error('Prisma Client error:', e);
});

// Handle beforeExit to close connections properly
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Handle SIGINT to close connections properly
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma; 