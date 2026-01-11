import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  R2: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS 활성화
app.use('/*', cors());

// POST /api/upload - 파일 업로드 (R2에 저장)
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { data, name, mimeType } = body;

    if (!data || !name) {
      return c.json({ success: false, error: 'Missing file data or name' }, 400);
    }

    // Base64 디코드
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 고유한 파일명 생성 (타임스탬프 + 랜덤 문자열)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = name.split('.').pop() || 'bin';
    const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `attachments/${timestamp}_${randomStr}_${sanitizedName}`;

    // R2에 업로드
    await c.env.R2.put(key, bytes, {
      httpMetadata: {
        contentType: mimeType || 'application/octet-stream'
      }
    });

    // 공개 URL 생성 (R2 public URL 또는 Worker 경로)
    const url = `/api/files/${key}`;

    return c.json({ 
      success: true, 
      data: {
        url,
        key,
        name,
        mimeType,
        size: bytes.length,
        uploadedAt: new Date().toISOString()
      }
    }, 201);
  } catch (error: any) {
    console.error('POST /api/upload error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/files/:key - R2에서 파일 다운로드
app.get('/files/*', async (c) => {
  try {
    const key = c.req.path.replace('/api/files/', '');

    const object = await c.env.R2.get(key);
    if (!object) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, {
      headers
    });
  } catch (error: any) {
    console.error('GET /api/files/* error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
