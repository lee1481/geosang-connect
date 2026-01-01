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
    
    const row: any = results[0];
    const parsed = {
      ...row,
      staffList: row.staffList ? JSON.parse(row.staffList) : [],
      attachments: row.attachments ? JSON.parse(row.attachments) : []
    };
    
    return c.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('GET /api/contacts/:id error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/contacts - 새 거래처 생성
app.post('/', async (c) => {
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

// PUT /api/contacts/:id - 거래처 수정
app.put('/:id', async (c) => {
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

// DELETE /api/contacts/:id - 거래처 삭제
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    await c.env.DB.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/contacts/:id error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
