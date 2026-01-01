import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS 활성화
app.use('/*', cors());

// GET /api/labor-claims - 모든 인건비 청구 조회
app.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM labor_claims ORDER BY created_at DESC'
    ).all();
    
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/labor-claims/:id - 특정 인건비 청구 조회
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM labor_claims WHERE id = ?'
    ).bind(id).all();
    
    if (results.length === 0) {
      return c.json({ success: false, error: 'Labor claim not found' }, 404);
    }
    
    return c.json({ success: true, data: results[0] });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/labor-claims - 새 인건비 청구 생성
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    
    const {
      id, workerId, workerName, projectName, startDate, endDate,
      days, dailyRate, totalAmount, status, notes
    } = body;
    
    await c.env.DB.prepare(`
      INSERT INTO labor_claims (
        id, workerId, workerName, projectName, startDate, endDate,
        days, dailyRate, totalAmount, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, workerId, workerName, projectName, startDate, endDate,
      days, dailyRate, totalAmount, status || 'pending', notes || null
    ).run();
    
    return c.json({ success: true, data: { id } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /api/labor-claims/:id - 인건비 청구 수정
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const {
      workerId, workerName, projectName, startDate, endDate,
      days, dailyRate, totalAmount, status, notes,
      approvedBy, approvedAt, paidAt
    } = body;
    
    await c.env.DB.prepare(`
      UPDATE labor_claims SET
        workerId = ?, workerName = ?, projectName = ?, startDate = ?,
        endDate = ?, days = ?, dailyRate = ?, totalAmount = ?, status = ?,
        notes = ?, approvedBy = ?, approvedAt = ?, paidAt = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      workerId, workerName, projectName, startDate, endDate,
      days, dailyRate, totalAmount, status, notes || null,
      approvedBy || null, approvedAt || null, paidAt || null, id
    ).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PATCH /api/labor-claims/:id/status - 상태만 업데이트
app.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, approvedBy, approvedAt, paidAt } = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE labor_claims SET
        status = ?, approvedBy = ?, approvedAt = ?, paidAt = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      status, approvedBy || null, approvedAt || null, paidAt || null, id
    ).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/labor-claims/:id - 인건비 청구 삭제
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    await c.env.DB.prepare('DELETE FROM labor_claims WHERE id = ?').bind(id).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
