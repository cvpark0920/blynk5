import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
];

const AUDIO_EXTENSION_MAP: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
};

export const uploadNotificationSound = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) {
      throw createError('Notification sound file is required', 400);
    }

    if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      throw createError('Unsupported audio file type', 400);
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    const extension =
      AUDIO_EXTENSION_MAP[file.mimetype] ||
      path.extname(file.originalname || '').toLowerCase() ||
      '.mp3';
    const fileName = `notification-${id}-${Date.now()}${extension}`;
    const publicDir = path.resolve(__dirname, '../../public');
    const uploadDir = path.join(publicDir, 'uploads', 'notification-sounds');
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, file.buffer);

    const soundUrl = `/uploads/notification-sounds/${fileName}`;
    const currentSettings = (restaurant.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      notificationSoundUrl: soundUrl,
    };

    await prisma.restaurant.update({
      where: { id },
      data: {
        settings: updatedSettings,
      },
    });

    res.json({
      success: true,
      data: {
        notificationSoundUrl: soundUrl,
        settings: updatedSettings,
      },
    });
  } catch (error) {
    next(error);
  }
};
