import { Request, Response, NextFunction } from 'express';
import { AuthRequest, checkRestaurantAccess } from '../middleware/auth';
import { tableService } from '../services/tableService';
import { orderService } from '../services/orderService';
import { menuService } from '../services/menuService';
import { reportService } from '../services/reportService';
import { sessionService } from '../services/sessionService';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { OrderStatus, WaitingStatus, StaffRole, StaffStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { VietQR } from 'vietqr';
import { config } from '../config';

export const getMyRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const userId = authReq.user.userId;
    const { restaurantId } = req.query; // Get restaurantId from query parameter (from URL)

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // If restaurantId is provided in query, verify access and return that restaurant
    if (restaurantId && typeof restaurantId === 'string') {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
            },
          },
          _count: {
            select: {
              tables: true,
              staff: true,
            },
          },
        },
      });

      if (!restaurant) {
        throw createError('Restaurant not found', 404);
      }

      // Check if user has access
      // 1. Owner of the restaurant (by ownerId)
      // 2. Owner of the restaurant (by email - fallback for data inconsistency)
      // 3. PLATFORM_ADMIN
      // 4. Staff member of the restaurant (PIN login)
      let hasAccess = restaurant.ownerId === userId || user.role === 'PLATFORM_ADMIN';
      
      // Fallback: Check by email if ownerId doesn't match (for data consistency issues)
      // Normalize emails for comparison (case-insensitive, trim whitespace)
      const userEmailNormalized = user.email?.toLowerCase().trim();
      const ownerEmailNormalized = restaurant.owner?.email?.toLowerCase().trim();
      
      if (!hasAccess && restaurant.owner && userEmailNormalized && ownerEmailNormalized) {
        // Check exact match
        if (userEmailNormalized === ownerEmailNormalized) {
          hasAccess = true;
          console.log(`Access granted by email match: ${user.email} is owner of restaurant ${restaurantId}`);
          // Auto-fix: Update restaurant ownerId to current user if emails match
          try {
            await prisma.restaurant.update({
              where: { id: restaurantId },
              data: { ownerId: userId },
            });
            console.log(`Auto-fixed restaurant ownerId: ${restaurantId} now owned by ${userId}`);
          } catch (error) {
            console.error('Failed to auto-fix restaurant ownerId:', error);
          }
        } else {
          // Check if emails are similar (might have typos)
          // Compare email local part (before @) - ignore domain typos
          const userEmailLocal = userEmailNormalized.split('@')[0];
          const ownerEmailLocal = ownerEmailNormalized.split('@')[0];
          if (userEmailLocal === ownerEmailLocal) {
            hasAccess = true;
            console.log(`Access granted by email local match: ${user.email} matches owner ${restaurant.owner.email} for restaurant ${restaurantId}`);
            // Auto-fix: Update restaurant ownerId to current user
            try {
              await prisma.restaurant.update({
                where: { id: restaurantId },
                data: { ownerId: userId },
              });
              console.log(`Auto-fixed restaurant ownerId: ${restaurantId} now owned by ${userId}`);
            } catch (error) {
              console.error('Failed to auto-fix restaurant ownerId:', error);
            }
          }
        }
      }
      
      if (!hasAccess && authReq.user.staffId) {
        // Check if staff member belongs to this restaurant
        const staff = await prisma.staff.findUnique({
          where: { id: authReq.user.staffId },
        });
        if (staff && staff.restaurantId === restaurantId) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        console.log(`Access denied: userId=${userId}, restaurant.ownerId=${restaurant.ownerId}, user.email=${user.email}, restaurant.owner.email=${restaurant.owner?.email}`);
        throw createError('Access denied to this restaurant', 403);
      }

      res.json({ success: true, data: restaurant });
      return;
    }

    // If no restaurantId provided, find restaurant
    // 1. First try to find restaurant where user is owner
    let restaurant = await prisma.restaurant.findFirst({
      where: {
        ownerId: userId,
        status: 'active',
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            tables: true,
            staff: true,
          },
        },
      },
    });

    // 2. If not found and user is staff (PIN login), find restaurant from staff
    if (!restaurant && authReq.user.staffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: authReq.user.staffId },
        include: {
          restaurant: {
            include: {
              owner: {
                select: {
                  id: true,
                  email: true,
                },
              },
              _count: {
                select: {
                  tables: true,
                  staff: true,
                },
              },
            },
          },
        },
      });
      
      if (staff && staff.restaurant) {
        restaurant = staff.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found for this user', 404);
    }

    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

