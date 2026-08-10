// Creates the initial ADMIN login so a fresh deploy has a usable account.
// Idempotent: safe to run on every boot. An existing account keeps its
// password; only the ADMIN role is re-asserted.
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const email = process.env.SEED_ADMIN_EMAIL || 'testuser@example.com';
const password = process.env.SEED_ADMIN_PASSWORD || 'TestUser123!';
const name = process.env.SEED_ADMIN_NAME || 'Test User';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN' },
      create: { name, email, password: await bcrypt.hash(password, 12), role: 'ADMIN' },
    });

    console.log(`Seed: ${existing ? 'kept existing' : 'created'} admin ${user.email}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
