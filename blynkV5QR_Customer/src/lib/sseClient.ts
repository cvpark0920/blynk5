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
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
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

  connect(url: string) {
    // Close existing connection if any
    this.disconnect();

    this.url = url;

    // EventSource for customer app doesn't require authentication
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0;
      console.log('SSE connection opened:', url);
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
        console.error('Error parsing SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
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
        console.log(`Reconnecting SSE in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        this.reconnectTimeoutId = setTimeout(() => {
          if (this.url) {
            this.connect(this.url);
          }
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
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
      console.log('SSE connection closed');
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
