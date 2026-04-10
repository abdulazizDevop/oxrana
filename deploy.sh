#!/bin/bash
set -e

APP_DIR="/opt/oxrana"
cd $APP_DIR

echo "🚀 Deploy boshlandi..."

# 1. Yangi kod
echo "📥 Git pull..."
git pull origin main

# 2. Docker build va restart
echo "🐳 Docker build..."
docker compose down 2>/dev/null || true
docker compose up -d --build

# 3. Nginx
echo "⚙️ Nginx..."
cp nginx.conf /etc/nginx/sites-available/oxrana
ln -sf /etc/nginx/sites-available/oxrana /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "✅ Deploy muvaffaqiyatli!"
echo "🌐 http://5.129.247.234"
docker ps --filter name=oxrana
