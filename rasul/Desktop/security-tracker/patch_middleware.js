const fs = require('fs');

let content = fs.readFileSync('middleware.ts', 'utf8');

const rbacCode = `
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // Role-Based Access Control (RBAC)
      const method = request.method;
      const isAdmin = payload?.is_admin === true;
      const allowedSections = payload?.allowed_sections || [];
      
      // Protect Admin-Only Routes
      const adminOnlyPrefixes = ['/api/admin', '/api/cameras', '/api/seed-test-users'];
      if (!isAdmin && adminOnlyPrefixes.some(prefix => pathname.startsWith(prefix))) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }

      // Restrict mutating Users/Cities/Companies
      if (!isAdmin && ['POST', 'PUT', 'DELETE'].includes(method)) {
        if (pathname.startsWith('/api/cities') || pathname.startsWith('/api/companies') || pathname.startsWith('/api/applications') || pathname.startsWith('/api/post-accounting')) {
           return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }
      }

      // User route restriction (only admins or managers with 'employees' section)
      if (pathname.startsWith('/api/users') && !isAdmin && ['POST', 'PUT', 'DELETE'].includes(method)) {
         if (!allowedSections.includes('employees')) {
            return NextResponse.json({ error: 'Forbidden: Employees access required' }, { status: 403 });
         }
      }

      // We allow the request
      return NextResponse.next();
`;

content = content.replace(
  'await jwtVerify(token, JWT_SECRET);\n      return NextResponse.next();',
  rbacCode
);

fs.writeFileSync('middleware.ts', content);
