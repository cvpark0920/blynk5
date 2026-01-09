import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create Super Admin User (cvpark0920@gmail.com) - Production account only
  const superAdmin = await prisma.user.upsert({
    where: { email: 'cvpark0920@gmail.com' },
    update: {
      role: 'PLATFORM_ADMIN',
    },
    create: {
      email: 'cvpark0920@gmail.com',
      role: 'PLATFORM_ADMIN',
    },
  });
  console.log('✅ Created super admin user:', superAdmin.email);

  // ⚠️ Test data creation removed - All test accounts, restaurants, tables, menus, and staff are no longer seeded
  // Use the Administrator App to create restaurants and manage staff in production

  // Seed Banks from vietqr_bank.json
  const bankDataPath = path.join(__dirname, '../../Docs/vietqr_bank.json');
  if (fs.existsSync(bankDataPath)) {
    const bankData = JSON.parse(fs.readFileSync(bankDataPath, 'utf-8'));
    if (bankData.data && Array.isArray(bankData.data)) {
      let bankCount = 0;
      for (const bank of bankData.data) {
        await prisma.bank.upsert({
          where: { code: bank.code },
          update: {
            name: bank.name,
            bin: bank.bin,
            shortName: bank.shortName || bank.short_name,
            logo: bank.logo || null,
            transferSupported: bank.transferSupported === 1 || bank.isTransfer === 1,
            lookupSupported: bank.lookupSupported === 1,
            swiftCode: bank.swift_code || null,
          },
          create: {
            name: bank.name,
            code: bank.code,
            bin: bank.bin,
            shortName: bank.shortName || bank.short_name,
            logo: bank.logo || null,
            transferSupported: bank.transferSupported === 1 || bank.isTransfer === 1,
            lookupSupported: bank.lookupSupported === 1,
            swiftCode: bank.swift_code || null,
          },
        });
        bankCount++;
      }
      console.log(`✅ Seeded ${bankCount} banks`);
    }
  } else {
    console.log('⚠️  Bank data file not found, skipping bank seed');
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
