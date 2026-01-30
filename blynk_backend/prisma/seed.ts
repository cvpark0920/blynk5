import { PrismaClient, QuickChipType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const buildTemplateKey = (icon: string, labelKo: string): string => {
  const base = `${icon}-${labelKo}`
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣\-_.]/g, '');
  return base || `chip-${Date.now()}`;
};

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
    { icon: 'Droplets', labelKo: '물 주세요', labelVn: 'Cho tôi nước', labelEn: 'Water please', labelZh: '请给我水', messageKo: '물 좀 주시겠어요?', messageVn: 'Làm ơn cho tôi xin nước lọc.', messageEn: 'Can I have some water please?', messageZh: '请给我一些水。', displayOrder: 0 },
    { icon: 'Utensils', labelKo: '수저 주세요', labelVn: 'Muỗng đũa', labelEn: 'Cutlery please', labelZh: '请给我餐具', messageKo: '수저 세트 부탁드립니다.', messageVn: 'Làm ơn cho tôi xin bộ muỗng đũa.', messageEn: 'Can I have a cutlery set please?', messageZh: '请给我一套餐具。', displayOrder: 1 },
    { icon: 'ThermometerSnowflake', labelKo: '얼음 주세요', labelVn: 'Đá lạnh', labelEn: 'Ice please', labelZh: '请给我冰', messageKo: '얼음 좀 주실 수 있나요?', messageVn: 'Cho tôi xin ít đá lạnh.', messageEn: 'Can I have some ice please?', messageZh: '请给我一些冰块。', displayOrder: 2 },
    { icon: 'FileText', labelKo: '메뉴판 주세요', labelVn: 'Cho tôi menu', labelEn: 'Menu please', labelZh: '请给我菜单', messageKo: '메뉴판 좀 주시겠어요?', messageVn: 'Làm ơn cho tôi xem menu.', messageEn: 'Can I see the menu please?', messageZh: '请给我看一下菜单。', displayOrder: 3 },
    { icon: 'Receipt', labelKo: '계산서 주세요', labelVn: 'Tính tiền', labelEn: 'Bill please', labelZh: '请结账', messageKo: '계산서 부탁드립니다.', messageVn: 'Làm ơn tính tiền cho tôi.', messageEn: 'Can I have the bill please?', messageZh: '请帮我结账。', displayOrder: 4 },
    { icon: 'MapPin', labelKo: '화장실 어디인가요?', labelVn: 'Nhà vệ sinh ở đâu?', labelEn: 'Where is the restroom?', labelZh: '洗手间在哪里？', messageKo: '화장실이 어디에 있나요?', messageVn: 'Nhà vệ sinh ở đâu vậy?', messageEn: 'Where is the restroom?', messageZh: '洗手间在哪里？', displayOrder: 5 },
    { icon: 'Wifi', labelKo: '와이파이 비밀번호', labelVn: 'Mật khẩu WiFi', labelEn: 'WiFi password', labelZh: 'WiFi密码', messageKo: '와이파이 비밀번호 알려주세요.', messageVn: 'Cho tôi biết mật khẩu WiFi.', messageEn: 'Can I have the WiFi password?', messageZh: '请告诉我WiFi密码。', displayOrder: 6 },
    { icon: 'ThermometerSun', labelKo: '음식이 너무 매워요', labelVn: 'Món ăn quá cay', labelEn: 'Food is too spicy', labelZh: '食物太辣', messageKo: '음식이 너무 매워서 좀 덜 매운 걸로 바꿔주세요.', messageVn: 'Món ăn quá cay, làm ơn đổi món khác ít cay hơn.', messageEn: 'The food is too spicy, can I have something less spicy?', messageZh: '食物太辣，请换一份不那么辣的。', displayOrder: 7 },
    { icon: 'ThermometerSnowflake', labelKo: '음식이 너무 차가워요', labelVn: 'Món ăn quá lạnh', labelEn: 'Food is too cold', labelZh: '食物太凉', messageKo: '음식이 너무 차가워서 데워주세요.', messageVn: 'Món ăn quá lạnh, làm ơn hâm nóng lại.', messageEn: 'The food is too cold, can you heat it up?', messageZh: '食物太凉，请加热一下。', displayOrder: 8 },
    { icon: 'Package', labelKo: '포장해주세요', labelVn: 'Gói mang về', labelEn: 'Takeout please', labelZh: '请打包', messageKo: '포장해주세요.', messageVn: 'Làm ơn gói mang về cho tôi.', messageEn: 'Can I have this to go?', messageZh: '请帮我打包。', displayOrder: 9 },
    { icon: 'Leaf', labelKo: '고수 빼고', labelVn: 'Không rau mùi', labelEn: 'No cilantro', labelZh: '不要香菜', messageKo: '고수는 빼주세요.', messageVn: 'Vui lòng không cho rau mùi.', messageEn: 'No cilantro please.', messageZh: '请不要放香菜。', displayOrder: 10 },
    { icon: 'Volume2', labelKo: '음악 소리 작게', labelVn: 'Nhạc nhỏ lại', labelEn: 'Lower the music', labelZh: '音乐小声点', messageKo: '음악 소리를 좀 작게 해주세요.', messageVn: 'Làm ơn giảm nhạc xuống.', messageEn: 'Can you turn down the music?', messageZh: '请把音乐调小一点。', displayOrder: 11 },
    { icon: 'Coffee', labelKo: '커피 주문', labelVn: 'Gọi cà phê', labelEn: 'Order coffee', labelZh: '点咖啡', messageKo: '커피 주문하고 싶어요.', messageVn: 'Tôi muốn gọi cà phê.', messageEn: 'I would like to order coffee.', messageZh: '我想点咖啡。', displayOrder: 12 },
    { icon: 'UtensilsCrossed', labelKo: '추가 주문', labelVn: 'Gọi thêm món', labelEn: 'Additional order', labelZh: '加单', messageKo: '추가로 주문하고 싶어요.', messageVn: 'Tôi muốn gọi thêm món.', messageEn: 'I would like to order more.', messageZh: '我想再加点菜。', displayOrder: 13 },
    { icon: 'ChefHat', labelKo: '요리사 부르기', labelVn: 'Gọi đầu bếp', labelEn: 'Call chef', labelZh: '叫厨师', messageKo: '요리사님 좀 부르실 수 있나요?', messageVn: 'Làm ơn gọi đầu bếp giúp tôi.', messageEn: 'Can you call the chef please?', messageZh: '请帮我叫一下厨师。', displayOrder: 14 },
    { icon: 'Users', labelKo: '직원 부르기', labelVn: 'Gọi nhân viên', labelEn: 'Call staff', labelZh: '叫服务员', messageKo: '직원 좀 부르실 수 있나요?', messageVn: 'Làm ơn gọi nhân viên giúp tôi.', messageEn: 'Can you call a staff member please?', messageZh: '请帮我叫一下服务员。', displayOrder: 15 },
    { icon: 'ShoppingBag', labelKo: '봉투 주세요', labelVn: 'Cho tôi túi', labelEn: 'Bag please', labelZh: '请给我袋子', messageKo: '봉투 좀 주시겠어요?', messageVn: 'Làm ơn cho tôi xin túi.', messageEn: 'Can I have a bag please?', messageZh: '请给我一个袋子。', displayOrder: 16 },
    { icon: 'Napkin', labelKo: '냅킨 주세요', labelVn: 'Cho tôi khăn giấy', labelEn: 'Napkin please', labelZh: '请给我纸巾', messageKo: '냅킨 좀 주시겠어요?', messageVn: 'Làm ơn cho tôi xin khăn giấy.', messageEn: 'Can I have some napkins please?', messageZh: '请给我一些纸巾。', displayOrder: 17 },
    { icon: 'Flame', labelKo: '음식 데워주세요', labelVn: 'Hâm nóng món ăn', labelEn: 'Heat up food', labelZh: '请加热', messageKo: '음식을 데워주세요.', messageVn: 'Làm ơn hâm nóng món ăn.', messageEn: 'Can you heat up the food?', messageZh: '请帮我把食物加热一下。', displayOrder: 18 },
    { icon: 'AlertCircle', labelKo: '문제가 있어요', labelVn: 'Có vấn đề', labelEn: 'There is a problem', labelZh: '有问题', messageKo: '문제가 있어서 도와주세요.', messageVn: 'Có vấn đề, làm ơn giúp tôi.', messageEn: 'There is a problem, can you help?', messageZh: '有问题，请帮忙。', displayOrder: 19 },
    { icon: 'ThumbsUp', labelKo: '맛있어요', labelVn: 'Rất ngon', labelEn: 'Delicious', labelZh: '很好吃', messageKo: '정말 맛있어요!', messageVn: 'Rất ngon!', messageEn: 'Very delicious!', messageZh: '很好吃！', displayOrder: 20 },
    { icon: 'CreditCard', labelKo: '카드 결제', labelVn: 'Thanh toán thẻ', labelEn: 'Card payment', labelZh: '刷卡付款', messageKo: '카드로 결제하고 싶어요.', messageVn: 'Tôi muốn thanh toán bằng thẻ.', messageEn: 'I would like to pay by card.', messageZh: '我想刷卡付款。', displayOrder: 21 },
    { icon: 'Banknote', labelKo: '현금 결제', labelVn: 'Thanh toán tiền mặt', labelEn: 'Cash payment', labelZh: '现金付款', messageKo: '현금으로 결제하고 싶어요.', messageVn: 'Tôi muốn thanh toán bằng tiền mặt.', messageEn: 'I would like to pay by cash.', messageZh: '我想用现金付款。', displayOrder: 22 },
  ];

  const defaultStaffResponseChips = [
    { icon: 'CheckCircle', labelKo: '네, 알겠습니다', labelVn: 'Vâng, tôi hiểu', labelEn: 'Yes, understood', labelZh: '好的，知道了', messageKo: '네, 알겠습니다. 곧 준비해드리겠습니다.', messageVn: 'Vâng, tôi hiểu. Sẽ chuẩn bị ngay.', messageEn: 'Yes, understood. I will prepare it right away.', messageZh: '好的，马上为您准备。', displayOrder: 0 },
    { icon: 'Clock', labelKo: '잠시만 기다려주세요', labelVn: 'Vui lòng đợi một chút', labelEn: 'Please wait a moment', labelZh: '请稍等', messageKo: '잠시만 기다려주세요. 곧 가져다 드리겠습니다.', messageVn: 'Vui lòng đợi một chút. Sẽ mang đến ngay.', messageEn: 'Please wait a moment. I will bring it right away.', messageZh: '请稍等，马上为您送来。', displayOrder: 1 },
    { icon: 'ArrowRight', labelKo: '곧 가져다 드리겠습니다', labelVn: 'Sẽ mang đến ngay', labelEn: 'I will bring it right away', labelZh: '马上送来', messageKo: '곧 가져다 드리겠습니다.', messageVn: 'Sẽ mang đến ngay.', messageEn: 'I will bring it right away.', messageZh: '马上为您送来。', displayOrder: 2 },
    { icon: 'AlertCircle', labelKo: '죄송합니다', labelVn: 'Xin lỗi', labelEn: 'Sorry', labelZh: '抱歉', messageKo: '죄송합니다. 잠시만 기다려주세요.', messageVn: 'Xin lỗi. Vui lòng đợi một chút.', messageEn: 'Sorry. Please wait a moment.', messageZh: '抱歉，请稍等。', displayOrder: 3 },
    { icon: 'Heart', labelKo: '감사합니다', labelVn: 'Cảm ơn', labelEn: 'Thank you', labelZh: '谢谢', messageKo: '감사합니다. 맛있게 드세요.', messageVn: 'Cảm ơn. Chúc quý khách ăn ngon miệng.', messageEn: 'Thank you. Enjoy your meal.', messageZh: '谢谢，请慢用。', displayOrder: 4 },
    { icon: 'CheckCircle', labelKo: '준비되었습니다', labelVn: 'Đã sẵn sàng', labelEn: 'Ready', labelZh: '准备好了', messageKo: '준비되었습니다. 가져다 드릴까요?', messageVn: 'Đã sẵn sàng. Tôi có thể mang đến không?', messageEn: 'It is ready. Can I bring it to you?', messageZh: '准备好了，要现在送过去吗？', displayOrder: 5 },
    { icon: 'Coffee', labelKo: '커피 준비 중', labelVn: 'Đang pha cà phê', labelEn: 'Preparing coffee', labelZh: '正在准备咖啡', messageKo: '커피 준비 중입니다. 잠시만 기다려주세요.', messageVn: 'Đang pha cà phê. Vui lòng đợi một chút.', messageEn: 'Preparing your coffee. Please wait a moment.', messageZh: '正在准备咖啡，请稍等。', displayOrder: 6 },
    { icon: 'UtensilsCrossed', labelKo: '주문 확인했습니다', labelVn: 'Đã xác nhận đơn', labelEn: 'Order confirmed', labelZh: '已确认订单', messageKo: '주문 확인했습니다. 곧 준비해드리겠습니다.', messageVn: 'Đã xác nhận đơn. Sẽ chuẩn bị ngay.', messageEn: 'Order confirmed. I will prepare it right away.', messageZh: '已确认订单，马上为您准备。', displayOrder: 7 },
    { icon: 'Smile', labelKo: '환영합니다', labelVn: 'Chào mừng', labelEn: 'Welcome', labelZh: '欢迎光临', messageKo: '환영합니다. 편하게 이용해주세요.', messageVn: 'Chào mừng quý khách. Vui lòng thoải mái.', messageEn: 'Welcome. Please make yourself comfortable.', messageZh: '欢迎光临，请随意。', displayOrder: 8 },
    { icon: 'ThumbsUp', labelKo: '좋아요', labelVn: 'Tốt', labelEn: 'Good', labelZh: '好的', messageKo: '좋습니다. 바로 준비해드리겠습니다.', messageVn: 'Tốt. Sẽ chuẩn bị ngay.', messageEn: 'Good. I will prepare it right away.', messageZh: '好的，马上为您准备。', displayOrder: 9 },
    { icon: 'Package', labelKo: '포장 준비 중', labelVn: 'Đang đóng gói', labelEn: 'Preparing takeout', labelZh: '正在打包', messageKo: '포장 준비 중입니다. 잠시만 기다려주세요.', messageVn: 'Đang đóng gói. Vui lòng đợi một chút.', messageEn: 'Preparing your takeout. Please wait a moment.', messageZh: '正在打包，请稍等。', displayOrder: 10 },
    { icon: 'CreditCard', labelKo: '결제 준비', labelVn: 'Chuẩn bị thanh toán', labelEn: 'Preparing payment', labelZh: '准备结账', messageKo: '결제 준비해드리겠습니다.', messageVn: 'Sẽ chuẩn bị thanh toán cho quý khách.', messageEn: 'I will prepare the payment for you.', messageZh: '马上为您准备结账。', displayOrder: 11 },
    { icon: 'Receipt', labelKo: '계산서 가져다 드릴게요', labelVn: 'Sẽ mang hóa đơn', labelEn: 'I will bring the bill', labelZh: '马上送账单', messageKo: '계산서 가져다 드리겠습니다.', messageVn: 'Sẽ mang hóa đơn đến ngay.', messageEn: 'I will bring the bill right away.', messageZh: '马上为您送账单。', displayOrder: 12 },
    { icon: 'HelpCircle', labelKo: '도와드릴까요?', labelVn: 'Cần giúp gì không?', labelEn: 'Can I help you?', labelZh: '需要帮忙吗？', messageKo: '무엇을 도와드릴까요?', messageVn: 'Quý khách cần giúp gì không?', messageEn: 'How can I help you?', messageZh: '需要什么帮助？', displayOrder: 13 },
    { icon: 'Star', labelKo: '맛있게 드세요', labelVn: 'Chúc ngon miệng', labelEn: 'Enjoy your meal', labelZh: '请慢用', messageKo: '맛있게 드세요. 추가 주문 있으시면 말씀해주세요.', messageVn: 'Chúc quý khách ngon miệng. Nếu cần gọi thêm món, vui lòng cho biết.', messageEn: 'Enjoy your meal. If you need anything else, please let me know.', messageZh: '请慢用，如需加菜请告诉我。', displayOrder: 14 },
  ];

  // Upsert customer request chips
  let customerChipCount = 0;
  for (const chip of defaultCustomerRequestChips) {
    const templateKey = buildTemplateKey(chip.icon, chip.labelKo);
    // Check if chip already exists by icon and labelKo
    const existing = await prisma.quickChip.findFirst({
      where: {
        restaurantId: null,
        type: QuickChipType.CUSTOMER_REQUEST,
        OR: [
          { templateKey },
          {
            templateKey: null,
            icon: chip.icon,
            labelKo: chip.labelKo,
          },
        ],
      },
    });

    if (!existing) {
      await prisma.quickChip.create({
        data: {
          restaurantId: null, // 플랫폼 전체
          type: QuickChipType.CUSTOMER_REQUEST,
          templateKey,
          icon: chip.icon,
          labelKo: chip.labelKo,
          labelVn: chip.labelVn,
          labelEn: chip.labelEn,
          labelZh: (chip as { labelZh?: string }).labelZh ?? null,
          messageKo: chip.messageKo,
          messageVn: chip.messageVn,
          messageEn: chip.messageEn,
          messageZh: (chip as { messageZh?: string }).messageZh ?? null,
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
    const templateKey = buildTemplateKey(chip.icon, chip.labelKo);
    // Check if chip already exists by icon and labelKo
    const existing = await prisma.quickChip.findFirst({
      where: {
        restaurantId: null,
        type: QuickChipType.STAFF_RESPONSE,
        OR: [
          { templateKey },
          {
            templateKey: null,
            icon: chip.icon,
            labelKo: chip.labelKo,
          },
        ],
      },
    });

    if (!existing) {
      await prisma.quickChip.create({
        data: {
          restaurantId: null, // 플랫폼 전체
          type: QuickChipType.STAFF_RESPONSE,
          templateKey,
          icon: chip.icon,
          labelKo: chip.labelKo,
          labelVn: chip.labelVn,
          labelEn: chip.labelEn,
          labelZh: (chip as { labelZh?: string }).labelZh ?? null,
          messageKo: chip.messageKo,
          messageVn: chip.messageVn,
          messageEn: chip.messageEn,
          messageZh: (chip as { messageZh?: string }).messageZh ?? null,
          displayOrder: chip.displayOrder,
          isActive: true,
        },
      });
      staffChipCount++;
    }
  }
  console.log(`✅ Seeded ${staffChipCount} staff response quick chips`);

  // Backfill zh for existing central template chips (restaurantId=null) that lack labelZh/messageZh
  const allDefaults = [
    ...defaultCustomerRequestChips.map((c) => ({ ...c, type: QuickChipType.CUSTOMER_REQUEST })),
    ...defaultStaffResponseChips.map((c) => ({ ...c, type: QuickChipType.STAFF_RESPONSE })),
  ];
  const existingNullZh = await prisma.quickChip.findMany({
    where: { restaurantId: null, OR: [{ labelZh: null }, { messageZh: null }] },
  });
  let backfillCount = 0;
  for (const row of existingNullZh) {
    const def = allDefaults.find(
      (d) => d.type === row.type && d.icon === row.icon && d.labelKo === row.labelKo
    );
    if (def && ((def as { labelZh?: string }).labelZh || (def as { messageZh?: string }).messageZh)) {
      await prisma.quickChip.update({
        where: { id: row.id },
        data: {
          labelZh: (def as { labelZh?: string }).labelZh ?? row.labelZh,
          messageZh: (def as { messageZh?: string }).messageZh ?? row.messageZh,
        },
      });
      backfillCount++;
    }
  }
  if (backfillCount > 0) {
    console.log(`✅ Backfilled zh for ${backfillCount} existing central template quick chips`);
  }

  // Backfill Chinese fields for existing menu data
  console.log('🌱 Backfilling Chinese fields for existing menu data...');
  
  // Backfill MenuCategory
  const categoriesToUpdate = await prisma.menuCategory.findMany({
    where: { nameZh: null },
  });
  let categoryBackfillCount = 0;
  for (const cat of categoriesToUpdate) {
    const nameZh = cat.nameEn || cat.nameKo;
    if (nameZh) {
      await prisma.menuCategory.update({
        where: { id: cat.id },
        data: { nameZh },
      });
      categoryBackfillCount++;
    }
  }
  if (categoryBackfillCount > 0) {
    console.log(`✅ Backfilled nameZh for ${categoryBackfillCount} menu categories`);
  }

  // Backfill MenuItem
  const itemsToUpdate = await prisma.menuItem.findMany({
    where: { OR: [{ nameZh: null }, { descriptionZh: null }] },
  });
  let itemBackfillCount = 0;
  for (const item of itemsToUpdate) {
    const updates: { nameZh?: string; descriptionZh?: string | null } = {};
    if (!item.nameZh) {
      updates.nameZh = item.nameEn || item.nameKo;
    }
    if (item.descriptionZh === null && (item.descriptionEn || item.descriptionKo)) {
      updates.descriptionZh = item.descriptionEn || item.descriptionKo || null;
    }
    if (Object.keys(updates).length > 0) {
      await prisma.menuItem.update({
        where: { id: item.id },
        data: updates,
      });
      itemBackfillCount++;
    }
  }
  if (itemBackfillCount > 0) {
    console.log(`✅ Backfilled nameZh/descriptionZh for ${itemBackfillCount} menu items`);
  }

  // Backfill MenuOptionGroup
  const optionGroupsToUpdate = await prisma.menuOptionGroup.findMany({
    where: { nameZh: null },
  });
  let optionGroupBackfillCount = 0;
  for (const og of optionGroupsToUpdate) {
    const nameZh = og.nameEn || og.nameKo;
    if (nameZh) {
      await prisma.menuOptionGroup.update({
        where: { id: og.id },
        data: { nameZh },
      });
      optionGroupBackfillCount++;
    }
  }
  if (optionGroupBackfillCount > 0) {
    console.log(`✅ Backfilled nameZh for ${optionGroupBackfillCount} menu option groups`);
  }

  // Backfill MenuOption
  const optionsToUpdate = await prisma.menuOption.findMany({
    where: { nameZh: null },
  });
  let optionBackfillCount = 0;
  for (const opt of optionsToUpdate) {
    const nameZh = opt.nameEn || opt.nameKo;
    if (nameZh) {
      await prisma.menuOption.update({
        where: { id: opt.id },
        data: { nameZh },
      });
      optionBackfillCount++;
    }
  }
  if (optionBackfillCount > 0) {
    console.log(`✅ Backfilled nameZh for ${optionBackfillCount} menu options`);
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
