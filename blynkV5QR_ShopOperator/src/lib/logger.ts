// Simple logger utility
export const logger = {
  info: (..._args: any[]) => {},
  error: (...args: any[]) => {
    console.error('[SSE]', ...args);
  },
  warn: (..._args: any[]) => {},
  debug: (..._args: any[]) => {},
};
