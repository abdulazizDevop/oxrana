const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'rasul/Desktop/security-tracker/lib/auth.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'allowedSections: SectionId[];',
  'allowedSections: SectionId[];\n  allowed_sections?: SectionId[];\n  allowed_cities?: string[];\n  allowed_companies?: string[];'
);

fs.writeFileSync(filePath, content);
console.log("Fixed auth.ts");
