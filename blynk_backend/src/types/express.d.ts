import { Restaurant } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      restaurantId?: string;
      restaurant?: Restaurant;
      subdomain?: string;
    }
  }
}

export {};
