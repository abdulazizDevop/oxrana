const { execSync } = require('child_process');

try {
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "UI updates: modal flags and backgrounds"', { stdio: 'inherit' });
  execSync('git branch -M main', { stdio: 'inherit' });
  execSync('git push -u origin main', { stdio: 'inherit' });
  console.log('Push successful');
} catch (e) {
  console.error('Git error:', e.message);
}
