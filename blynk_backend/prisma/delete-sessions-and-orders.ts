import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Delete all session and order-related data from the database
 * Run with: tsx prisma/delete-sessions-and-orders.ts
 */
async function deleteSessionsAndOrders() {
  console.log('🗑️  Starting deletion of all session and order-related data...');

  try {
    // Delete in order to respect foreign key constraints
    // Note: Some deletions will cascade automatically, but we'll be explicit for clarity

    // 1. Delete ChatReadStatus (references sessions)
    const deletedChatReadStatus = await prisma.chatReadStatus.deleteMany({});
    console.log(`✅ Deleted ${deletedChatReadStatus.count} chat read statuses`);

    // 2. Delete ChatMessages (references sessions, will cascade when sessions are deleted, but we'll delete explicitly)
    const deletedChatMessages = await prisma.chatMessage.deleteMany({});
    console.log(`✅ Deleted ${deletedChatMessages.count} chat messages`);

    // 3. Delete OrderItemOptions (references order items, will cascade when order items are deleted)
    const deletedOrderItemOptions = await prisma.orderItemOption.deleteMany({});
    console.log(`✅ Deleted ${deletedOrderItemOptions.count} order item options`);

    // 4. Delete OrderItems (references orders, will cascade when orders are deleted)
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`✅ Deleted ${deletedOrderItems.count} order items`);

    // 5. Delete Orders (references sessions, will cascade when sessions are deleted)
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✅ Deleted ${deletedOrders.count} orders`);

    // 6. Delete Sessions (this will cascade delete remaining orders and chat messages if any)
    const deletedSessions = await prisma.session.deleteMany({});
    console.log(`✅ Deleted ${deletedSessions.count} sessions`);

    // 7. Update tables to clear currentSessionId
    const updatedTables = await prisma.table.updateMany({
      where: {
        currentSessionId: {
          not: null,
        },
      },
      data: {
        currentSessionId: null,
        status: 'EMPTY',
      },
    });
    console.log(`✅ Updated ${updatedTables.count} tables (cleared currentSessionId and set status to EMPTY)`);

    console.log('');
    console.log('✅ All session and order-related data has been deleted successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  - Sessions: ${deletedSessions.count}`);
    console.log(`  - Orders: ${deletedOrders.count}`);
    console.log(`  - Order Items: ${deletedOrderItems.count}`);
    console.log(`  - Order Item Options: ${deletedOrderItemOptions.count}`);
    console.log(`  - Chat Messages: ${deletedChatMessages.count}`);
    console.log(`  - Chat Read Statuses: ${deletedChatReadStatus.count}`);
    console.log(`  - Tables Updated: ${updatedTables.count}`);
  } catch (error) {
    console.error('❌ Error deleting session and order data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteSessionsAndOrders()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
