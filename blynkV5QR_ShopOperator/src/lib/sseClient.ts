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
      console.info('[SSE] connected', url);
      this.options.onConnect?.();
    };

    this.eventSource.onmessage = (event) => {
      try {
        // Skip heartbeat messages
        if (event.data.trim() === '' || event.data.startsWith(':')) {
          return;
        }

        if (event.data.includes('"type":"chat:new"') || event.data.includes('"type":"order:new"')) {
          console.info('[SSE] message raw', event.data);
        }
        const data = JSON.parse(event.data);
        this.options.onMessage?.(data);
      } catch (error) {
        logger.error('Error parsing SSE message:', error);
        console.error('[SSE] parse error', error);
      }
    };

    this.eventSource.onerror = (error) => {
      logger.error('SSE connection error:', error);
      console.error('[SSE] connection error', error);
      
      // Close the connection
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      // Let the parent component handle reconnection with token refresh
      // Don't auto-reconnect here to avoid using expired tokens
      this.options.onError?.(error);
      
      // Only auto-reconnect if maxReconnectAttempts is greater than 0 and not Infinity
      // (0 or Infinity means parent will handle reconnection)
      if (this.maxReconnectAttempts > 0 && this.maxReconnectAttempts !== Number.POSITIVE_INFINITY) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
          logger.info(`Reconnecting SSE in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          console.info('[SSE] reconnecting', { delay, attempt: this.reconnectAttempts });
          
          this.reconnectTimeoutId = setTimeout(() => {
            if (this.url) {
              this.connect(this.url);
            }
          }, delay);
        } else {
          logger.error('Max reconnection attempts reached');
          console.error('[SSE] max reconnect attempts reached');
          this.options.onDisconnect?.();
        }
      } else {
        // Parent will handle reconnection (maxReconnectAttempts is 0 or Infinity)
        // Just mark as disconnected, don't auto-reconnect
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
      console.info('[SSE] connection closed');
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
