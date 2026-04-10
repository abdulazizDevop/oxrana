const fs = require('fs');

const file = './rasul/Desktop/security-tracker/components/InstructionsComponents.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /initial=\{\{ opacity: 0, y: 30, scale: 0\.95 \}\}/g,
    'initial={{ opacity: 0, x: "-50%", y: "-40%", scale: 0.95 }}'
);
content = content.replace(
    /animate=\{\{ opacity: 1, y: 0, scale: 1 \}\}/g,
    'animate={{ opacity: 1, x: "-50%", y: "-50%", scale: 1 }}'
);
content = content.replace(
    /exit=\{\{ opacity: 0, y: 30, scale: 0\.95 \}\}/g,
    'exit={{ opacity: 0, x: "-50%", y: "-40%", scale: 0.95 }}'
);

content = content.replace(/transform: "translate\(-50%, -50%\)", /g, '');

fs.writeFileSync(file, content);
