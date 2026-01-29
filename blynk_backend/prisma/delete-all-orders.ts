import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Delete all order-related data from the database
 * Run with: tsx prisma/delete-all-orders.ts
 */
async function deleteAllOrders() {
  console.log('🗑️  Starting deletion of all order-related data...');

  try {
    // OrderItemOption will be deleted automatically via cascade when OrderItem is deleted
    // OrderItem will be deleted automatically via cascade when Order is deleted
    
    // 1. Delete all OrderItemOptions (explicit deletion for clarity)
    const deletedOrderItemOptions = await prisma.orderItemOption.deleteMany({});
    console.log(`✅ Deleted ${deletedOrderItemOptions.count} order item options`);

    // 2. Delete all OrderItems
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`✅ Deleted ${deletedOrderItems.count} order items`);

    // 3. Delete all Orders
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✅ Deleted ${deletedOrders.count} orders`);

    console.log('');
    console.log('✅ All order-related data has been deleted successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  - Orders: ${deletedOrders.count}`);
    console.log(`  - Order Items: ${deletedOrderItems.count}`);
    console.log(`  - Order Item Options: ${deletedOrderItemOptions.count}`);
  } catch (error) {
    console.error('❌ Error deleting order data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllOrders()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
