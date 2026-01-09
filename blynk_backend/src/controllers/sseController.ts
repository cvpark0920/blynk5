import { Request, Response, NextFunction, RequestHandler } from 'express';
import { sseHandler } from '../sse/sseHandler';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export const connectSessionSSE: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw createError('Session ID is required', 400);
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

    const channel = `sse:session:${sessionId}`;

    await sseHandler.addClient(channel, {
      sessionId,
      response: res,
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
      }
    }, 30000); // Every 30 seconds

    req.on('close', () => {
      clearInterval(heartbeat);
      sseHandler.removeClient(channel, { response: res });
    });
  } catch (error) {
    next(error);
  }
};

export const connectStaffSSE: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId } = req.params;
    const { verifyToken } = await import('../utils/jwt');

    if (!restaurantId) {
      throw createError('Restaurant ID is required', 400);
    }

    // EventSource doesn't support custom headers, so check token from query param or cookie
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      throw createError('Authentication required', 401);
    }

    // Verify token
    try {
      const payload = verifyToken(token);
      (req as AuthRequest).user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        staffId: payload.staffId,
      };
    } catch (error: any) {
      // Provide more specific error message
      const errorMessage = error?.message === 'Token expired' 
        ? 'Token expired. Please refresh your token and reconnect.'
        : 'Invalid or expired token';
      throw createError(errorMessage, 401);
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const channel = `sse:restaurant:${restaurantId}:staff`;

    await sseHandler.addClient(channel, {
      restaurantId,
      response: res,
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseHandler.removeClient(channel, { response: res });
    });
  } catch (error) {
    next(error);
  }
};
