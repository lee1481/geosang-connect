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
    
    // JSON 필드 파싱
    const parsedResults = results.map((row: any) => ({
      ...row,
      staffList: row.staffList ? JSON.parse(row.staffList) : [],
      attachments: row.attachments ? JSON.parse(row.attachments) : []
    }));
    
    return c.json({ success: true, data: parsedResults });
  } catch (error: any) {
    console.error('GET /api/contacts error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/api/contacts', async (c) => {
  try {
    const body = await c.req.json();
    
    console.log('=== POST /api/contacts ===');
    console.log('받은 데이터:', JSON.stringify(body, null, 2));
    
    // staffList와 attachments를 JSON 문자열로 변환
    const staffListJson = JSON.stringify(body.staffList || []);
    const attachmentsJson = JSON.stringify(body.attachments || []);
    
    await c.env.DB.prepare(`
      INSERT INTO contacts (
        id, category, brandName, subCategory, industry, address, 
        phone, phone2, email, homepage, bankAccount, licenseFile,
        staffList, attachments, memo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      body.id,
      body.category,
      body.brandName || null,
      body.subCategory || null,
      body.industry || null,
      body.address || null,
      body.phone || null,
      body.phone2 || null,
      body.email || null,
      body.homepage || null,
      body.bankAccount || null,
      body.licenseFile || null,
      staffListJson,
      attachmentsJson,
      body.memo || null
    ).run();
    
    // 생성된 데이터 반환
    const createdData = {
      ...body,
      staffList: body.staffList || [],
      attachments: body.attachments || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('=== 생성된 데이터 ===');
    console.log(JSON.stringify(createdData, null, 2));
    
    return c.json({ success: true, data: createdData }, 201);
  } catch (error: any) {
    console.error('POST /api/contacts error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/api/contacts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    console.log('=== PUT /api/contacts/:id ===');
    console.log('수정할 ID:', id);
    console.log('받은 데이터:', JSON.stringify(body, null, 2));
    
    // staffList와 attachments를 JSON 문자열로 변환
    const staffListJson = JSON.stringify(body.staffList || []);
    const attachmentsJson = JSON.stringify(body.attachments || []);
    
    await c.env.DB.prepare(`
      UPDATE contacts SET
        category = ?,
        brandName = ?,
        subCategory = ?,
        industry = ?,
        address = ?,
        phone = ?,
        phone2 = ?,
        email = ?,
        homepage = ?,
        bankAccount = ?,
        licenseFile = ?,
        staffList = ?,
        attachments = ?,
        memo = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.category,
      body.brandName || null,
      body.subCategory || null,
      body.industry || null,
      body.address || null,
      body.phone || null,
      body.phone2 || null,
      body.email || null,
      body.homepage || null,
      body.bankAccount || null,
      body.licenseFile || null,
      staffListJson,
      attachmentsJson,
      body.memo || null,
      id
    ).run();
    
    // 수정된 데이터 반환
    const updatedData = {
      ...body,
      id,
      staffList: body.staffList || [],
      attachments: body.attachments || [],
      updated_at: new Date().toISOString()
    };
    
    console.log('=== 수정된 데이터 ===');
    console.log(JSON.stringify(updatedData, null, 2));
    
    return c.json({ success: true, data: updatedData });
  } catch (error: any) {
    console.error('PUT /api/contacts/:id error:', error);
    return c.json({ success: false, error: error.message }, 500);
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
    
    // Parse JSON fields
    const parsedResults = results.map((row: any) => ({
      ...row,
      sites: JSON.parse(row.sites || '[]'),
      breakdown: JSON.parse(row.breakdown || '{}')
    }));
    
    return c.json({ success: true, data: parsedResults });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/labor-claims', async (c) => {
  try {
    const body = await c.req.json();
    
    const {
      id, workerId, workerName, workerPhone, date, sites, totalAmount,
      breakdown, status, memo, createdAt
    } = body;
    
    // undefined를 null로 변환하는 헬퍼 함수
    const toNull = (value: any) => value === undefined ? null : value;
    
    await c.env.DB.prepare(`
      INSERT INTO labor_claims (
        id, workerId, workerName, workerPhone, date, sites,
        totalAmount, breakdown, status, memo, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      toNull(id),
      toNull(workerId),
      toNull(workerName),
      toNull(workerPhone),
      toNull(date),
      JSON.stringify(sites || []),
      toNull(totalAmount) || 0,
      JSON.stringify(breakdown || {}),
      status || 'pending',
      toNull(memo),
      createdAt || new Date().toISOString()
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
      workerId, workerName, workerPhone, date, sites, totalAmount,
      breakdown, status, memo, approvedBy, approvedAt, paidAt
    } = body;
    
    // undefined를 null로 변환하는 헬퍼 함수
    const toNull = (value: any) => value === undefined ? null : value;
    
    await c.env.DB.prepare(`
      UPDATE labor_claims SET
        workerId = ?, workerName = ?, workerPhone = ?, date = ?, sites = ?,
        totalAmount = ?, breakdown = ?, status = ?, memo = ?,
        approvedBy = ?, approvedAt = ?, paidAt = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      toNull(workerId),
      toNull(workerName),
      toNull(workerPhone),
      toNull(date),
      JSON.stringify(sites || []),
      toNull(totalAmount) || 0,
      JSON.stringify(breakdown || {}),
      toNull(status) || 'pending',
      toNull(memo),
      toNull(approvedBy),
      toNull(approvedAt),
      toNull(paidAt),
      id
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
