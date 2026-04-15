import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

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