export const getTables = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get restaurant ID from user (assuming staff has restaurantId in token or need to fetch)
    // For now, we'll get it from query param
    const { restaurantId } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const tables = await tableService.getTablesByRestaurant(restaurantId);
    res.json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
};

export const updateTableStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tableId } = req.params;
    const { status } = req.body;

    if (!status) {
      throw createError('Status is required', 400);
    }

    const table = await tableService.updateTableStatus(tableId, status as any);
    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

export const resetTable = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { tableId } = req.params;
    const userId = authReq.user.userId;

    // Get table to check restaurant access
    const table = await tableService.getTableById(tableId);
    const restaurantId = table.restaurantId;

    // Check if user is restaurant owner
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        owner: true,
      },
    });

    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    const isOwner = restaurant.ownerId === userId;

    // If not owner, check if user is staff with OWNER or MANAGER role
    let staffMember = null;
    if (!isOwner) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: [StaffRole.OWNER, StaffRole.MANAGER] },
            status: StaffStatus.ACTIVE,
          },
        });
      }

      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember && user.email) {
        staffMember = await prisma.staff.findFirst({
          where: {
            restaurantId,
            email: user.email,
            status: StaffStatus.ACTIVE,
            role: { in: [StaffRole.OWNER, StaffRole.MANAGER] },
          },
        });
      }
    }

    // Check access (only OWNER and MANAGER can reset tables)
    const hasAccess = isOwner || (staffMember && (staffMember.role === StaffRole.OWNER || staffMember.role === StaffRole.MANAGER));

    if (!hasAccess) {
      throw createError('Only owners and managers can reset tables', 403);
    }

    const resetTable = await tableService.resetTableToEmpty(tableId);
    res.json({ success: true, data: resetTable });
  } catch (error) {
    next(error);
  }
};

export const createTable = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId } = req.query;
    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const userId = authReq.user.userId;

    // Check if user is restaurant owner
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember && user.email) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found or access denied', 404);
    }

    // Check access (only OWNER and MANAGER can manage tables)
    const isOwner = restaurant.ownerId === userId;
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));

    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can manage tables', 403);
    }

    const { tableNumber, floor, capacity } = req.body;

    if (!tableNumber || typeof tableNumber !== 'number') {
      throw createError('Table number is required', 400);
    }

    if (!floor || typeof floor !== 'number' || floor < 1) {
      throw createError('Floor must be at least 1', 400);
    }

    if (!capacity || typeof capacity !== 'number' || capacity < 1) {
      throw createError('Capacity must be at least 1', 400);
    }

    // Check for duplicate table number in the same restaurant
    const existingTable = await prisma.table.findFirst({
      where: {
        restaurantId,
        tableNumber,
      },
    });

    if (existingTable) {
      throw createError('Table number already exists', 400);
    }

    // Generate QR code
    const qrCode = nanoid(10);

    const table = await tableService.createTable({
      restaurantId,
      tableNumber,
      floor,
      capacity,
      qrCode,
    });

    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

export const updateTable = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { tableId } = req.params;
    const { restaurantId } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const userId = authReq.user.userId;

    // Check if user is restaurant owner
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember && user.email) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found or access denied', 404);
    }

    // Check access (only OWNER and MANAGER can manage tables)
    const isOwner = restaurant.ownerId === userId;
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));

    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can manage tables', 403);
    }

    // Verify table belongs to restaurant
    const existingTable = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId,
      },
    });

    if (!existingTable) {
      throw createError('Table not found', 404);
    }

    const { tableNumber, floor, capacity } = req.body;

    // Check for duplicate table number if tableNumber is being updated
    if (tableNumber !== undefined && tableNumber !== existingTable.tableNumber) {
      const duplicateTable = await prisma.table.findFirst({
        where: {
          restaurantId,
          tableNumber,
          id: { not: tableId },
        },
      });

      if (duplicateTable) {
        throw createError('Table number already exists', 400);
      }
    }

    const updateData: { tableNumber?: number; floor?: number; capacity?: number } = {};
    if (tableNumber !== undefined) updateData.tableNumber = tableNumber;
    if (floor !== undefined) {
      if (floor < 1) {
        throw createError('Floor must be at least 1', 400);
      }
      updateData.floor = floor;
    }
    if (capacity !== undefined) {
      if (capacity < 1) {
        throw createError('Capacity must be at least 1', 400);
      }
      updateData.capacity = capacity;
    }

    const table = await tableService.updateTable(tableId, updateData);
    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

