import { Response } from 'express';
import { redisSubscriber } from '../utils/redis';
import { logger } from '../utils/logger';

interface SSEClient {
  sessionId?: string;
  restaurantId?: string;
  response: Response;
}

class SSEHandler {
  private clients: Map<string, SSEClient[]> = new Map();

  constructor() {
    // Redis subscriber setup will be done when channels are subscribed
  }

  private subscribedChannels: Set<string> = new Set();

  private async subscribeToChannel(channel: string) {
    if (this.subscribedChannels.has(channel)) {
      return;
    }

    try {
      await redisSubscriber.subscribe(channel, (message) => {
        try {
          const data = JSON.parse(message);
          this.broadcast(channel, data);
        } catch (error: any) {
          logger.error('Error parsing SSE message', { 
            error: error?.message || String(error),
            stack: error?.stack,
            message 
          });
        }
      });
      this.subscribedChannels.add(channel);
      logger.info(`Subscribed to SSE channel: ${channel}`);
    } catch (error: any) {
      logger.error(`Error subscribing to channel ${channel}`, { 
        error: error?.message || String(error),
        stack: error?.stack,
        channel 
      });
    }
  }

  private async unsubscribeFromChannel(channel: string) {
    if (!this.subscribedChannels.has(channel)) {
      return;
    }

    try {
      await redisSubscriber.unsubscribe(channel);
      this.subscribedChannels.delete(channel);
      logger.info(`Unsubscribed from SSE channel: ${channel}`);
    } catch (error: any) {
      logger.error(`Error unsubscribing from channel ${channel}`, { 
        error: error?.message || String(error),
        stack: error?.stack,
        channel 
      });
    }
  }

  async addClient(channel: string, client: SSEClient) {
    if (!this.clients.has(channel)) {
      this.clients.set(channel, []);
      // Subscribe to channel when first client connects
      await this.subscribeToChannel(channel);
    }

    this.clients.get(channel)!.push(client);

    logger.info(`Client connected to SSE channel: ${channel}`);

    // Send initial connection message
    client.response.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    // Handle client disconnect
    client.response.on('close', () => {
      this.removeClient(channel, client);
    });
  }

  async removeClient(channel: string, client: SSEClient) {
    const clients = this.clients.get(channel);
    if (!clients) return;

    const index = clients.findIndex(c => c.response === client.response);
    if (index !== -1) {
      clients.splice(index, 1);
    }

    // Clean up if no clients left
    if (clients.length === 0) {
      this.clients.delete(channel);
      await this.unsubscribeFromChannel(channel);
      logger.info(`No clients left for SSE channel: ${channel}`);
    }
  }

  private broadcast(channel: string, data: any) {
    const clients = this.clients.get(channel);
    if (!clients) return;

    const message = `data: ${JSON.stringify(data)}\n\n`;

    clients.forEach((client, index) => {
      try {
        client.response.write(message);
      } catch (error: any) {
        logger.error('Error sending SSE message to client', { 
          error: error?.message || String(error),
          stack: error?.stack,
          channel,
          clientIndex: index 
        });
        // Remove failed client
        clients.splice(index, 1);
      }
    });
  }

  getClientCount(channel: string): number {
    return this.clients.get(channel)?.length || 0;
  }
}

export const sseHandler = new SSEHandler();
