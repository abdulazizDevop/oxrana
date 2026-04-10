const fs = require('fs');

const file = './rasul/Desktop/security-tracker/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace top: "50%", left: "50%", transform: "translate(-50%,-50%)"
// with x: "-50%", y: "-50%" in animate and initial properties.

content = content.replace(
    /initial=\{\{ opacity: 0, scale: 0\.88, y: 24 \}\} animate=\{\{ opacity: 1, scale: 1, y: 0 \}\}\n\s+exit=\{\{ opacity: 0, scale: 0\.88, y: 24 \}\}/g,
    'initial={{ opacity: 0, scale: 0.88, x: "-50%", y: "-40%" }} animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}\n                exit={{ opacity: 0, scale: 0.88, x: "-50%", y: "-40%" }}'
);

content = content.replace(
    /initial=\{\{ opacity: 0, scale: 0\.88, y: 32 \}\} animate=\{\{ opacity: 1, scale: 1, y: 0 \}\}\n\s+exit=\{\{ opacity: 0, scale: 0\.88, y: 32 \}\}/g,
    'initial={{ opacity: 0, scale: 0.88, x: "-50%", y: "-40%" }} animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}\n                exit={{ opacity: 0, scale: 0.88, x: "-50%", y: "-40%" }}'
);

content = content.replace(/transform: "translate\(-50%,-50%\)", /g, '');

fs.writeFileSync(file, content);
