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
    
    // DB 형식 → 프론트엔드 형식 변환
    const transformed = results.map((row: any) => ({
      id: row.id,
      category: row.category,
      brandName: row.companyName || '',
      industry: row.industry || '',
      subCategory: row.region || '',
      address: row.address || '',
      storeAddress: row.storeAddress || '',
      phone: row.phone || '',
      email: row.email || '',
      bankAccount: row.memo || '',
      franchiseBrand: row.franchiseBrand || '',
      storeName: row.storeName || '',
      contractDate: row.contractDate || '',
      memo: row.memo || '',
      staffList: [{
        id: 's' + row.id,
        name: row.name || '',
        position: row.position || '',
        phone: row.phone || '',
        email: row.email || '',
        department: row.department || '',
        rating: 5,
        region: row.region || '',
        bankAccount: row.memo || '',
        features: row.features || ''
      }],
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    return c.json({ success: true, data: transformed });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/contacts', async (c) => {
  try {
    const body = await c.req.json();
    
    // undefined를 null로 변환하는 헬퍼 함수
    const toNull = (value: any) => value === undefined ? null : value;
    
    // 프론트엔드 형식 → DB 형식 변환
    // staffList에서 첫 번째 인원의 정보를 추출
    const firstStaff = body.staffList?.[0] || {};
    
    const dbData = {
      id: toNull(body.id),
      name: toNull(firstStaff.name || body.name || '이름 없음'),  // staffList[0].name 우선, 없으면 기본값
      companyName: toNull(body.brandName || body.companyName),  // brandName → companyName
      phone: toNull(firstStaff.phone || body.phone),
      email: toNull(firstStaff.email || body.email),
      address: toNull(body.address || body.storeAddress),
      category: toNull(body.category),
      department: toNull(firstStaff.department || body.department),
      position: toNull(firstStaff.position || body.position),
      industry: toNull(body.industry),
      businessType: toNull(body.businessType),
      features: toNull(firstStaff.features || body.features),
      region: toNull(firstStaff.region || body.region),
      franchiseBrand: toNull(body.franchiseBrand),
      storeName: toNull(body.storeName),
      storeAddress: toNull(body.storeAddress),
      contractDate: toNull(body.contractDate),
      memo: toNull(body.memo)
    };
    
    await c.env.DB.prepare(`
      INSERT INTO contacts (
        id, name, companyName, phone, email, address, category,
        department, position, industry, businessType, features,
        region, franchiseBrand, storeName, storeAddress, contractDate, memo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      dbData.id, dbData.name, dbData.companyName, dbData.phone, dbData.email,
      dbData.address, dbData.category, dbData.department, dbData.position,
      dbData.industry, dbData.businessType, dbData.features,
      dbData.region, dbData.franchiseBrand, dbData.storeName,
      dbData.storeAddress, dbData.contractDate, dbData.memo
    ).run();
    
    return c.json({ success: true, data: { id: body.id } });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/api/contacts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    // undefined를 null로 변환하는 헬퍼 함수
    const toNull = (value: any) => value === undefined ? null : value;
    
    // 프론트엔드 형식 → DB 형식 변환
    const firstStaff = body.staffList?.[0] || {};
    
    const dbData = {
      name: toNull(firstStaff.name || body.name || '이름 없음'),
      companyName: toNull(body.brandName || body.companyName),
      phone: toNull(firstStaff.phone || body.phone),
      email: toNull(firstStaff.email || body.email),
      address: toNull(body.address || body.storeAddress),
      category: toNull(body.category),
      department: toNull(firstStaff.department || body.department),
      position: toNull(firstStaff.position || body.position),
      industry: toNull(body.industry),
      businessType: toNull(body.businessType),
      features: toNull(firstStaff.features || body.features),
      region: toNull(firstStaff.region || body.region),
      franchiseBrand: toNull(body.franchiseBrand),
      storeName: toNull(body.storeName),
      storeAddress: toNull(body.storeAddress),
      contractDate: toNull(body.contractDate),
      memo: toNull(body.memo)
    };
    
    await c.env.DB.prepare(`
      UPDATE contacts SET
        name = ?, companyName = ?, phone = ?, email = ?, address = ?,
        category = ?, department = ?, position = ?, industry = ?,
        businessType = ?, features = ?, region = ?, franchiseBrand = ?,
        storeName = ?, storeAddress = ?, contractDate = ?, memo = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      dbData.name, dbData.companyName, dbData.phone, dbData.email,
      dbData.address, dbData.category, dbData.department, dbData.position,
      dbData.industry, dbData.businessType, dbData.features,
      dbData.region, dbData.franchiseBrand, dbData.storeName,
      dbData.storeAddress, dbData.contractDate, dbData.memo, id
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
