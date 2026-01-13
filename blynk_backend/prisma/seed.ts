import { PrismaClient, QuickChipType } from '@prisma/client';
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
  // Try multiple possible paths
  const possiblePaths = [
    path.join(__dirname, '../../Docs/vietqr_bank.json'),
    path.join(__dirname, '../../../Docs/vietqr_bank.json'),
    path.join(process.cwd(), 'Docs/vietqr_bank.json'),
  ];
  
  let bankDataPath: string | null = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      bankDataPath = possiblePath;
      break;
    }
  }
  if (bankDataPath && fs.existsSync(bankDataPath)) {
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

  // Seed default Quick Chips (플랫폼 전체 상용구)
  console.log('🌱 Seeding default quick chips...');
  
  const defaultCustomerRequestChips = [
    {
      icon: 'Droplets',
      labelKo: '물 주세요',
      labelVn: 'Cho tôi nước',
      labelEn: 'Water please',
      messageKo: '물 좀 주시겠어요?',
      messageVn: 'Làm ơn cho tôi xin nước lọc.',
      messageEn: 'Can I have some water please?',
      displayOrder: 0,
    },
    {
      icon: 'Utensils',
      labelKo: '수저 주세요',
      labelVn: 'Muỗng đũa',
      labelEn: 'Cutlery please',
      messageKo: '수저 세트 부탁드립니다.',
      messageVn: 'Làm ơn cho tôi xin bộ muỗng đũa.',
      messageEn: 'Can I have a cutlery set please?',
      displayOrder: 1,
    },
    {
      icon: 'ThermometerSnowflake',
      labelKo: '얼음 주세요',
      labelVn: 'Đá lạnh',
      labelEn: 'Ice please',
      messageKo: '얼음 좀 주실 수 있나요?',
      messageVn: 'Cho tôi xin ít đá lạnh.',
      messageEn: 'Can I have some ice please?',
      displayOrder: 2,
    },
    {
      icon: 'FileText',
      labelKo: '메뉴판 주세요',
      labelVn: 'Cho tôi menu',
      labelEn: 'Menu please',
      messageKo: '메뉴판 좀 주시겠어요?',
      messageVn: 'Làm ơn cho tôi xem menu.',
      messageEn: 'Can I see the menu please?',
      displayOrder: 3,
    },
    {
      icon: 'Receipt',
      labelKo: '계산서 주세요',
      labelVn: 'Tính tiền',
      labelEn: 'Bill please',
      messageKo: '계산서 부탁드립니다.',
      messageVn: 'Làm ơn tính tiền cho tôi.',
      messageEn: 'Can I have the bill please?',
      displayOrder: 4,
    },
    {
      icon: 'MapPin',
      labelKo: '화장실 어디인가요?',
      labelVn: 'Nhà vệ sinh ở đâu?',
      labelEn: 'Where is the restroom?',
      messageKo: '화장실이 어디에 있나요?',
      messageVn: 'Nhà vệ sinh ở đâu vậy?',
      messageEn: 'Where is the restroom?',
      displayOrder: 5,
    },
    {
      icon: 'Wifi',
      labelKo: '와이파이 비밀번호',
      labelVn: 'Mật khẩu WiFi',
      labelEn: 'WiFi password',
      messageKo: '와이파이 비밀번호 알려주세요.',
      messageVn: 'Cho tôi biết mật khẩu WiFi.',
      messageEn: 'Can I have the WiFi password?',
      displayOrder: 6,
    },
    {
      icon: 'ThermometerSun',
      labelKo: '음식이 너무 매워요',
      labelVn: 'Món ăn quá cay',
      labelEn: 'Food is too spicy',
      messageKo: '음식이 너무 매워서 좀 덜 매운 걸로 바꿔주세요.',
      messageVn: 'Món ăn quá cay, làm ơn đổi món khác ít cay hơn.',
      messageEn: 'The food is too spicy, can I have something less spicy?',
      displayOrder: 7,
    },
    {
      icon: 'ThermometerSnowflake',
      labelKo: '음식이 너무 차가워요',
      labelVn: 'Món ăn quá lạnh',
      labelEn: 'Food is too cold',
      messageKo: '음식이 너무 차가워서 데워주세요.',
      messageVn: 'Món ăn quá lạnh, làm ơn hâm nóng lại.',
      messageEn: 'The food is too cold, can you heat it up?',
      displayOrder: 8,
    },
    {
      icon: 'Package',
      labelKo: '포장해주세요',
      labelVn: 'Gói mang về',
      labelEn: 'Takeout please',
      messageKo: '포장해주세요.',
      messageVn: 'Làm ơn gói mang về cho tôi.',
      messageEn: 'Can I have this to go?',
      displayOrder: 9,
    },
    {
      icon: 'Leaf',
      labelKo: '고수 빼고',
      labelVn: 'Không rau mùi',
      labelEn: 'No cilantro',
      messageKo: '고수는 빼주세요.',
      messageVn: 'Vui lòng không cho rau mùi.',
      messageEn: 'No cilantro please.',
      displayOrder: 10,
    },
    {
      icon: 'Volume2',
      labelKo: '음악 소리 작게',
      labelVn: 'Nhạc nhỏ lại',
      labelEn: 'Lower the music',
      messageKo: '음악 소리를 좀 작게 해주세요.',
      messageVn: 'Làm ơn giảm nhạc xuống.',
      messageEn: 'Can you turn down the music?',
      displayOrder: 11,
    },
  ];

  const defaultStaffResponseChips = [
    {
      icon: 'CheckCircle',
      labelKo: '네, 알겠습니다',
      labelVn: 'Vâng, tôi hiểu',
      labelEn: 'Yes, understood',
      messageKo: '네, 알겠습니다. 곧 준비해드리겠습니다.',
      messageVn: 'Vâng, tôi hiểu. Sẽ chuẩn bị ngay.',
      messageEn: 'Yes, understood. I will prepare it right away.',
      displayOrder: 0,
    },
    {
      icon: 'Clock',
      labelKo: '잠시만 기다려주세요',
      labelVn: 'Vui lòng đợi một chút',
      labelEn: 'Please wait a moment',
      messageKo: '잠시만 기다려주세요. 곧 가져다 드리겠습니다.',
      messageVn: 'Vui lòng đợi một chút. Sẽ mang đến ngay.',
      messageEn: 'Please wait a moment. I will bring it right away.',
      displayOrder: 1,
    },
    {
      icon: 'ArrowRight',
      labelKo: '곧 가져다 드리겠습니다',
      labelVn: 'Sẽ mang đến ngay',
      labelEn: 'I will bring it right away',
      messageKo: '곧 가져다 드리겠습니다.',
      messageVn: 'Sẽ mang đến ngay.',
      messageEn: 'I will bring it right away.',
      displayOrder: 2,
    },
    {
      icon: 'AlertCircle',
      labelKo: '죄송합니다',
      labelVn: 'Xin lỗi',
      labelEn: 'Sorry',
      messageKo: '죄송합니다. 잠시만 기다려주세요.',
      messageVn: 'Xin lỗi. Vui lòng đợi một chút.',
      messageEn: 'Sorry. Please wait a moment.',
      displayOrder: 3,
    },
    {
      icon: 'Heart',
      labelKo: '감사합니다',
      labelVn: 'Cảm ơn',
      labelEn: 'Thank you',
      messageKo: '감사합니다. 맛있게 드세요.',
      messageVn: 'Cảm ơn. Chúc quý khách ăn ngon miệng.',
      messageEn: 'Thank you. Enjoy your meal.',
      displayOrder: 4,
    },
    {
      icon: 'CheckCircle',
      labelKo: '준비되었습니다',
      labelVn: 'Đã sẵn sàng',
      labelEn: 'Ready',
      messageKo: '준비되었습니다. 가져다 드릴까요?',
      messageVn: 'Đã sẵn sàng. Tôi có thể mang đến không?',
      messageEn: 'It is ready. Can I bring it to you?',
      displayOrder: 5,
    },
  ];

  // Upsert customer request chips
  let customerChipCount = 0;
  for (const chip of defaultCustomerRequestChips) {
    // Check if chip already exists by icon and labelKo
    const existing = await prisma.quickChip.findFirst({
      where: {
        restaurantId: null,
        type: QuickChipType.CUSTOMER_REQUEST,
        icon: chip.icon,
        labelKo: chip.labelKo,
      },
    });

    if (!existing) {
      await prisma.quickChip.create({
        data: {
          restaurantId: null, // 플랫폼 전체
          type: QuickChipType.CUSTOMER_REQUEST,
          icon: chip.icon,
          labelKo: chip.labelKo,
          labelVn: chip.labelVn,
          labelEn: chip.labelEn,
          messageKo: chip.messageKo,
          messageVn: chip.messageVn,
          messageEn: chip.messageEn,
          displayOrder: chip.displayOrder,
          isActive: true,
        },
      });
      customerChipCount++;
    }
  }
  console.log(`✅ Seeded ${customerChipCount} customer request quick chips`);

  // Upsert staff response chips
  let staffChipCount = 0;
  for (const chip of defaultStaffResponseChips) {
    // Check if chip already exists by icon and labelKo
    const existing = await prisma.quickChip.findFirst({
      where: {
        restaurantId: null,
        type: QuickChipType.STAFF_RESPONSE,
        icon: chip.icon,
        labelKo: chip.labelKo,
      },
    });

    if (!existing) {
      await prisma.quickChip.create({
        data: {
          restaurantId: null, // 플랫폼 전체
          type: QuickChipType.STAFF_RESPONSE,
          icon: chip.icon,
          labelKo: chip.labelKo,
          labelVn: chip.labelVn,
          labelEn: chip.labelEn,
          messageKo: chip.messageKo,
          messageVn: chip.messageVn,
          messageEn: chip.messageEn,
          displayOrder: chip.displayOrder,
          isActive: true,
        },
      });
      staffChipCount++;
    }
  }
  console.log(`✅ Seeded ${staffChipCount} staff response quick chips`);

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
