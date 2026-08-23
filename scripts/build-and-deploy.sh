#!/bin/bash
set -e

APP_DIR="/opt/kairos-igreja-v2"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "==> Extraindo tarball"
tar -xzf /tmp/kairos-igreja-pg.tar.gz --strip-components=1
echo "    OK"

echo "==> Verificando Node"
node --version
npm --version

echo "==> Instalando dependências"
npm ci --no-audit --no-fund 2>&1 | tail -8

echo "==> Gerando Prisma Client (Postgres)"
npx prisma generate 2>&1 | tail -5

echo "==> Build do frontend + bundle do servidor"
npm run build 2>&1 | tail -10

echo "==> Build da imagem Docker"
docker build -t kairos-igreja:latest -f Dockerfile . 2>&1 | tail -8

echo ""
echo "==> IMAGEM PRONTA: kairos-igreja:latest"
docker images | grep kairos-igreja