export const deleteTable = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { tableId } = req.params;
    const { restaurantId } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const userId = authReq.user.userId;

    // Check if user is restaurant owner
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember && user.email) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found or access denied', 404);
    }

    // Check access (only OWNER and MANAGER can manage tables)
    const isOwner = restaurant.ownerId === userId;
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));

    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can manage tables', 403);
    }

    // Verify table belongs to restaurant
    const existingTable = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId,
      },
    });

    if (!existingTable) {
      throw createError('Table not found', 404);
    }

    // Check if table status is not EMPTY
    if (existingTable.status !== 'EMPTY') {
      throw createError('Cannot delete table that is not empty', 400);
    }

    await tableService.deleteTable(tableId);
    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId, status, tableId } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const filters: any = {};
    if (status) filters.status = status as OrderStatus;
    if (tableId) filters.tableId = tableId as string;

    const orders = await orderService.getOrdersByRestaurant(restaurantId, filters);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      throw createError('Status is required', 400);
    }

    const order = await orderService.updateOrderStatus(orderId, status as OrderStatus);
    res.json({ success: true, data: order });
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
    const { restaurantId } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const menu = await menuService.getMenuByRestaurantId(restaurantId);
    res.json({ success: true, data: menu });
  } catch (error) {
    next(error);
  }
};

export const createMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId } = req.query;
    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const userId = authReq.user.userId;

    // Check if user is restaurant owner
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember && user.email) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found or access denied', 404);
    }

    // Check access (only OWNER and MANAGER can manage menu items)
    const isOwner = restaurant.ownerId === userId;
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));

    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can manage menu items', 403);
    }

    const menuItem = await menuService.createMenuItem({
      ...req.body,
      restaurantId,
    });
    res.status(201).json({ success: true, data: menuItem });
  } catch (error) {
    next(error);
  }
};

export const updateMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { itemId } = req.params;
    const { restaurantId } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const userId = authReq.user.userId;
    console.log('[updateMenuItem] Request:', { itemId, restaurantId, userId, staffId: authReq.user.staffId, email: authReq.user.email });

    // Check if user is restaurant owner
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      console.log('[updateMenuItem] User not found:', userId);
      throw createError('User not found', 404);
    }

    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    console.log('[updateMenuItem] Owner check:', { 
      isOwner: !!restaurant, 
      ownedRestaurants: user.ownedRestaurants.map(r => r.id),
      requestedRestaurantId: restaurantId 
    });

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
        console.log('[updateMenuItem] Staff check by staffId:', { 
          staffId: authReq.user.staffId, 
          found: !!staffMember,
          role: staffMember?.role 
        });
      }

      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember && user.email) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
        console.log('[updateMenuItem] Staff check by email:', { 
          email: user.email, 
          found: !!staffMember,
          role: staffMember?.role 
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      console.log('[updateMenuItem] Restaurant access denied:', { 
        userId, 
        restaurantId, 
        staffId: authReq.user.staffId,
        userEmail: user.email 
      });
      throw createError('Restaurant not found or access denied', 404);
    }

    // Check access (only OWNER and MANAGER can manage menu items)
    const isOwner = restaurant.ownerId === userId;
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));

    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can manage menu items', 403);
    }

    // Verify menu item belongs to restaurant
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        restaurantId,
      },
    });

    if (!menuItem) {
      throw createError('Menu item not found', 404);
    }

    const updatedMenuItem = await menuService.updateMenuItem(itemId, req.body);
    res.json({ success: true, data: updatedMenuItem });
  } catch (error) {
    next(error);
  }
};

