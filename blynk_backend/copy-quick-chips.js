const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { nanoid } = require('nanoid');

async function copyQuickChips() {
  const restaurantId = process.argv[2] || 'cmkwgf18c000cuo92gosi8b7b';
  
  console.log('Copying quick chips for restaurant:', restaurantId);
  
  const templateChips = await prisma.quickChip.findMany({
    where: { restaurantId: null },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  
  console.log('Found', templateChips.length, 'template chips');
  
  if (templateChips.length === 0) {
    console.log('No template chips found. Please seed the database first.');
    process.exit(1);
  }
  
  const usedKeysByType = new Map();
  const buildUniqueKey = (type, key) => {
    const normalized = key || `chip-${nanoid(6)}`;
    const used = usedKeysByType.get(type) || new Set();
    let finalKey = normalized;
    let counter = 1;
    while (used.has(finalKey)) {
      finalKey = `${normalized}-${counter}`;
      counter += 1;
    }
    used.add(finalKey);
    usedKeysByType.set(type, used);
    return finalKey;
  };
  
  const buildTemplateKey = (templateKey, icon, labelKo) => {
    const raw = templateKey?.trim();
    const base = raw && raw.length > 0 ? raw : `${icon || ''}-${labelKo || ''}`.trim();
    if (!base) return `chip-${nanoid(6)}`;
    return base.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣\-_.]/g, '') || `chip-${nanoid(6)}`;
  };
  
  const chipsToCreate = templateChips.map((chip) => {
    const key = buildTemplateKey(chip.templateKey, chip.icon, chip.labelKo);
    const uniqueKey = buildUniqueKey(chip.type, key);
    return {
      restaurantId: restaurantId,
      type: chip.type,
      templateKey: uniqueKey,
      icon: chip.icon,
      labelKo: chip.labelKo,
      labelVn: chip.labelVn,
      labelEn: chip.labelEn,
      messageKo: chip.messageKo,
      messageVn: chip.messageVn,
      messageEn: chip.messageEn,
      displayOrder: chip.displayOrder,
      isActive: chip.isActive,
    };
  });
  
  await prisma.quickChip.createMany({ data: chipsToCreate });
  console.log('✅ Created', chipsToCreate.length, 'quick chips for restaurant');
  
  await prisma.$disconnect();
}

copyQuickChips().then(() => process.exit(0)).catch(e => { 
  console.error('❌ Error:', e); 
  process.exit(1); 
});
