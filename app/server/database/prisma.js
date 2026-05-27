import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({});

export default prisma;

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully via Prisma');
  } catch (err) {
    console.error('CRITICAL: Failed to connect to database:', err);
    throw err;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected');
  } catch (err) {
    console.error('Error disconnecting database:', err);
  }
}