export const deleteMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { itemId } = req.params;
    const { restaurantId } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const userId = authReq.user.userId;

    // Check if user is restaurant owner
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember && user.email) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found or access denied', 404);
    }

    // Check access (only OWNER and MANAGER can manage menu items)
    const isOwner = restaurant.ownerId === userId;
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));

    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can manage menu items', 403);
    }

    // Verify menu item belongs to restaurant
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        restaurantId,
      },
    });

    if (!menuItem) {
      throw createError('Menu item not found', 404);
    }

    await menuService.deleteMenuItem(itemId);
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId } = req.query;
    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const userId = authReq.user.userId;

    // Check if user is restaurant owner
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember && user.email) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found or access denied', 404);
    }

    // Check access (only OWNER and MANAGER can manage categories)
    const isOwner = restaurant.ownerId === userId;
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));

    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can manage categories', 403);
    }

    const { nameKo, nameVn, nameEn, displayOrder } = req.body;

    if (!nameKo || !nameVn) {
      throw createError('Name (Korean and Vietnamese) is required', 400);
    }

    const category = await menuService.createCategory({
      restaurantId,
      nameKo,
      nameVn,
      nameEn,
      displayOrder: displayOrder || 0,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { categoryId } = req.params;
    const { restaurantId } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const userId = authReq.user.userId;

    // Check if user is restaurant owner
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember && user.email) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found or access denied', 404);
    }

    // Check access (only OWNER and MANAGER can manage categories)
    const isOwner = restaurant.ownerId === userId;
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));

    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can manage categories', 403);
    }

    // Verify category belongs to restaurant
    const category = await prisma.menuCategory.findFirst({
      where: {
        id: categoryId,
        restaurantId,
      },
    });

    if (!category) {
      throw createError('Category not found', 404);
    }

    const updatedCategory = await menuService.updateCategory(categoryId, req.body);
    res.json({ success: true, data: updatedCategory });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { categoryId } = req.params;
    const { restaurantId } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const userId = authReq.user.userId;

    // Check if user is restaurant owner
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember && user.email) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found or access denied', 404);
    }

    // Check access (only OWNER and MANAGER can manage categories)
    const isOwner = restaurant.ownerId === userId;
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));

    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can manage categories', 403);
    }

    // Verify category belongs to restaurant
    const category = await prisma.menuCategory.findFirst({
      where: {
        id: categoryId,
        restaurantId,
      },
      include: {
        menuItems: true,
      },
    });

    if (!category) {
      throw createError('Category not found', 404);
    }

    // Check if category has menu items
    if (category.menuItems.length > 0) {
      throw createError('Cannot delete category with menu items', 400);
    }

    await menuService.deleteCategory(categoryId);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getWaitingList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const waitingList = await prisma.waitingList.findMany({
      where: { restaurantId },
      orderBy: { timestamp: 'asc' },
    });

    res.json({ success: true, data: waitingList });
  } catch (error) {
    next(error);
  }
};

export const addToWaitingList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId, name, phone, guestCount, note } = req.body;

    if (!restaurantId || !name || !phone) {
      throw createError('Restaurant ID, name, and phone are required', 400);
    }

    const waitingEntry = await prisma.waitingList.create({
      data: {
        restaurantId,
        name,
        phone,
        guestCount: guestCount || 1,
        note,
        status: WaitingStatus.WAITING,
      },
    });

    res.status(201).json({ success: true, data: waitingEntry });
  } catch (error) {
    next(error);
  }
};

export const updateWaitingListStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw createError('Status is required', 400);
    }

    const waitingEntry = await prisma.waitingList.update({
      where: { id },
      data: { status: status as WaitingStatus },
    });

    res.json({ success: true, data: waitingEntry });
  } catch (error) {
    next(error);
  }
};

// Get staff list for PIN login (OWNER/MANAGER only)
export const getStaffList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId } = req.params;

    if (!restaurantId) {
      throw createError('Restaurant ID is required', 400);
    }

    const userId = authReq.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Check if user is restaurant owner
    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }
      
      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found for this user', 404);
    }

    // Check access (only OWNER and MANAGER can view staff list)
    // If user is restaurant owner, allow access
    const isOwner = restaurant.ownerId === userId;
    
    // If not owner, check if staffMember has OWNER or MANAGER role
    // (staffMember was already found above if user is staff)
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));
    
    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can view staff list', 403);
    }

    // Get all staff list (without PIN hash)
    const staffList = await prisma.staff.findMany({
      where: {
        restaurantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        phone: true,
        joinedAt: true,
        createdAt: true,
        pinCodeHash: true, // Include to check if PIN is set
        // PIN hash value is excluded from response for security
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Map to include hasPin flag without exposing the hash
    const staffListWithPinStatus = staffList.map(staff => ({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      status: staff.status,
      avatarUrl: staff.avatarUrl,
      phone: staff.phone,
      joinedAt: staff.joinedAt,
      createdAt: staff.createdAt,
      hasPin: !!staff.pinCodeHash, // Indicate if PIN is set without exposing the hash
    }));

    res.json({ success: true, data: staffListWithPinStatus });
  } catch (error) {
    next(error);
  }
};

// Set staff PIN (OWNER/MANAGER only)
export const setStaffPin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId, staffId } = req.params;
    const { pinCode } = req.body;

    if (!restaurantId || !staffId || !pinCode) {
      throw createError('Restaurant ID, Staff ID, and PIN code are required', 400);
    }

    if (typeof pinCode !== 'string' || pinCode.length < 4) {
      throw createError('PIN code must be at least 4 characters', 400);
    }

    // Check if user has access (OWNER or MANAGER)
    const access = await checkRestaurantAccess(authReq.user.userId, restaurantId);
    if (!access.hasAccess) {
      throw createError('Insufficient permissions', 403);
    }

    // Verify staff belongs to restaurant
    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,
        restaurantId,
      },
    });

    if (!staff) {
      throw createError('Staff not found', 404);
    }

    // Hash PIN
    const pinHash = await bcrypt.hash(pinCode, 10);

    // Update staff PIN
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: { pinCodeHash: pinHash },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        // PIN hash is excluded
      },
    });

    res.json({ success: true, data: updatedStaff });
  } catch (error) {
    next(error);
  }
};

