#!/bin/bash
set -e

SERVER="root@5.129.247.234"
APP_DIR="/root/oxrana"

echo "🚀 Deploy boshlandi..."

# 1. Serverda kerakli dasturlarni o'rnatish
echo "📦 Server sozlanmoqda..."
ssh $SERVER << 'SETUP'
# Docker o'rnatish (agar yo'q bo'lsa)
if ! command -v docker &> /dev/null; then
    echo "Docker o'rnatilmoqda..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Nginx o'rnatish (agar yo'q bo'lsa)
if ! command -v nginx &> /dev/null; then
    echo "Nginx o'rnatilmoqda..."
    apt-get update && apt-get install -y nginx
    systemctl enable nginx
fi

# Papka yaratish
mkdir -p /root/oxrana
SETUP

# 2. Fayllarni serverga ko'chirish
echo "📁 Fayllar ko'chirilmoqda..."
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
    -e ssh ./ $SERVER:$APP_DIR/

# 3. .env.local alohida ko'chirish
echo "🔐 Environment fayllar ko'chirilmoqda..."
scp .env.local $SERVER:$APP_DIR/.env.local

# 4. Serverda build va ishga tushirish
echo "🐳 Docker build va start..."
ssh $SERVER << 'DEPLOY'
cd /root/oxrana

# Docker build
docker compose down 2>/dev/null || true
docker compose up -d --build

# Nginx config
cp nginx.conf /etc/nginx/sites-available/oxrana
ln -sf /etc/nginx/sites-available/oxrana /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "✅ Deploy muvaffaqiyatli!"
echo "🌐 http://5.129.247.234"
echo ""
docker ps --filter name=oxrana --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
DEPLOY

echo ""
echo "✅ Tayyor! Brauzerda oching: http://5.129.247.234"
