import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS 활성화
app.use('/*', cors());

// POST /api/auth/login - 로그인
app.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM authorized_users WHERE username = ? AND password = ?'
    ).bind(username, password).all();
    
    if (results.length === 0) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }
    
    const user = results[0];
    return c.json({ 
      success: true, 
      data: { 
        id: user.id, 
        name: user.name, 
        username: user.username 
      } 
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/auth/users - 모든 사용자 조회 (관리자용)
app.get('/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, username, created_at FROM authorized_users ORDER BY created_at DESC'
    ).all();
    
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/auth/users - 새 사용자 생성
app.post('/users', async (c) => {
  try {
    const { id, name, username, password } = await c.req.json();
    
    // 중복 확인
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id FROM authorized_users WHERE username = ?'
    ).bind(username).all();
    
    if (existing.length > 0) {
      return c.json({ success: false, error: 'Username already exists' }, 400);
    }
    
    await c.env.DB.prepare(`
      INSERT INTO authorized_users (id, name, username, password)
      VALUES (?, ?, ?, ?)
    `).bind(id, name, username, password).run();
    
    return c.json({ success: true, data: { id } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /api/auth/users/:id - 사용자 수정 (비밀번호 변경)
app.put('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { name, username, password, currentPassword } = await c.req.json();
    
    // 현재 비밀번호 확인
    if (currentPassword) {
      const { results } = await c.env.DB.prepare(
        'SELECT id FROM authorized_users WHERE id = ? AND password = ?'
      ).bind(id, currentPassword).all();
      
      if (results.length === 0) {
        return c.json({ success: false, error: 'Current password is incorrect' }, 401);
      }
    }
    
    // 중복 확인 (자기 자신 제외)
    if (username) {
      const { results: existing } = await c.env.DB.prepare(
        'SELECT id FROM authorized_users WHERE username = ? AND id != ?'
      ).bind(username, id).all();
      
      if (existing.length > 0) {
        return c.json({ success: false, error: 'Username already exists' }, 400);
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
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/auth/users/:id - 사용자 삭제
app.delete('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // admin 계정은 삭제 불가
    if (id === 'admin') {
      return c.json({ success: false, error: 'Cannot delete admin account' }, 403);
    }
    
    await c.env.DB.prepare('DELETE FROM authorized_users WHERE id = ?').bind(id).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
