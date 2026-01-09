import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Cleanup script to remove all test seed data
 * Run with: tsx prisma/cleanup-seed-data.ts
 */
async function cleanupSeedData() {
  console.log('🧹 Starting cleanup of seed data...');

  try {
    // 1. Delete test staff members
    const deletedStaff = await prisma.staff.deleteMany({
      where: {
        OR: [
          { email: 'james@restaurant.com' },
          { email: 'alice@restaurant.com' },
        ],
      },
    });
    console.log(`✅ Deleted ${deletedStaff.count} test staff members`);

    // 2. Find test restaurant by QR code
    const testRestaurant = await prisma.restaurant.findUnique({
      where: { qrCode: 'REST001' },
      include: {
        tables: true,
        categories: true,
        staff: true,
        sessions: true,
        orders: true,
        waitingList: true,
      },
    });

    if (testRestaurant) {
      // Delete related data first (cascade will handle most, but we'll be explicit)
      
      // Delete waiting list entries
      const deletedWaitingList = await prisma.waitingList.deleteMany({
        where: { restaurantId: testRestaurant.id },
      });
      console.log(`✅ Deleted ${deletedWaitingList.count} waiting list entries`);

      // Delete orders (cascade will handle order items)
      const deletedOrders = await prisma.order.deleteMany({
        where: { restaurantId: testRestaurant.id },
      });
      console.log(`✅ Deleted ${deletedOrders.count} orders`);

      // Delete sessions (cascade will handle chat messages)
      const deletedSessions = await prisma.session.deleteMany({
        where: { restaurantId: testRestaurant.id },
      });
      console.log(`✅ Deleted ${deletedSessions.count} sessions`);

      // Delete tables
      const deletedTables = await prisma.table.deleteMany({
        where: { restaurantId: testRestaurant.id },
      });
      console.log(`✅ Deleted ${deletedTables.count} tables`);

      // Delete menu items (cascade will handle option groups and options)
      const deletedMenuItems = await prisma.menuItem.deleteMany({
        where: { restaurantId: testRestaurant.id },
      });
      console.log(`✅ Deleted ${deletedMenuItems.count} menu items`);

      // Delete menu categories
      const deletedCategories = await prisma.menuCategory.deleteMany({
        where: { restaurantId: testRestaurant.id },
      });
      console.log(`✅ Deleted ${deletedCategories.count} menu categories`);

      // Delete remaining staff (if any)
      const deletedRemainingStaff = await prisma.staff.deleteMany({
        where: { restaurantId: testRestaurant.id },
      });
      console.log(`✅ Deleted ${deletedRemainingStaff.count} remaining staff members`);

      // Delete the restaurant
      await prisma.restaurant.delete({
        where: { id: testRestaurant.id },
      });
      console.log('✅ Deleted test restaurant (REST001)');
    } else {
      console.log('ℹ️  Test restaurant (REST001) not found');
    }

    // 3. Delete test restaurant owner user
    const deletedOwner = await prisma.user.deleteMany({
      where: { email: 'owner@restaurant.com' },
    });
    console.log(`✅ Deleted ${deletedOwner.count} test restaurant owner user`);

    // 4. Delete legacy admin user (optional - uncomment if needed)
    // const deletedLegacyAdmin = await prisma.user.deleteMany({
    //   where: { email: 'admin@blynk.com' },
    // });
    // console.log(`✅ Deleted ${deletedLegacyAdmin.count} legacy admin user`);

    console.log('🎉 Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

cleanupSeedData()
  .catch((e) => {
    console.error('❌ Cleanup script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