// Set POS PIN (OWNER/MANAGER only)
export const setPosPin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId } = req.params;
    const { pinCode } = req.body;

    if (!restaurantId || !pinCode) {
      throw createError('Restaurant ID and PIN code are required', 400);
    }

    if (typeof pinCode !== 'string' || pinCode.length < 4) {
      throw createError('PIN code must be at least 4 characters', 400);
    }

    // Check if user has access (OWNER or MANAGER)
    const access = await checkRestaurantAccess(authReq.user.userId, restaurantId);
    if (!access.hasAccess) {
      throw createError('Insufficient permissions', 403);
    }

    // Hash PIN
    const posPinHash = await bcrypt.hash(pinCode, 10);

    // Update restaurant POS PIN
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { posPinHash },
      select: {
        id: true,
        nameKo: true,
        nameVn: true,
        // PIN hash is excluded
      },
    });

    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

// Create staff (OWNER/MANAGER only)
export const createStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId } = req.params;
    const { name, email, role, pinCode, phone, avatarUrl } = req.body;

    if (!restaurantId || !name) {
      throw createError('Restaurant ID and name are required', 400);
    }

    const validRoles = [StaffRole.MANAGER, StaffRole.KITCHEN, StaffRole.HALL];
    if (!role || !validRoles.includes(role)) {
      throw createError('Invalid role. Must be MANAGER, KITCHEN, or HALL', 400);
    }

    const access = await checkRestaurantAccess(authReq.user.userId, restaurantId);
    if (!access.hasAccess) {
      throw createError('Insufficient permissions', 403);
    }

    // Check if email already exists for this restaurant (only if email is provided)
    if (email) {
      const existingStaff = await prisma.staff.findFirst({
        where: { restaurantId, email },
      });

      if (existingStaff) {
        throw createError('Staff with this email already exists', 400);
      }
    }

    let pinCodeHash: string | undefined;
    if (pinCode) {
      if (typeof pinCode !== 'string' || pinCode.length < 4) {
        throw createError('PIN code must be at least 4 characters', 400);
      }
      pinCodeHash = await bcrypt.hash(pinCode, 10);
    }

    const staff = await prisma.staff.create({
      data: {
        restaurantId,
        name,
        email: email || null,
        role: role as StaffRole,
        phone: phone || null,
        avatarUrl: avatarUrl || null,
        pinCodeHash,
        status: StaffStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        phone: true,
        status: true,
        joinedAt: true,
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

export const updateStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId, staffId } = req.params;
    const { name, email, role, pinCode, phone, avatarUrl, status } = req.body;

    if (!restaurantId || !staffId) {
      throw createError('Restaurant ID and Staff ID are required', 400);
    }

    const access = await checkRestaurantAccess(authReq.user.userId, restaurantId);
    if (!access.hasAccess) {
      throw createError('Insufficient permissions', 403);
    }

    const existingStaff = await prisma.staff.findFirst({
      where: { id: staffId, restaurantId },
    });

    if (!existingStaff) {
      throw createError('Staff not found', 404);
    }

    if (role) {
      const validRoles = [StaffRole.MANAGER, StaffRole.KITCHEN, StaffRole.HALL];
      if (!validRoles.includes(role)) {
        throw createError('Invalid role. Must be MANAGER, KITCHEN, or HALL', 400);
      }
    }

    if (email && email !== existingStaff.email) {
      const emailExists = await prisma.staff.findFirst({
        where: { restaurantId, email, id: { not: staffId } },
      });
      if (emailExists) {
        throw createError('Staff with this email already exists', 400);
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone || null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
    if (status !== undefined) updateData.status = status;

    if (pinCode) {
      if (typeof pinCode !== 'string' || pinCode.length < 4) {
        throw createError('PIN code must be at least 4 characters', 400);
      }
      updateData.pinCodeHash = await bcrypt.hash(pinCode, 10);
    }

    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        phone: true,
        status: true,
        joinedAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: updatedStaff });
  } catch (error) {
    next(error);
  }
};

