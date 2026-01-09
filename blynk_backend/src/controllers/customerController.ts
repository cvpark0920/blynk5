import { Request, Response, NextFunction } from 'express';
import { restaurantService } from '../services/restaurantService';
import { menuService } from '../services/menuService';
import { sessionService } from '../services/sessionService';
import { orderService } from '../services/orderService';
import { tableService } from '../services/tableService';
import { createError } from '../middleware/errorHandler';

export const getRestaurantByQrCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { qrCode } = req.params;
    const restaurant = await restaurantService.getRestaurantByQrCode(qrCode);
    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

export const getMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId } = req.params;
    const menu = await menuService.getMenuByRestaurantId(restaurantId);
    res.json({ success: true, data: menu });
  } catch (error) {
    next(error);
  }
};

export const getTableByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId, tableNumber } = req.params;
    const tableNumberInt = parseInt(tableNumber, 10);

    if (isNaN(tableNumberInt)) {
      throw createError('Invalid table number', 400);
    }

    const table = await tableService.getTableByNumber(restaurantId, tableNumberInt);
    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tableId, restaurantId, guestCount } = req.body;
    
    if (!tableId || !restaurantId) {
      throw createError('Table ID and Restaurant ID are required', 400);
    }

    const session = await sessionService.createSession({
      tableId,
      restaurantId,
      guestCount: guestCount || 1,
    });

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, tableId, restaurantId, items } = req.body;

    if (!sessionId || !tableId || !restaurantId || !items || items.length === 0) {
      throw createError('Session ID, Table ID, Restaurant ID, and items are required', 400);
    }

    const order = await orderService.createOrder({
      sessionId,
      tableId,
      restaurantId,
      items,
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const order = await orderService.getOrderById(orderId);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionService.getSessionById(sessionId);
    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

export const getBill = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionService.getSessionById(sessionId);
    
    const totalAmount = session.orders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      success: true,
      data: {
        session,
        totalAmount,
        orderCount: session.orders.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const completePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, paymentMethod } = req.body;

    if (!sessionId || !paymentMethod) {
      throw createError('Session ID and payment method are required', 400);
    }

    const result = await orderService.completePayment(sessionId, paymentMethod);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
