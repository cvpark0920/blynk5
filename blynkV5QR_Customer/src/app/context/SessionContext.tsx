import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, Session, Table } from '../../lib/api';

interface SessionContextType {
  sessionId: string | null;
  restaurantId: string | null;
  tableId: string | null;
  tableNumber: number | null;
  isLoading: boolean;
  error: string | null;
  session: Session | null;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
  restaurantId: string;
  tableNumber: number;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({
  children,
  restaurantId,
  tableNumber,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const storageKey = `session_${restaurantId}_${tableNumber}`;

  const refreshSession = async () => {
    if (!sessionId) return;

    try {
      const response = await apiClient.getSession(sessionId);
      if (response.success && response.data) {
        setSession(response.data);
        // 세션이 종료되었으면 localStorage에서 세션 ID 삭제
        if (response.data.status === 'ENDED') {
          localStorage.removeItem(storageKey);
        }
        // 세션이 비활성화되었으면 새로 생성
        if (response.data.status !== 'ACTIVE') {
          await createNewSession();
        }
      } else {
        // 세션이 없거나 무효하면 새로 생성
        await createNewSession();
      }
    } catch (err) {
      console.error('Failed to refresh session:', err);
      await createNewSession();
    }
  };

  const createNewSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. 테이블 번호로 tableId 조회
      const tableResponse = await apiClient.getTableByNumber(restaurantId, tableNumber);
      if (!tableResponse.success || !tableResponse.data) {
        throw new Error(tableResponse.error?.message || 'Failed to get table');
      }

      const table: Table = tableResponse.data;
      setTableId(table.id);

      // 2. 세션 생성
      const sessionResponse = await apiClient.createSession({
        tableId: table.id,
        restaurantId,
        guestCount: 1,
      });

      if (!sessionResponse.success || !sessionResponse.data) {
        throw new Error(sessionResponse.error?.message || 'Failed to create session');
      }

      const newSession: Session = sessionResponse.data;
      setSessionId(newSession.id);
      setSession(newSession);
      localStorage.setItem(storageKey, newSession.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      console.error('Failed to create session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      setError(null);

      // localStorage에서 기존 세션 확인
      const existingSessionId = localStorage.getItem(storageKey);

      if (existingSessionId) {
        // 기존 세션 유효성 검증
        try {
          const response = await apiClient.getSession(existingSessionId);
          if (response.success && response.data) {
            const existingSession = response.data;
            // 세션이 활성 상태이고 같은 테이블이면 재사용
            if (
              existingSession.status === 'ACTIVE' &&
              existingSession.restaurantId === restaurantId
            ) {
              setSessionId(existingSession.id);
              setSession(existingSession);
              setTableId(existingSession.tableId);
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('Failed to validate existing session:', err);
        }
      }

      // 기존 세션이 없거나 무효하면 새로 생성
      await createNewSession();
    };

    initializeSession();
  }, [restaurantId, tableNumber, storageKey]);

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        restaurantId,
        tableId,
        tableNumber,
        isLoading,
        error,
        session,
        refreshSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};
