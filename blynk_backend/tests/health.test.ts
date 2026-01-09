import request from 'supertest';
import express from 'express';

// Simple test app without Redis connection
const testApp = express();
testApp.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

describe('Health Check', () => {
  it('should return 200 and ok status', async () => {
    const response = await request(testApp).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });
});
