import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS 활성화
app.use('/*', cors());

// GET /api/contacts - 모든 거래처 조회
app.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM contacts ORDER BY created_at DESC'
    ).all();
    
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/contacts/:id - 특정 거래처 조회
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM contacts WHERE id = ?'
    ).bind(id).all();
    
    if (results.length === 0) {
      return c.json({ success: false, error: 'Contact not found' }, 404);
    }
    
    return c.json({ success: true, data: results[0] });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/contacts - 새 거래처 생성
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    
    const {
      id, name, companyName, phone, email, address, category,
      department, position, industry, businessType, features,
      region, franchiseBrand, storeName, storeAddress, contractDate, memo
    } = body;
    
    await c.env.DB.prepare(`
      INSERT INTO contacts (
        id, name, companyName, phone, email, address, category,
        department, position, industry, businessType, features,
        region, franchiseBrand, storeName, storeAddress, contractDate, memo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, name, companyName || null, phone || null, email || null,
      address || null, category, department || null, position || null,
      industry || null, businessType || null, features || null,
      region || null, franchiseBrand || null, storeName || null,
      storeAddress || null, contractDate || null, memo || null
    ).run();
    
    return c.json({ success: true, data: { id } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /api/contacts/:id - 거래처 수정
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const {
      name, companyName, phone, email, address, category,
      department, position, industry, businessType, features,
      region, franchiseBrand, storeName, storeAddress, contractDate, memo
    } = body;
    
    await c.env.DB.prepare(`
      UPDATE contacts SET
        name = ?, companyName = ?, phone = ?, email = ?, address = ?,
        category = ?, department = ?, position = ?, industry = ?,
        businessType = ?, features = ?, region = ?, franchiseBrand = ?,
        storeName = ?, storeAddress = ?, contractDate = ?, memo = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      name, companyName || null, phone || null, email || null,
      address || null, category, department || null, position || null,
      industry || null, businessType || null, features || null,
      region || null, franchiseBrand || null, storeName || null,
      storeAddress || null, contractDate || null, memo || null, id
    ).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/contacts/:id - 거래처 삭제
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    await c.env.DB.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
