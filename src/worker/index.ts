import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, AuthUser, Contact, Staff } from './types';

const app = new Hono<{ Bindings: Env }>();

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
    
    const user = await c.env.DB.prepare(
      'SELECT * FROM auth_users WHERE username = ?'
    ).bind(username).first<AuthUser>();

    if (!user || password !== 'geosang777') {
      return c.json({ error: '인증 실패' }, 401);
    }

    return c.json({
      token: `token-${user.id}-${Date.now()}`,
      user: { id: user.id, name: user.name, username: user.username }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/auth/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, username FROM auth_users'
    ).all<AuthUser>();
    return c.json({ users: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/auth/users', async (c) => {
  try {
    const { name, username, password } = await c.req.json();
    const id = Date.now().toString();
    
    await c.env.DB.prepare(
      'INSERT INTO auth_users (id, name, username, password_hash) VALUES (?, ?, ?, ?)'
    ).bind(id, name, username, password).run();

    return c.json({ user: { id, name, username } });
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
    await c.env.DB.prepare('DELETE FROM auth_users WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== 연락처 API ==========
app.get('/api/contacts', async (c) => {
  try {
    const category = c.req.query('category');
    let query = 'SELECT * FROM contacts';
    const params: any[] = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all<any>();

    const contactsWithStaff = await Promise.all(
      results.map(async (contact) => {
        const { results: staffList } = await c.env.DB.prepare(
          'SELECT * FROM staff WHERE contact_id = ?'
        ).bind(contact.id).all<Staff>();

        let licenseFile = undefined;
        if (contact.license_file_data) {
          licenseFile = {
            data: contact.license_file_data,
            name: contact.license_file_name || '',
            mimeType: contact.license_file_mime_type || ''
          };
        }

        return {
          id: contact.id,
          category: contact.category,
          brandName: contact.brand_name,
          industry: contact.industry,
          subCategory: contact.sub_category,
          address: contact.address,
          phone: contact.phone,
          phone2: contact.phone2,
          email: contact.email,
          homepage: contact.homepage,
          bankAccount: contact.bank_account,
          licenseFile,
          staffList: staffList || []
        };
      })
    );

    return c.json({ contacts: contactsWithStaff });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/contacts', async (c) => {
  try {
    const data = await c.req.json();
    const { staffList, licenseFile, ...contactData } = data;
    const id = data.id || Date.now().toString();
    
    await c.env.DB.prepare(
      `INSERT INTO contacts (
        id, category, brand_name, industry, sub_category, address,
        phone, phone2, email, homepage, bank_account,
        license_file_data, license_file_name, license_file_mime_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, contactData.category, contactData.brandName || null,
      contactData.industry || null, contactData.subCategory || null,
      contactData.address || null, contactData.phone || null,
      contactData.phone2 || null, contactData.email || null,
      contactData.homepage || null, contactData.bankAccount || null,
      licenseFile?.data || null, licenseFile?.name || null,
      licenseFile?.mimeType || null
    ).run();

    if (staffList && staffList.length > 0) {
      for (const staff of staffList) {
        await c.env.DB.prepare(
          `INSERT INTO staff (
            id, contact_id, name, position, phone, email, department,
            rating, region, bank_account, resident_number, features
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          staff.id, id, staff.name, staff.position || null,
          staff.phone || null, staff.email || null,
          staff.department || null, staff.rating || 5,
          staff.region || null, staff.bankAccount || null,
          staff.residentNumber || null, staff.features || null
        ).run();
      }
    }

    return c.json({ id, success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/api/contacts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const { staffList, licenseFile, ...contactData } = data;

    await c.env.DB.prepare(
      `UPDATE contacts SET
        category = ?, brand_name = ?, industry = ?, sub_category = ?,
        address = ?, phone = ?, phone2 = ?, email = ?, homepage = ?,
        bank_account = ?, license_file_data = ?, license_file_name = ?,
        license_file_mime_type = ?
      WHERE id = ?`
    ).bind(
      contactData.category, contactData.brandName || null,
      contactData.industry || null, contactData.subCategory || null,
      contactData.address || null, contactData.phone || null,
      contactData.phone2 || null, contactData.email || null,
      contactData.homepage || null, contactData.bankAccount || null,
      licenseFile?.data || null, licenseFile?.name || null,
      licenseFile?.mimeType || null, id
    ).run();

    await c.env.DB.prepare('DELETE FROM staff WHERE contact_id = ?').bind(id).run();

    if (staffList && staffList.length > 0) {
      for (const staff of staffList) {
        await c.env.DB.prepare(
          `INSERT INTO staff (
            id, contact_id, name, position, phone, email, department,
            rating, region, bank_account, resident_number, features
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          staff.id, id, staff.name, staff.position || null,
          staff.phone || null, staff.email || null,
          staff.department || null, staff.rating || 5,
          staff.region || null, staff.bankAccount || null,
          staff.residentNumber || null, staff.features || null
        ).run();
      }
    }

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

// ========== 설정 API ==========
app.get('/api/settings/departments', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT name FROM departments').all<{name: string}>();
    return c.json({ departments: results.map(r => r.name) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/settings/departments', async (c) => {
  try {
    const { name } = await c.req.json();
    await c.env.DB.prepare('INSERT OR IGNORE INTO departments (name) VALUES (?)').bind(name).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/settings/industries', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT name FROM industries').all<{name: string}>();
    return c.json({ industries: results.map(r => r.name) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/settings/industries', async (c) => {
  try {
    const { name } = await c.req.json();
    await c.env.DB.prepare('INSERT OR IGNORE INTO industries (name) VALUES (?)').bind(name).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/settings/outsource-types', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT name FROM outsource_types').all<{name: string}>();
    return c.json({ outsourceTypes: results.map(r => r.name) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/settings/outsource-types', async (c) => {
  try {
    const { name } = await c.req.json();
    await c.env.DB.prepare('INSERT OR IGNORE INTO outsource_types (name) VALUES (?)').bind(name).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/api/settings/rename', async (c) => {
  try {
    const { type, oldName, newName } = await c.req.json();
    
    if (type === 'DEPT') {
      await c.env.DB.prepare('UPDATE departments SET name = ? WHERE name = ?').bind(newName, oldName).run();
      await c.env.DB.prepare('UPDATE staff SET department = ? WHERE department = ?').bind(newName, oldName).run();
    } else if (type === 'INDUSTRY') {
      await c.env.DB.prepare('UPDATE industries SET name = ? WHERE name = ?').bind(newName, oldName).run();
      await c.env.DB.prepare('UPDATE contacts SET industry = ? WHERE industry = ?').bind(newName, oldName).run();
    } else if (type === 'OUTSOURCE') {
      await c.env.DB.prepare('UPDATE outsource_types SET name = ? WHERE name = ?').bind(newName, oldName).run();
      await c.env.DB.prepare('UPDATE contacts SET sub_category = ? WHERE sub_category = ?').bind(newName, oldName).run();
    }

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== 파일 업로드 API ==========
// 🔴 Cloudflare Workers는 파일 시스템을 지원하지 않습니다
// 📝 메타데이터만 저장하고, 파일은 프론트엔드에서 localStorage/IndexedDB에 저장합니다
app.post('/api/files/upload', async (c) => {
  try {
    const { storeName, documentType, fileName, fileData, mimeType } = await c.req.json();
    
    if (!storeName || !fileName || !fileData) {
      return c.json({ error: '필수 파라미터가 누락되었습니다.' }, 400);
    }

    // 정규화된 경로 생성
    const sanitizedStoreName = storeName.replace(/[\/\\:*?"<>|]/g, '_');
    const sanitizedDocType = (documentType || '기타').replace(/[\/\\:*?"<>|]/g, '_');
    const aiDrivePath = `/거상워크플로우/${sanitizedStoreName}/${sanitizedDocType}/${fileName}`;

    console.log(`📁 파일 메타데이터 생성: ${aiDrivePath}`);
    console.log(`📄 파일명: ${fileName}, 타입: ${mimeType}`);

    // 🔴 Cloudflare Workers에서는 파일 시스템을 사용할 수 없습니다
    // ✅ 메타데이터만 반환하고, 실제 파일은 프론트엔드에서 관리합니다
    return c.json({ 
      success: true, 
      aiDrivePath,
      metadata: {
        storeName: sanitizedStoreName,
        documentType: sanitizedDocType,
        fileName,
        mimeType,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('파일 업로드 에러:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
