// Simple logger utility
export const logger = {
  info: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SSE]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('[SSE]', ...args);
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[SSE]', ...args);
    }
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[SSE]', ...args);
    }
  },
};