export const getPaymentMethods = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const userId = authReq.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Check if user is restaurant owner
    let restaurant = user.ownedRestaurants[0];

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      let staffMember = null;
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }
      
      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found for this user', 404);
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

    res.json({ success: true, data: paymentMethods });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentMethods = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const userId = authReq.user.userId;
    const { paymentMethods } = req.body;

    if (!paymentMethods) {
      throw createError('Payment methods data is required', 400);
    }

    // Validate payment methods structure
    if (
      typeof paymentMethods.cash?.enabled !== 'boolean' ||
      typeof paymentMethods.card?.enabled !== 'boolean' ||
      typeof paymentMethods.bankTransfer?.enabled !== 'boolean'
    ) {
      throw createError('Invalid payment methods structure', 400);
    }

    // If bank transfer is enabled, validate required fields
    if (paymentMethods.bankTransfer.enabled) {
      if (
        !paymentMethods.bankTransfer.bankName ||
        !paymentMethods.bankTransfer.accountHolder ||
        !paymentMethods.bankTransfer.accountNumber
      ) {
        throw createError(
          'Bank name, account holder, and account number are required when bank transfer is enabled',
          400
        );
      }
    }

    // Find restaurant where user is owner or manager
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Check if user is restaurant owner
    let restaurant = user.ownedRestaurants[0];
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }
      
      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found for this user', 404);
    }

    // Check access (only OWNER and MANAGER can update)
    // If user is restaurant owner, allow access
    const isOwner = restaurant.ownerId === userId;
    
    // If not owner, check if staffMember has OWNER or MANAGER role
    // (staffMember was already found above if user is staff)
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));
    
    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can update payment methods', 403);
    }

    // Update settings with payment methods
    const settings = (restaurant.settings as any) || {};
    const updatedSettings = {
      ...settings,
      paymentMethods,
    };

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        settings: updatedSettings,
      },
    });

    res.json({
      success: true,
      data: updatedSettings.paymentMethods,
    });
  } catch (error) {
    next(error);
  }
};

