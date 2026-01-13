import { Request, Response, NextFunction } from 'express';
import { restaurantService } from '../services/restaurantService';
import { menuService } from '../services/menuService';
import { sessionService } from '../services/sessionService';
import { orderService } from '../services/orderService';
import { tableService } from '../services/tableService';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { VietQR } from 'vietqr';
import { config } from '../config';

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

// Get payment methods for customer (public API, no authentication required)
export const getPaymentMethodsPublic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      throw createError('Restaurant ID is required', 400);
    }

    // Verify restaurant exists and is active
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        status: true,
        settings: true,
      },
    });

    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    if (restaurant.status !== 'active') {
      throw createError('Restaurant is not active', 404);
    }

    // Get payment methods from settings
    const settings = restaurant.settings as any || {};
    const paymentMethods = settings.paymentMethods || {
      cash: { enabled: false },
      card: { enabled: false },
      bankTransfer: {
        enabled: false,
        bankName: '',
        accountHolder: '',
        accountNumber: '',
      },
    };

    // Only return bankTransfer information if enabled
    const response: any = {
      bankTransfer: {
        enabled: paymentMethods.bankTransfer?.enabled || false,
      },
    };

    if (paymentMethods.bankTransfer?.enabled) {
      response.bankTransfer = {
        enabled: true,
        bankName: paymentMethods.bankTransfer.bankName || '',
        accountHolder: paymentMethods.bankTransfer.accountHolder || '',
        accountNumber: paymentMethods.bankTransfer.accountNumber || '',
      };
    }

    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};

// Generate QR code for customer (public API, no authentication required)
export const generateQRCodeForCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId, amount, memo, tableNumber } = req.body;

    if (!restaurantId) {
      throw createError('Restaurant ID is required', 400);
    }

    // Verify restaurant exists and is active
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        status: true,
        settings: true,
      },
    });

    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    if (restaurant.status !== 'active') {
      throw createError('Restaurant is not active', 404);
    }

    // Get payment methods from settings
    const settings = restaurant.settings as any || {};
    const paymentMethods = settings.paymentMethods || {};

    if (!paymentMethods.bankTransfer?.enabled) {
      throw createError('Bank transfer is not enabled for this restaurant', 400);
    }

    const bankTransfer = paymentMethods.bankTransfer;
    if (!bankTransfer.bankName || !bankTransfer.accountNumber || !bankTransfer.accountHolder) {
      throw createError('Bank account information is not configured', 400);
    }

    // Find bank by shortName to get bin code
    const bank = await prisma.bank.findFirst({
      where: {
        shortName: bankTransfer.bankName,
        transferSupported: true,
      },
      select: {
        bin: true,
        code: true,
        shortName: true,
      },
    });

    if (!bank) {
      throw createError(`Bank not found: ${bankTransfer.bankName}`, 404);
    }

    // Validate VietQR credentials
    if (!config.vietqr.clientId || !config.vietqr.apiKey) {
      throw createError('VietQR API credentials are not configured', 500);
    }

    // Initialize VietQR
    const vietQR = new VietQR({
      clientID: config.vietqr.clientId,
      apiKey: config.vietqr.apiKey,
    });

    // Generate memo with table number if provided
    let qrMemo = memo;
    if (tableNumber && !qrMemo) {
      qrMemo = `Table ${tableNumber}`;
    } else if (tableNumber && qrMemo) {
      qrMemo = `${qrMemo} - Table ${tableNumber}`;
    }

    // Generate QR code link
    const qrLinkResponse = await vietQR.genQuickLink({
      bank: bank.bin,
      accountNumber: bankTransfer.accountNumber,
      accountName: bankTransfer.accountHolder,
      amount: amount ? amount.toString() : undefined,
      memo: qrMemo || undefined,
      template: 'KzSd83k',
      media: '.jpg',
    });

    // Handle different response formats from VietQR API
    // genQuickLink may return a string URL or an object with data property
    let qrCodeUrl: string;
    if (typeof qrLinkResponse === 'string') {
      qrCodeUrl = qrLinkResponse;
    } else if (qrLinkResponse && typeof qrLinkResponse === 'object') {
      // Check for common response structures
      if ('data' in qrLinkResponse && typeof qrLinkResponse.data === 'string') {
        qrCodeUrl = qrLinkResponse.data;
      } else if ('qrDataURL' in qrLinkResponse && typeof qrLinkResponse.qrDataURL === 'string') {
        qrCodeUrl = qrLinkResponse.qrDataURL;
      } else if ('data' in qrLinkResponse && qrLinkResponse.data && typeof qrLinkResponse.data === 'object' && 'qrDataURL' in qrLinkResponse.data) {
        qrCodeUrl = (qrLinkResponse.data as any).qrDataURL;
      } else {
        // If it's an object but we can't find the URL, try to stringify or use the whole object
        console.warn('Unexpected QR link response format:', qrLinkResponse);
        throw createError('Unexpected QR code response format', 500);
      }
    } else {
      throw createError('Invalid QR code response', 500);
    }

    res.json({
      success: true,
      data: {
        qrCodeUrl,
        bankName: bankTransfer.bankName,
        accountNumber: bankTransfer.accountNumber,
        accountHolder: bankTransfer.accountHolder,
        amount: amount || null,
      },
    });
  } catch (error: any) {
    console.error('Error generating QR code for customer:', error.message);
    next(createError(error.message || 'Failed to generate QR code', error.statusCode || 500));
  }
};
