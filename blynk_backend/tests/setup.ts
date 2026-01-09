// Test setup file
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Setup test database if needed
});

afterAll(async () => {
  await prisma.$disconnect();
});
