import http from 'node:http';

const PORT = Number(process.env.PORT || 3105);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
const OPENAI_ORIGIN = 'https://api.openai.com';

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is required');
  process.exit(1);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (!url.pathname.startsWith('/openai/v1/')) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': 'https://www.sanjayfuloria.tech',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const targetPath = url.pathname.replace('/openai/v1/', '/v1/');
    const targetUrl = `${OPENAI_ORIGIN}${targetPath}${url.search}`;
    const headers = {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    };

    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }

    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
      duplex: 'half',
    });

    res.writeHead(upstream.status, {
      'Access-Control-Allow-Origin': 'https://www.sanjayfuloria.tech',
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
    });
    const arrayBuffer = await upstream.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error(error);
    sendJson(res, 502, { error: 'OpenAI proxy error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`EduMind OpenAI proxy listening on 127.0.0.1:${PORT}`);
});
