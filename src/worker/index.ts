import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// ========== 인증 API ==========
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM authorized_users WHERE username = ? AND password = ?'
    ).bind(username, password).all();

    if (results.length === 0) {
      return c.json({ error: '인증 실패' }, 401);
    }

    const user: any = results[0];
    return c.json({
      success: true,
      user: { id: user.id, name: user.name, username: user.username }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/auth/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, username FROM authorized_users'
    ).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/auth/users', async (c) => {
  try {
    const { id, name, username, password } = await c.req.json();
    
    // 중복 확인
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id FROM authorized_users WHERE username = ?'
    ).bind(username).all();
    
    if (existing.length > 0) {
      return c.json({ error: '이미 존재하는 아이디입니다.' }, 400);
    }
    
    await c.env.DB.prepare(
      'INSERT INTO authorized_users (id, name, username, password) VALUES (?, ?, ?, ?)'
    ).bind(id, name, username, password).run();

    return c.json({ success: true, data: { id, name, username } });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/api/auth/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { name, username, password, currentPassword } = await c.req.json();
    
    // 현재 비밀번호 확인
    if (currentPassword) {
      const { results } = await c.env.DB.prepare(
        'SELECT id FROM authorized_users WHERE id = ? AND password = ?'
      ).bind(id, currentPassword).all();
      
      if (results.length === 0) {
        return c.json({ error: '현재 비밀번호가 일치하지 않습니다.' }, 401);
      }
    }
    
    // 업데이트
    const updates: string[] = [];
    const bindings: any[] = [];
    
    if (name) {
      updates.push('name = ?');
      bindings.push(name);
    }
    if (username) {
      updates.push('username = ?');
      bindings.push(username);
    }
    if (password) {
      updates.push('password = ?');
      bindings.push(password);
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    bindings.push(id);
    
    await c.env.DB.prepare(`
      UPDATE authorized_users SET ${updates.join(', ')} WHERE id = ?
    `).bind(...bindings).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/api/auth/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (id === 'admin') {
      return c.json({ error: '관리자 계정은 삭제 불가' }, 400);
    }
    await c.env.DB.prepare('DELETE FROM authorized_users WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== 연락처 API ==========
app.get('/api/contacts', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM contacts ORDER BY created_at DESC'
    ).all();
    
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/contacts', async (c) => {
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
    
    return c.json({ success: true, data: { id } });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/api/contacts/:id', async (c) => {
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
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/api/contacts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== 인건비 청구 API ==========
app.get('/api/labor-claims', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM labor_claims ORDER BY created_at DESC'
    ).all();
    
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/labor-claims', async (c) => {
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
    
    return c.json({ success: true, data: { id } });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/api/labor-claims/:id', async (c) => {
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
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/api/labor-claims/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM labor_claims WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
