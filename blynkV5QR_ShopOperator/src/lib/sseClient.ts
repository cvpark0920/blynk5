import { logger } from './logger';

export interface SSEEvent {
  type: string;
  [key: string]: any;
}

export interface SSEClientOptions {
  onMessage?: (event: SSEEvent) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private url: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private options: SSEClientOptions;

  constructor(options: SSEClientOptions = {}) {
    this.options = {
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 3000,
      ...options,
    };
    this.maxReconnectAttempts = this.options.maxReconnectAttempts!;
    this.reconnectDelay = this.options.reconnectDelay!;
  }

  connect(url: string, headers?: Record<string, string>) {
    // Close existing connection if any
    this.disconnect();

    this.url = url;

    // EventSource doesn't support custom headers directly
    // For authenticated endpoints, we'll need to pass token in URL or use a different approach
    // For now, assuming token is passed via URL query param or cookie
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0;
      logger.info('SSE connection opened:', url);
      this.options.onConnect?.();
    };

    this.eventSource.onmessage = (event) => {
      try {
        // Skip heartbeat messages
        if (event.data.trim() === '' || event.data.startsWith(':')) {
          return;
        }

        const data = JSON.parse(event.data);
        this.options.onMessage?.(data);
      } catch (error) {
        logger.error('Error parsing SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      logger.error('SSE connection error:', error);
      this.options.onError?.(error);

      // Close the connection
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        logger.info(`Reconnecting SSE in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        this.reconnectTimeoutId = setTimeout(() => {
          if (this.url) {
            this.connect(this.url);
          }
        }, delay);
      } else {
        logger.error('Max reconnection attempts reached');
        this.options.onDisconnect?.();
      }
    };
  }

  disconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      logger.info('SSE connection closed');
      this.options.onDisconnect?.();
    }

    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
}
