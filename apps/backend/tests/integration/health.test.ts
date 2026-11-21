import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupIntegration } from './test-context.js';

const { app } = setupIntegration();

describe('GET /health', () => {
  it('responde 200 com status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