// Generate QR code for bank transfer using VietQR API
export const generateQRCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { bankId, accountNo, accountName, amount, memo } = req.body;

    if (!bankId || !accountNo) {
      throw createError('Bank ID and Account Number are required', 400);
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

    // Generate QR code link
    // Note: VietQR genQuickLink URL format: https://api.vietqr.io/{bank}/{accountNumber}/{template}.{media}?accountName={name}&amount={amount}
    // Ensure accountNumber doesn't have trailing slashes or special characters
    const cleanAccountNo = accountNo.trim().replace(/\/+/g, '');
    
    console.log('Generating QR with params:', {
      bank: bankId,
      accountNumber: cleanAccountNo,
      accountName: accountName || undefined,
      amount: amount !== undefined && amount !== null ? amount.toString() : undefined,
      memo: memo || undefined,
      rawAmount: amount,
      amountType: typeof amount,
    });
    
    const qrLinkResponse = await vietQR.genQuickLink({
      bank: bankId,
      accountNumber: cleanAccountNo,
      accountName: accountName || undefined,
      amount: amount ? amount.toString() : undefined,
      memo: memo || undefined,
      template: 'KzSd83k',
      media: '.jpg',
    });

    // Debug: Log the raw response from VietQR API
    console.log('VietQR genQuickLink raw response:', {
      type: typeof qrLinkResponse,
      value: qrLinkResponse,
      stringified: JSON.stringify(qrLinkResponse, null, 2),
    });

    // Handle different response formats from VietQR API
    // genQuickLink may return a string URL or an object with data property
    let qrCodeUrl: string;
    
    // Helper function to fix URL format (remove extra slashes after accountNumber)
    const fixQRUrl = (url: string): string => {
      // Fix URL format: replace /// or // with / after accountNumber
      // Pattern: https://api.vietqr.io/970424/700033260211///KzSd83k.jpg?accountName=... 
      // -> https://api.vietqr.io/970424/700033260211/KzSd83k.jpg?accountName=...
      // The issue is that VietQR API includes extra slashes when memo is empty or undefined
      
      // Match pattern: /{bank}/{accountNumber}/{multiple slashes}{template}.jpg{query string}
      // Example: /970424/700033260211///KzSd83k.jpg?accountName=IM+ILSOON
      const pattern = /(https?:\/\/api\.vietqr\.io\/\d+\/\d+\/)(\/{2,})([^\/\?]+\.jpg)/;
      const match = url.match(pattern);
      
      if (match) {
        // Replace multiple slashes (2 or more) with single slash
        const fixed = url.replace(pattern, '$1/$3');
        console.log('URL fix applied:', { 
          original: url, 
          fixed, 
          matched: match[0],
          before: match[1],
          slashes: match[2],
          after: match[3]
        });
        return fixed;
      } else {
        // Fallback: try simpler pattern without full domain
        const simplePattern = /(\/\d+\/\d+\/)(\/{2,})([^\/\?]+\.jpg)/;
        if (simplePattern.test(url)) {
          const fixed = url.replace(simplePattern, '$1/$3');
          console.log('URL fix applied (simple pattern):', { original: url, fixed });
          return fixed;
        }
        console.log('URL fix: no pattern matched, returning original', { url });
        return url;
      }
    };
    
    if (typeof qrLinkResponse === 'string') {
      qrCodeUrl = fixQRUrl(qrLinkResponse);
      console.log('QR code URL (string, after fix):', qrCodeUrl);
    } else if (qrLinkResponse && typeof qrLinkResponse === 'object') {
      // Check for common response structures
      if ('data' in qrLinkResponse && typeof qrLinkResponse.data === 'string') {
        qrCodeUrl = fixQRUrl(qrLinkResponse.data);
        console.log('QR code URL (data.data, after fix):', qrCodeUrl);
      } else if ('qrDataURL' in qrLinkResponse && typeof qrLinkResponse.qrDataURL === 'string') {
        qrCodeUrl = fixQRUrl(qrLinkResponse.qrDataURL);
        console.log('QR code URL (qrDataURL, after fix):', qrCodeUrl);
      } else if ('data' in qrLinkResponse && qrLinkResponse.data && typeof qrLinkResponse.data === 'object' && 'qrDataURL' in qrLinkResponse.data) {
        qrCodeUrl = fixQRUrl((qrLinkResponse.data as any).qrDataURL);
        console.log('QR code URL (data.qrDataURL, after fix):', qrCodeUrl);
      } else {
        // If it's an object but we can't find the URL, log and throw error
        console.error('Unexpected QR link response format:', {
          response: qrLinkResponse,
          keys: Object.keys(qrLinkResponse),
          stringified: JSON.stringify(qrLinkResponse, null, 2),
        });
        throw createError('Unexpected QR code response format', 500);
      }
    } else {
      console.error('Invalid QR code response type:', typeof qrLinkResponse);
      throw createError('Invalid QR code response', 500);
    }

    // Validate that we have a valid URL
    if (!qrCodeUrl || (!qrCodeUrl.startsWith('http://') && !qrCodeUrl.startsWith('https://') && !qrCodeUrl.startsWith('data:'))) {
      console.error('Invalid QR code URL format:', qrCodeUrl);
      throw createError('Invalid QR code URL format', 500);
    }

    console.log('Final QR code URL:', qrCodeUrl);

    res.json({
      success: true,
      data: qrCodeUrl,
    });
  } catch (error: any) {
    console.error('Error generating QR code:', error.message);
    next(createError('Failed to generate QR code', 500));
  }
};

export const deleteStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId, staffId } = req.params;
    if (!restaurantId || !staffId) {
      throw createError('Restaurant ID and Staff ID are required', 400);
    }

    const access = await checkRestaurantAccess(authReq.user.userId, restaurantId);
    if (!access.hasAccess) {
      throw createError('Insufficient permissions', 403);
    }

    const staff = await prisma.staff.findFirst({
      where: { id: staffId, restaurantId },
    });

    if (!staff) {
      throw createError('Staff not found', 404);
    }

    if (staff.role === StaffRole.OWNER) {
      throw createError('Cannot delete OWNER role', 403);
    }

    await prisma.staff.delete({ where: { id: staffId } });
    res.json({ success: true, data: { message: 'Staff deleted successfully' } });
  } catch (error) {
    next(error);
  }
};

