# Blynk Backend API 클라이언트 예시

프론트엔드에서 사용할 수 있는 API 클라이언트 예시입니다.

## 설치

```bash
npm install axios
# 또는
npm install fetch
```

## 기본 설정

```typescript
// src/utils/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - 토큰 추가
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - 토큰 갱신
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem('accessToken', data.data.accessToken);
          // Retry original request
          return apiClient.request(error.config);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

## SSE 클라이언트

```typescript
// src/utils/sseClient.ts
export class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string, onMessage: (data: any) => void, onError?: (error: Event) => void) {
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      if (onError) {
        onError(error);
      }

      // 자동 재연결
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          this.disconnect();
          this.connect(url, onMessage, onError);
        }, 3000 * this.reconnectAttempts);
      }
    };

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0;
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
```

## 사용 예시

### 고객 앱

```typescript
// src/services/customerApi.ts
import apiClient from '../utils/api';
import { SSEClient } from '../utils/sseClient';

export const customerApi = {
  // QR 코드로 식당 조회
  getRestaurantByQrCode: (qrCode: string) =>
    apiClient.get(`/customer/restaurant/${qrCode}`),

  // 메뉴 조회
  getMenu: (restaurantId: string) =>
    apiClient.get(`/customer/menu/${restaurantId}`),

  // 세션 시작
  createSession: (data: { tableId: string; restaurantId: string; guestCount?: number }) =>
    apiClient.post('/customer/session', data),

  // 주문 생성
  createOrder: (data: {
    sessionId: string;
    tableId: string;
    restaurantId: string;
    items: Array<{
      menuItemId: string;
      quantity: number;
      options?: Array<{ optionId: string; quantity: number }>;
      notes?: string[];
    }>;
  }) => apiClient.post('/customer/orders', data),

  // SSE 연결
  connectSSE: (sessionId: string, onMessage: (data: any) => void) => {
    const sseClient = new SSEClient();
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sse/session/${sessionId}`;
    sseClient.connect(url, onMessage);
    return sseClient;
  },
};
```

### 식당 운영자 앱

```typescript
// src/services/staffApi.ts
import apiClient from '../utils/api';
import { SSEClient } from '../utils/sseClient';

export const staffApi = {
  // 테이블 목록
  getTables: (restaurantId: string) =>
    apiClient.get(`/staff/tables?restaurantId=${restaurantId}`),

  // 주문 목록
  getOrders: (restaurantId: string, filters?: { status?: string; tableId?: string }) =>
    apiClient.get('/staff/orders', { params: { restaurantId, ...filters } }),

  // 주문 상태 변경
  updateOrderStatus: (orderId: string, status: string) =>
    apiClient.put(`/staff/orders/${orderId}/status`, { status }),

  // SSE 연결
  connectSSE: (restaurantId: string, onMessage: (data: any) => void) => {
    const sseClient = new SSEClient();
    const token = localStorage.getItem('accessToken');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sse/restaurant/${restaurantId}/staff?token=${token}`;
    sseClient.connect(url, onMessage);
    return sseClient;
  },
};
```

## React Hook 예시

```typescript
// src/hooks/useSSE.ts
import { useEffect, useRef } from 'react';
import { SSEClient } from '../utils/sseClient';

export const useSSE = (
  url: string | null,
  onMessage: (data: any) => void,
  onError?: (error: Event) => void
) => {
  const sseClientRef = useRef<SSEClient | null>(null);

  useEffect(() => {
    if (!url) return;

    const sseClient = new SSEClient();
    sseClientRef.current = sseClient;
    sseClient.connect(url, onMessage, onError);

    return () => {
      sseClient.disconnect();
    };
  }, [url, onMessage, onError]);

  return sseClientRef.current;
};
```

## 사용 예시 (React)

```typescript
// 컴포넌트에서 사용
import { useSSE } from '../hooks/useSSE';
import { customerApi } from '../services/customerApi';

function OrderComponent({ sessionId }: { sessionId: string }) {
  const [orderStatus, setOrderStatus] = useState('pending');

  useSSE(
    sessionId ? `/api/sse/session/${sessionId}` : null,
    (data) => {
      if (data.type === 'order:status') {
        setOrderStatus(data.status);
      }
    }
  );

  const handleOrder = async () => {
    await customerApi.createOrder({
      sessionId,
      tableId: 'table-id',
      restaurantId: 'restaurant-id',
      items: [
        {
          menuItemId: 'item-id',
          quantity: 2,
          options: [{ optionId: 'opt-id', quantity: 1 }],
        },
      ],
    });
  };

  return <div>Order Status: {orderStatus}</div>;
}
```
