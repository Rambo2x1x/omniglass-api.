import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Handle graceful shutdown of the database connection
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
