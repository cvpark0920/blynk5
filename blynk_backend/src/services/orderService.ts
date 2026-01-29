import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { OrderStatus } from '@prisma/client';
import { eventEmitter } from '../sse/eventEmitter';
import { notificationService } from './notificationService';
import { chatService } from './chatService';
import { tableService } from './tableService';

export interface OrderItemInput {
  menuItemId: string;
  quantity: number;
  options?: Array<{
    optionId: string;
    quantity: number;
  }>;
  notes?: string[];
}

export class OrderService {
  async createOrder(data: {
    sessionId: string;
    tableId: string;
    restaurantId: string;
    items: OrderItemInput[];
  }) {
    // Get menu items with prices
    const menuItemIds = data.items.map(item => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId: data.restaurantId,
      },
      include: {
        optionGroups: {
          include: {
            options: true,
          },
        },
      },
    });

    // Calculate total amount
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of data.items) {
      const menuItem = menuItems.find((m: { id: string }) => m.id === item.menuItemId);
      if (!menuItem) {
        throw createError(`Menu item ${item.menuItemId} not found`, 404);
      }

      if (menuItem.isSoldOut) {
        throw createError(`Menu item ${menuItem.nameKo} is sold out`, 400);
      }

      let itemTotal = menuItem.priceVnd * item.quantity;
      const orderItemOptions = [];

      // Calculate option prices
      if (item.options && item.options.length > 0) {
        for (const opt of item.options) {
          const option = menuItem.optionGroups
            .flatMap((og: { options: any[] }) => og.options)
            .find((o: { id: string }) => o.id === opt.optionId);

          if (option) {
            itemTotal += option.priceVnd * opt.quantity;
            orderItemOptions.push({
              optionId: opt.optionId,
              quantity: opt.quantity,
              price: option.priceVnd,
            });
          }
        }
      }

      totalAmount += itemTotal;

      orderItemsData.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.priceVnd,
        totalPrice: itemTotal,
        notes: item.notes || [],
        options: orderItemOptions,
      });
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        sessionId: data.sessionId,
        tableId: data.tableId,
        restaurantId: data.restaurantId,
        status: OrderStatus.PENDING,
        totalAmount,
        items: {
          create: orderItemsData.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
            options: {
              create: item.options.map(opt => ({
                optionId: opt.optionId,
                quantity: opt.quantity,
                price: opt.price,
              })),
            },
          })),
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
            options: {
              include: {
                option: true,
              },
            },
          },
        },
        table: true,
        session: true,
      },
    });
    
    // 디버깅: 주문 생성 시점의 옵션 확인
    console.log(`[OrderService] createOrder - Order ID: ${order.id}`);
    order.items.forEach((item: any, idx: number) => {
      console.log(`[OrderService] createOrder - Item ${idx}:`, {
        id: item.id,
        menuItemId: item.menuItem.id,
        menuItemName: item.menuItem.nameKo,
        optionsLength: item.options?.length || 0,
        options: item.options?.map((opt: any) => ({
          orderItemOptionId: opt.id,
          optionId: opt.option?.id,
          optionName: opt.option?.nameKo,
          price: opt.price,
        })),
      });
    });

    // Update table status to DINING if it's currently ORDERING
    // This ensures the table shows as "식사 중" when orders are placed
    if (order.table.status === 'ORDERING') {
      await tableService.updateTableStatus(data.tableId, 'DINING');
    }

    // Emit SSE event for new order
    console.log(`[OrderService] createOrder - Publishing SSE event for new order`, {
      restaurantId: data.restaurantId,
      orderId: order.id,
      tableId: data.tableId,
      tableNumber: order.table.tableNumber,
      totalAmount,
    });
    await eventEmitter.publishNewOrder(
      data.restaurantId,
      order.id,
      data.tableId,
      order.table.tableNumber,
      order.items.map((item: any) => ({
        id: item.id,
        menuItem: item.menuItem,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
      })),
      totalAmount
    );
    console.log(`[OrderService] createOrder - SSE event published successfully`);

    // Emit SSE event to customer session
    await eventEmitter.publishOrderStatus(data.sessionId, order.id, 'PENDING');

    // Create notification for new order
    const orderNumber = order.id.slice(-3);
    await notificationService.createNotification({
      restaurantId: data.restaurantId,
      type: 'ORDER_NEW',
      titleKo: `새 주문 #${orderNumber}`,
      titleVn: `Đơn hàng mới #${orderNumber}`,
      titleEn: `New Order #${orderNumber}`,
      descriptionKo: `테이블 ${order.table.tableNumber}에서 새 주문`,
      descriptionVn: `Bàn ${order.table.tableNumber} đã đặt đơn hàng mới`,
      descriptionEn: `Table ${order.table.tableNumber} placed a new order`,
      metadata: {
        orderId: order.id,
        tableId: data.tableId,
        tableNumber: order.table.tableNumber,
        totalAmount,
      },
    });

    return order;
  }

  async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: true,
            options: {
              include: {
                option: true,
              },
            },
          },
        },
        table: true,
        session: true,
      },
    });

    if (!order) {
      throw createError('Order not found', 404);
    }

    return order;
  }

  async getOrdersByRestaurant(restaurantId: string, filters?: {
    status?: OrderStatus;
    tableId?: string;
  }) {
    return prisma.order.findMany({
      where: {
        restaurantId,
        ...filters,
      },
      include: {
        items: {
          include: {
            menuItem: true,
            options: {
              include: {
                option: true,
              },
            },
          },
        },
        table: true,
        session: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    // 상태 업데이트
    await prisma.order.update({
      where: { id },
      data: { status },
    });

    // update 후 findUnique로 다시 조회하여 중첩 관계(options.option)가 제대로 로드되도록 함
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: true,
            options: {
              include: {
                option: true,
              },
            },
          },
        },
        table: true,
        session: true,
      },
    });

    if (!order) {
      throw createError('Order not found', 404);
    }

    // Create chat message for order status change (saved to DB)
    const statusMessages = {
      PENDING: {
        ko: '주문이 접수되었습니다.',
        vn: 'Đơn hàng đã được tiếp nhận.',
        en: 'Order has been received.',
      },
      COOKING: {
        ko: '조리를 시작했습니다.',
        vn: 'Đã bắt đầu nấu.',
        en: 'Cooking has started.',
      },
      SERVED: {
        ko: '서빙이 완료되었습니다.',
        vn: 'Đã phục vụ xong.',
        en: 'Order has been served.',
      },
      PAID: {
        ko: '결제가 완료되었습니다.',
        vn: 'Thanh toán đã hoàn tất.',
        en: 'Payment has been completed.',
      },
      CANCELLED: {
        ko: '주문이 취소되었습니다.',
        vn: 'Đơn hàng đã bị hủy.',
        en: 'Order has been cancelled.',
      },
    };

    const statusMessage = statusMessages[status] || statusMessages.PENDING;

    // Prepare order items for SSE event
    const orderItemsForSSE = order.items.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      menuItem: {
        id: item.menuItem.id,
        nameKo: item.menuItem.nameKo,
        nameVn: item.menuItem.nameVn,
        nameEn: item.menuItem.nameEn,
        imageUrl: item.menuItem.imageUrl,
      },
    }));

    // Save order status change message to database with order items details
    // SERVED 상태는 고객에게 알릴 필요 없으므로 채팅 메시지 생성하지 않음
    if (status !== OrderStatus.SERVED) {
      // 디버깅: order.items 구조 확인
      console.log(`[OrderService] updateOrderStatus - Order ID: ${order.id}, Status: ${status}`);
      console.log(`[OrderService] order.items.length: ${order.items.length}`);
      
      const itemsWithOptions = order.items.map((item: any) => {
        // 디버깅: 각 item의 options 확인
        console.log(`[OrderService] Item ${item.id}:`, {
          menuItemId: item.menuItem.id,
          menuItemName: item.menuItem.nameKo,
          optionsLength: item.options?.length || 0,
          options: item.options,
          optionsStructure: item.options?.map((opt: any) => ({
            orderItemOptionId: opt.id,
            optionId: opt.option?.id,
            optionName: opt.option?.nameKo,
            price: opt.price,
            hasOption: !!opt.option,
          })) || [],
        });
        
        const selectedOptions = (item.options && Array.isArray(item.options) && item.options.length > 0)
          ? item.options.map((opt: any) => {
              // 디버깅: opt.option 확인
              if (!opt.option) {
                console.error(`[OrderService] ERROR: opt.option is null/undefined for item ${item.id}, opt:`, opt);
                return null;
              }
              return {
                id: opt.option.id,
                labelKO: opt.option.nameKo,
                labelVN: opt.option.nameVn,
                labelEN: opt.option.nameEn,
                priceVND: opt.price,
              };
            }).filter(Boolean)
          : [];
        
        // 디버깅: selectedOptions 확인
        console.log(`[OrderService] Item ${item.id} selectedOptions:`, selectedOptions);
        
        if (item.options && item.options.length > 0 && selectedOptions.length === 0) {
          console.error(`[OrderService] Warning: item ${item.id} has ${item.options.length} options but selectedOptions is empty`, {
            itemId: item.id,
            menuItemId: item.menuItem.id,
            options: item.options,
            optionsStructure: item.options.map((opt: any) => ({
              orderItemOptionId: opt.id,
              optionId: opt.option?.id,
              optionName: opt.option?.nameKo,
              hasOption: !!opt.option,
            })),
          });
        }
        
        return {
          id: item.id,
          menuItemId: item.menuItem.id,
          nameKO: item.menuItem.nameKo,
          nameVN: item.menuItem.nameVn,
          nameEN: item.menuItem.nameEn,
          imageQuery: item.menuItem.imageUrl || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          selectedOptions,
        };
      });
      
      // 디버깅: 최종 metadata 확인
      console.log(`[OrderService] Final metadata items:`, JSON.stringify(itemsWithOptions, null, 2));
      
      await chatService.createMessage({
        sessionId: order.sessionId,
        senderType: 'STAFF',
        textKo: statusMessage.ko,
        textVn: statusMessage.vn,
        textEn: statusMessage.en,
        messageType: 'TEXT',
        metadata: {
          orderId: order.id,
          orderStatus: status,
          tableNumber: order.table.tableNumber,
          items: itemsWithOptions,
        },
      });
    }

    // Emit SSE events with order items
    await eventEmitter.publishOrderStatusChanged(
      order.restaurantId, 
      order.id, 
      status, 
      orderItemsForSSE,
      order.table.tableNumber
    );
    await eventEmitter.publishOrderStatus(order.sessionId, order.id, status, undefined, orderItemsForSSE);

    return order;
  }

  async completePayment(sessionId: string, paymentMethod: string) {
    // Get session with table information
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        table: true,
        orders: {
          where: {
            status: {
              not: OrderStatus.CANCELLED,
            },
          },
        },
      },
    });

    if (!session) {
      throw createError('Session not found', 404);
    }

    // Update all non-cancelled orders to PAID status
    const orders = await prisma.order.updateMany({
      where: {
        sessionId,
        status: {
          not: OrderStatus.CANCELLED,
        },
      },
      data: {
        status: OrderStatus.PAID,
      },
    });

    // Calculate total amount from all orders
    const totalAmount = session.orders.reduce((sum: number, order: { totalAmount: number }) => sum + order.totalAmount, 0);

    // Create PAYMENT_CONFIRMED notification
    await notificationService.createNotification({
      restaurantId: session.restaurantId,
      type: 'PAYMENT_CONFIRMED',
      titleKo: '결제 완료',
      titleVn: 'Thanh toán hoàn tất',
      titleEn: 'Payment Confirmed',
      descriptionKo: `테이블 ${session.table.tableNumber}에서 ${totalAmount.toLocaleString('vi-VN')}₫ 결제 완료 (${paymentMethod})`,
      descriptionVn: `Bàn ${session.table.tableNumber} đã thanh toán ${totalAmount.toLocaleString('vi-VN')}₫ (${paymentMethod})`,
      descriptionEn: `Table ${session.table.tableNumber} paid ${totalAmount.toLocaleString('vi-VN')}₫ (${paymentMethod})`,
      metadata: {
        sessionId,
        tableId: session.tableId,
        tableNumber: session.table.tableNumber,
        totalAmount,
        paymentMethod,
        orderIds: session.orders.map((o: { id: string }) => o.id),
      },
    });

    // Emit SSE event for payment confirmation
    await eventEmitter.publishPaymentConfirmed(
      session.restaurantId,
      sessionId,
      session.tableId,
      session.table.tableNumber,
      totalAmount,
      paymentMethod
    );

    // Emit order status changed events for each order
    for (const order of session.orders) {
      await eventEmitter.publishOrderStatusChanged(session.restaurantId, order.id, OrderStatus.PAID);
      await eventEmitter.publishOrderStatus(sessionId, order.id, OrderStatus.PAID);
    }

    // Update table status to CLEANING after payment is completed
    // This ensures the table card doesn't show "결제 완료" badge while table is still in DINING status
    if (session.table.status === 'DINING') {
      await tableService.updateTableStatus(session.tableId, 'CLEANING');
    }

    return {
      success: true,
      ordersUpdated: orders.count,
      totalAmount,
    };
  }
}

export const orderService = new OrderService();
