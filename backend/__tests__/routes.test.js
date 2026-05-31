const request = require('supertest');
const express = require('express');
const { validateExecuteTask, validateApproveSteps, validateRetryDecision } = require('../middleware/validate');

const app = express();
app.use(express.json());
app.post('/api/agent/execute', validateExecuteTask, (req, res) => res.json({ ok: true }));
app.post('/api/agent/approve', validateApproveSteps, (req, res) => res.json({ ok: true }));
app.post('/api/agent/retry-decision', validateRetryDecision, (req, res) => res.json({ ok: true }));

describe('API Validation Middleware', () => {
  describe('POST /api/agent/execute', () => {
    it('rejects missing task', async () => {
      const res = await request(app)
        .post('/api/agent/execute')
        .send({ mode: 'demo' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects empty task', async () => {
      const res = await request(app)
        .post('/api/agent/execute')
        .send({ task: '', mode: 'demo' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid mode', async () => {
      const res = await request(app)
        .post('/api/agent/execute')
        .send({ task: 'go to google.com', mode: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('passes valid request', async () => {
      const res = await request(app)
        .post('/api/agent/execute')
        .send({ task: 'go to google.com', mode: 'demo' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/agent/approve', () => {
    it('rejects missing steps', async () => {
      const res = await request(app)
        .post('/api/agent/approve')
        .send({ mode: 'demo' });
      expect(res.status).toBe(400);
    });

    it('rejects empty steps array', async () => {
      const res = await request(app)
        .post('/api/agent/approve')
        .send({ steps: [], mode: 'demo' });
      expect(res.status).toBe(400);
    });

    it('rejects steps without action', async () => {
      const res = await request(app)
        .post('/api/agent/approve')
        .send({ steps: [{ description: 'test' }] });
      expect(res.status).toBe(400);
    });

    it('passes valid steps', async () => {
      const res = await request(app)
        .post('/api/agent/approve')
        .send({
          steps: [{ action: 'navigate', target: 'https://example.com', description: 'Go to site' }],
          mode: 'demo'
        });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/agent/retry-decision', () => {
    it('rejects invalid decision', async () => {
      const res = await request(app)
        .post('/api/agent/retry-decision')
        .send({ decision: 'invalid', step: { action: 'click' } });
      expect(res.status).toBe(400);
    });

    it('passes valid retry decision', async () => {
      const res = await request(app)
        .post('/api/agent/retry-decision')
        .send({ decision: 'retry', step: { action: 'click' } });
      expect(res.status).toBe(200);
    });

    it('passes valid skip decision', async () => {
      const res = await request(app)
        .post('/api/agent/retry-decision')
        .send({ decision: 'skip', step: { action: 'click' } });
      expect(res.status).toBe(200);
    });

    it('passes valid cancel decision', async () => {
      const res = await request(app)
        .post('/api/agent/retry-decision')
        .send({ decision: 'cancel', step: { action: 'click' } });
      expect(res.status).toBe(200);
    });
  });
});
