const fs = require('fs');

let content = fs.readFileSync('app/layout.tsx', 'utf8');

// import headers
if (!content.includes('from "next/headers"')) {
    content = 'import { headers } from "next/headers";\n' + content;
}

// read nonce in layout
content = content.replace(
  'export default function RootLayout({',
  'export default async function RootLayout({'
);
content = content.replace(
  'return (\n    <html',
  'const nonce = (await headers()).get("x-nonce") || "";\n  return (\n    <html'
);

content = content.replace(
  '<script dangerouslySetInnerHTML',
  '<script nonce={nonce} dangerouslySetInnerHTML'
);

fs.writeFileSync('app/layout.tsx', content);
