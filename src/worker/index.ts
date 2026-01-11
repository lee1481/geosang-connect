import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// 자동 마이그레이션: 앱 시작 시 테이블 스키마 확인 및 생성
app.use('*', async (c, next) => {
  try {
    // 1. authorized_users 테이블 확인 및 생성 (CRITICAL for login!)
    try {
      const { results: authTableCheck } = await c.env.DB.prepare('SELECT name FROM sqlite_master WHERE type="table" AND name="authorized_users"').all();
      
      if (authTableCheck.length === 0) {
        console.log('📦 Creating authorized_users table...');
        
        await c.env.DB.prepare(`
          CREATE TABLE authorized_users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        
        // admin 계정 생성
        await c.env.DB.prepare(`
          INSERT INTO authorized_users (id, name, username, password)
          VALUES ('admin', '관리자', 'admin', 'geosang777')
        `).run();
        
        console.log('✅ authorized_users table created with admin account!');
      }
    } catch (authError: any) {
      console.error('❌ Error creating authorized_users table:', authError);
    }
    
    // 2. contacts 테이블의 컬럼 확인
    const { results } = await c.env.DB.prepare('PRAGMA table_info(contacts)').all();
    
    // brandName 컬럼이 없으면 마이그레이션 필요
    const hasBrandName = results.some((col: any) => col.name === 'brandName');
    
    if (!hasBrandName) {
      console.log('🔄 Migrating contacts table to new schema...');
      
      // 백업
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS contacts_backup AS SELECT * FROM contacts').run();
      
      // 기존 테이블 삭제
      await c.env.DB.prepare('DROP TABLE IF EXISTS contacts').run();
      
      // 새 스키마로 재생성
      await c.env.DB.prepare(`
        CREATE TABLE contacts (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          brandName TEXT,
          subCategory TEXT,
          industry TEXT,
          address TEXT,
          phone TEXT,
          phone2 TEXT,
          email TEXT,
          homepage TEXT,
          bankAccount TEXT,
          licenseFile TEXT,
          staffList TEXT,
          attachments TEXT,
          memo TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      // 인덱스 생성
      await c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category)').run();
      await c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_contacts_brandName ON contacts(brandName)').run();
      await c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_contacts_subCategory ON contacts(subCategory)').run();
      await c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_contacts_industry ON contacts(industry)').run();
      
      console.log('✅ Migration completed successfully!');
    }
  } catch (error: any) {
    // 테이블이 없는 경우도 처리
    if (error.message?.includes('no such table')) {
      console.log('📦 Creating contacts table for the first time...');
      await c.env.DB.prepare(`
        CREATE TABLE contacts (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          brandName TEXT,
          subCategory TEXT,
          industry TEXT,
          address TEXT,
          phone TEXT,
          phone2 TEXT,
          email TEXT,
          homepage TEXT,
          bankAccount TEXT,
          licenseFile TEXT,
          staffList TEXT,
          attachments TEXT,
          memo TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      await c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category)').run();
      await c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_contacts_brandName ON contacts(brandName)').run();
      await c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_contacts_subCategory ON contacts(subCategory)').run();
      await c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_contacts_industry ON contacts(industry)').run();
      
      console.log('✅ Table created successfully!');
    }
  }
  
  // 3. labor_claims 테이블 확인 및 생성 // UPDATED
  try {
    const { results: laborTableCheck } = await c.env.DB.prepare('SELECT name FROM sqlite_master WHERE type="table" AND name="labor_claims"').all();
    
    if (laborTableCheck.length === 0) {
      console.log('📦 Creating labor_claims table...');
      
      await c.env.DB.prepare(`
        CREATE TABLE labor_claims (
          id TEXT PRIMARY KEY,
          workerId TEXT,
          workerName TEXT,
          workerPhone TEXT,
          date TEXT,
          sites TEXT,
          totalAmount REAL,
          breakdown TEXT,
          status TEXT DEFAULT 'pending',
          memo TEXT,
          approvedBy TEXT,
          approvedAt TEXT,
          paidAt TEXT,
          createdAt TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      console.log('✅ labor_claims table created!');
    }
  } catch (laborError: any) {
    console.error('❌ Error creating labor_claims table:', laborError);
  } // UPDATED
  
  await next();
});

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
    
    console.log('🔐 Login attempt:', { username });
    
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM authorized_users WHERE username = ? AND password = ?'
    ).bind(username, password).all();

    console.log('📊 Query results:', results.length);

    if (results.length === 0) {
      console.log('❌ Login failed: invalid credentials');
      return c.json({ success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401);
    }

    const user: any = results[0];
    console.log('✅ Login successful:', user.username);
    
    return c.json({
      success: true,
      user: { id: user.id, name: user.name, username: user.username }
    });
  } catch (error: any) {
    console.error('💥 Login error:', error);
    return c.json({ success: false, error: '로그인 중 오류가 발생했습니다: ' + error.message }, 500);
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
    
    console.log('🔄 Updating user:', { id, username, hasCurrentPassword: !!currentPassword, hasNewPassword: !!password });
    
    // 현재 비밀번호 확인
    if (currentPassword) {
      console.log('🔐 Verifying current password for user:', id);
      
      const { results } = await c.env.DB.prepare(
        'SELECT id, username, password FROM authorized_users WHERE id = ?'
      ).bind(id).all();
      
      console.log('📊 User found:', results.length > 0);
      
      if (results.length === 0) {
        console.log('❌ User not found in database');
        return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404);
      }
      
      const user: any = results[0];
      console.log('🔍 Password check:', { 
        providedPassword: currentPassword, 
        dbPassword: user.password, 
        match: user.password === currentPassword 
      });
      
      if (user.password !== currentPassword) {
        console.log('❌ Password mismatch');
        return c.json({ success: false, error: '현재 비밀번호가 일치하지 않습니다.' }, 401);
      }
      
      console.log('✅ Password verified');
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
    
    console.log('💾 Updating fields:', updates);
    
    await c.env.DB.prepare(`
      UPDATE authorized_users SET ${updates.join(', ')} WHERE id = ?
    `).bind(...bindings).run();
    
    console.log('✅ Update successful');
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('💥 Update error:', error);
    return c.json({ success: false, error: error.message }, 500);
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

// GET /api/contacts/by-company-name/:name - 회사명으로 거래처 조회 (자동완성용)
app.get('/api/contacts/by-company-name/:name', async (c) => {
  try {
    const companyName = decodeURIComponent(c.req.param('name'));
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM contacts WHERE brandName = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyName).all();
    
    if (results.length === 0) {
      return c.json({ success: true, data: null });
    }
    
    const row: any = results[0];
    const parsed = {
      ...row,
      staffList: row.staffList ? JSON.parse(row.staffList) : [],
      attachments: row.attachments ? JSON.parse(row.attachments) : []
    };
    
    return c.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('GET /api/contacts/by-company-name/:name error:', error);
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

// 회사명으로 기존 회사 검색 API
app.get('/api/contacts/search', async (c) => {
  try {
    const name = c.req.query('name');
    
    if (!name || name.trim() === '') {
      return c.json({ success: false, error: '회사명을 입력해주세요' }, 400);
    }

    console.log('=== GET /api/contacts/search ===');
    console.log('검색할 회사명:', name);

    // brandName이 정확히 일치하는 회사 검색
    const result = await c.env.DB.prepare(`
      SELECT * FROM contacts 
      WHERE brandName = ? 
      LIMIT 1
    `).bind(name.trim()).first();

    if (result) {
      // staffList와 attachments를 파싱
      const parsedResult = {
        ...result,
        staffList: result.staffList ? JSON.parse(result.staffList) : [],
        attachments: result.attachments ? JSON.parse(result.attachments) : []
      };
      
      console.log('검색 결과:', parsedResult.brandName);
      return c.json({ success: true, data: parsedResult });
    } else {
      console.log('검색 결과: 없음');
      return c.json({ success: true, data: null });
    }
  } catch (error) {
    console.error('GET /api/contacts/search error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 거상컴퍼니 레코드 일괄 업데이트 API (마이그레이션용)
app.post('/api/contacts/migrate-geosang', async (c) => {
  try {
    console.log('=== POST /api/contacts/migrate-geosang ===');
    
    // 1. 대표 데이터 조회 (완전한 정보를 가진 레코드)
    const masterRecord = await c.env.DB.prepare(`
      SELECT * FROM contacts 
      WHERE brandName = '거상컴퍼니' 
        AND address IS NOT NULL 
        AND address != ''
      LIMIT 1
    `).first();

    if (!masterRecord) {
      return c.json({ success: false, error: '대표 데이터를 찾을 수 없습니다' }, 404);
    }

    console.log('대표 데이터 ID:', masterRecord.id);
    console.log('대표 주소:', masterRecord.address);

    // 2. 빈 필드를 가진 거상컴퍼니 레코드들 조회
    const emptyRecords = await c.env.DB.prepare(`
      SELECT id FROM contacts 
      WHERE brandName = '거상컴퍼니' 
        AND id != ?
        AND (address IS NULL OR address = '')
    `).bind(masterRecord.id).all();

    console.log('업데이트 대상 레코드 수:', emptyRecords.results.length);

    // 3. 각 레코드 업데이트
    let updatedCount = 0;
    for (const record of emptyRecords.results) {
      await c.env.DB.prepare(`
        UPDATE contacts SET
          address = ?,
          phone = ?,
          phone2 = ?,
          email = ?,
          homepage = ?,
          bankAccount = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        masterRecord.address,
        masterRecord.phone,
        masterRecord.phone2,
        masterRecord.email,
        masterRecord.homepage,
        masterRecord.bankAccount,
        record.id
      ).run();
      
      updatedCount++;
      console.log(`업데이트 완료: ${record.id}`);
    }

    return c.json({ 
      success: true, 
      message: `${updatedCount}개 레코드 업데이트 완료`,
      updatedCount,
      masterRecordId: masterRecord.id
    });

  } catch (error) {
    console.error('POST /api/contacts/migrate-geosang error:', error);
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

// ========== 파일 업로드/다운로드 API (R2) ==========

// 사업자등록증 업로드 (거상 조직도용)
app.post('/api/contacts/:contactId/staff/:staffId/upload-license', async (c) => {
  try {
    const contactId = c.req.param('contactId');
    const staffId = c.req.param('staffId');
    
    // 파일 받기
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: '파일이 없습니다.' }, 400);
    }
    
    // 파일명 생성 (staffId_timestamp_originalname)
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filename = `business-licenses/${contactId}/${staffId}_${timestamp}.${ext}`;
    
    // R2에 업로드
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });
    
    // 연락처 정보 조회
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM contacts WHERE id = ?'
    ).bind(contactId).all();
    
    if (results.length === 0) {
      return c.json({ error: '연락처를 찾을 수 없습니다.' }, 404);
    }
    
    const contact: any = results[0];
    const staffList = contact.staffList ? JSON.parse(contact.staffList) : [];
    
    // 해당 직원 찾아서 사업자등록증 URL 업데이트
    const staffIndex = staffList.findIndex((s: any) => s.id === staffId);
    if (staffIndex !== -1) {
      staffList[staffIndex].businessLicenseUrl = filename;
    }
    
    // DB 업데이트
    await c.env.DB.prepare(
      'UPDATE contacts SET staffList = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(JSON.stringify(staffList), contactId).run();
    
    return c.json({ 
      success: true, 
      filename,
      url: `/api/files/${encodeURIComponent(filename)}`
    });
  } catch (error: any) {
    console.error('업로드 오류:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 파일 다운로드 (R2에서)
app.get('/api/files/:filename', async (c) => {
  try {
    const filename = decodeURIComponent(c.req.param('filename'));
    
    // R2에서 파일 가져오기
    const object = await c.env.R2.get(filename);
    
    if (!object) {
      return c.json({ error: '파일을 찾을 수 없습니다.' }, 404);
    }
    
    // 파일 반환
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${filename.split('/').pop()}"`,
      },
    });
  } catch (error: any) {
    console.error('다운로드 오류:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 파일 삭제
app.delete('/api/files/:filename', async (c) => {
  try {
    const filename = decodeURIComponent(c.req.param('filename'));
    await c.env.R2.delete(filename);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('삭제 오류:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
