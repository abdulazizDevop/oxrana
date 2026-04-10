const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'rasul/Desktop/security-tracker/components/sections/EmployeesSection.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '            </div>\n          ))}',
  '            </div>\n            </div>\n          ))}'
);

fs.writeFileSync(filePath, content);
console.log("Fixed missing div");
