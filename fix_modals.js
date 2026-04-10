const fs = require('fs');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Pattern for modal 1 (Add City)
    content = content.replace(
        /<motion\.div initial=\{\{ opacity: 0, scale: 0\.88, y: 24 \}\} animate=\{\{ opacity: 1, scale: 1, y: 0 \}\}\n\s+exit=\{\{ opacity: 0, scale: 0\.88, y: 24 \}\} transition=\{\{ type: "spring", stiffness: 320, damping: 28 \}\}\n\s+style=\{\{ position: "fixed", top: "50%", left: "50%", transform: "translate\(-50%,-50%\)",/g,
        '<div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 51, pointerEvents: "none" }}>\n              <motion.div initial={{ opacity: 0, scale: 0.88, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}\n                exit={{ opacity: 0, scale: 0.88, y: 24 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}\n                style={{ pointerEvents: "auto",'
    );

    // Pattern for modal 2 (Add Company)
    content = content.replace(
        /<motion\.div initial=\{\{ opacity: 0, scale: 0\.88, y: 24 \}\} animate=\{\{ opacity: 1, scale: 1, y: 0 \}\}\n\s+exit=\{\{ opacity: 0, scale: 0\.88, y: 24 \}\} transition=\{\{ type: "spring", stiffness: 320, damping: 28 \}\}\n\s+style=\{\{ position: "fixed", top: "50%", left: "50%", transform: "translate\(-50%,-50%\)",/g,
        '<div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 51, pointerEvents: "none" }}>\n              <motion.div initial={{ opacity: 0, scale: 0.88, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}\n                exit={{ opacity: 0, scale: 0.88, y: 24 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}\n                style={{ pointerEvents: "auto",'
    );

    // Pattern for modal 3 (Company Details)
    content = content.replace(
        /<motion\.div initial=\{\{ opacity: 0, scale: 0\.88, y: 32 \}\} animate=\{\{ opacity: 1, scale: 1, y: 0 \}\}\n\s+exit=\{\{ opacity: 0, scale: 0\.88, y: 32 \}\} transition=\{\{ type: "spring", stiffness: 300, damping: 26 \}\}\n\s+style=\{\{ position: "fixed", top: "50%", left: "50%", transform: "translate\(-50%,-50%\)",/g,
        '<div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 101, pointerEvents: "none" }}>\n            <motion.div initial={{ opacity: 0, scale: 0.88, y: 32 }} animate={{ opacity: 1, scale: 1, y: 0 }}\n              exit={{ opacity: 0, scale: 0.88, y: 32 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}\n              style={{ pointerEvents: "auto",'
    );

    // And close the divs for modals
    // Modal 1 end
    content = content.replace(
        /Добавить<\/motion\.button>\n\s+<\/div>\n\s+<\/motion\.div>\n\s+<\/>\n\s+\)}/g,
        'Добавить</motion.button>\n                  </div>\n                </motion.div>\n              </div>\n            </>\n          )}'
    );
    // Modal 2 end (same as 1, but we might need to do it precisely. Let's use sed/awk or just match exactly)

    fs.writeFileSync(filePath, content);
}

fixFile('./rasul/Desktop/security-tracker/app/page.tsx');
