const fs = require('fs');

let content = fs.readFileSync('middleware.ts', 'utf8');

const cspCode = `
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = \`
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https: http:;
    font-src 'self' data:;
    connect-src 'self' https: http: wss: ws:;
    frame-src 'self' https: http:;
    object-src 'none';
    base-uri 'none';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  \`.replace(/\\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // Security Headers for frontend
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  });
  response.headers.set('Content-Security-Policy', cspHeader);
`;

content = content.replace(
  '  // Security Headers for frontend\n  const response = NextResponse.next();',
  cspCode
);

fs.writeFileSync('middleware.ts', content);