// Get sales report (OWNER/MANAGER only)
export const getSalesReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const userId = authReq.user.userId;
    const { restaurantId, period, language, startDate, endDate } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const validPeriod = (period === 'today' || period === 'week' || period === 'month') 
      ? period 
      : 'today';
    const validLanguage = (language === 'ko' || language === 'vn' || language === 'en')
      ? language
      : 'ko';
    
    // Validate date format if provided
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;
    
    if (startDate && typeof startDate === 'string') {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw createError('Invalid startDate format. Use YYYY-MM-DD', 400);
      }
    }
    
    if (endDate && typeof endDate === 'string') {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw createError('Invalid endDate format. Use YYYY-MM-DD', 400);
      }
    }
    
    // Validate date range
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      throw createError('startDate must be before or equal to endDate', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Check if user is restaurant owner
    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }
      
      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found for this user', 404);
    }

    // Check access (only OWNER and MANAGER can view reports)
    const isOwner = restaurant.ownerId === userId;
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));
    
    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can view reports', 403);
    }

    // Get sales report
    const report = await reportService.getSalesReport(
      restaurantId, 
      validPeriod, 
      validLanguage,
      parsedStartDate,
      parsedEndDate
    );

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// Get sales history (detailed order list) (OWNER/MANAGER only)
export const getSalesHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const userId = authReq.user.userId;
    const { restaurantId, period, language, startDate, endDate } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    const validPeriod = (period === 'today' || period === 'week' || period === 'month') 
      ? period 
      : 'today';
    const validLanguage = (language === 'ko' || language === 'vn' || language === 'en')
      ? language
      : 'ko';
    
    // Validate date format if provided
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;
    
    if (startDate && typeof startDate === 'string') {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw createError('Invalid startDate format. Use YYYY-MM-DD', 400);
      }
    }
    
    if (endDate && typeof endDate === 'string') {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw createError('Invalid endDate format. Use YYYY-MM-DD', 400);
      }
    }
    
    // Validate date range
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      throw createError('startDate must be before or equal to endDate', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Check if user is restaurant owner
    let restaurant = user.ownedRestaurants.find(r => r.id === restaurantId);
    let staffMember: any = null;

    // If not owner, check if user is staff with OWNER or MANAGER role
    if (!restaurant) {
      // Check by staffId first (for PIN login)
      if (authReq.user.staffId) {
        staffMember = await prisma.staff.findFirst({
          where: {
            id: authReq.user.staffId,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      // If not found by staffId, check by email (for Google login staff)
      if (!staffMember && user.email) {
        staffMember = await prisma.staff.findFirst({
          where: {
            email: user.email,
            restaurantId: restaurantId,
            role: { in: ['OWNER', 'MANAGER'] },
            status: 'ACTIVE',
            restaurant: {
              status: 'active',
            },
          },
          include: {
            restaurant: true,
          },
        });
      }

      if (staffMember) {
        restaurant = staffMember.restaurant;
      }
    }

    if (!restaurant) {
      throw createError('Restaurant not found for this user', 404);
    }

    // Check access (only OWNER and MANAGER can view reports)
    const isOwner = restaurant.ownerId === userId;
    const hasAccess = isOwner || (staffMember && (staffMember.role === 'OWNER' || staffMember.role === 'MANAGER'));
    
    if (!hasAccess) {
      throw createError('Insufficient permissions. Only owners and managers can view sales history', 403);
    }

    // Get sales history
    const history = await reportService.getSalesHistory(
      restaurantId, 
      validPeriod, 
      validLanguage,
      parsedStartDate,
      parsedEndDate
    );

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

export const updateTableGuestCount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { tableId } = req.params;
    const { restaurantId, guestCount } = req.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    if (!guestCount || isNaN(Number(guestCount))) {
      throw createError('Guest count is required and must be a number', 400);
    }

    const guestCountNum = Number(guestCount);
    if (guestCountNum < 0) {
      throw createError('Guest count must be 0 or greater', 400);
    }

    // Verify table belongs to restaurant
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId,
      },
      include: {
        sessions: {
          where: {
            status: 'ACTIVE',
          },
          take: 1,
        },
      },
    });

    if (!table) {
      throw createError('Table not found', 404);
    }

    // Update or create session with guest count
    await sessionService.updateOrCreateSessionForTable({
      tableId,
      restaurantId,
      guestCount: guestCountNum,
    });

    // If table is EMPTY and guest count is greater than 0, automatically change status to ORDERING
    // This allows customers to place orders immediately after being seated
    if (table.status === 'EMPTY' && guestCountNum > 0) {
      await tableService.updateTableStatus(tableId, 'ORDERING');
    }

    // Reload tables to get updated state (including active session with updated guestCount)
    const updatedTables = await tableService.getTablesByRestaurant(restaurantId);
    const updatedTable = updatedTables.find(t => t.id === tableId);

    if (!updatedTable) {
      throw createError('Table not found after update', 404);
    }

    res.json({ success: true, data: updatedTable });
  } catch (error) {
    next(error);
  }
};
