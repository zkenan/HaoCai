#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker未安装，请先安装Docker"
    exit 1
fi

if ! docker compose version &> /dev/null 2>&1 && ! docker-compose version &> /dev/null; then
    print_error "Docker Compose未安装"
    exit 1
fi

print_info "Docker版本: $(docker --version)"

# 检查并创建.env
if [ ! -f .env ]; then
    print_warn ".env文件不存在，正在创建..."
    cp .env.example .env
    print_info "已创建 .env 文件"
    echo ""
    print_warn "请修改 .env 文件中的数据库配置："
    echo "  DB_HOST     - MySQL服务器IP"
    echo "  DB_USER     - 数据库用户名"
    echo "  DB_PASSWORD - 数据库密码"
    echo "  JWT_SECRET  - JWT密钥（运行 openssl rand -hex 32 生成）"
    echo ""
    read -p "修改完成后按回车继续..."
fi

# 停止旧容器
print_info "停止旧容器..."
if docker compose version &> /dev/null 2>&1; then
    docker compose down 2>/dev/null || true
else
    docker-compose down 2>/dev/null || true
fi

# 构建并启动
print_info "构建并启动服务..."
if docker compose version &> /dev/null 2>&1; then
    docker compose build
    docker compose up -d
else
    docker-compose build
    docker-compose up -d
fi

# 等待启动
print_info "等待服务启动..."
sleep 5

# 检查状态
if curl -s -o /dev/null -w "" http://localhost:3000/ 2>/dev/null; then
    echo ""
    echo "=========================================="
    echo "  部署完成！"
    echo "=========================================="
    echo ""
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo "访问地址: http://${SERVER_IP}:3000"
    echo ""
    echo "默认管理员: admin / admin123"
    echo "请登录后立即修改默认密码！"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker compose logs -f"
    echo "  停止服务: docker compose down"
    echo "  重启服务: docker compose restart"
    echo "=========================================="
else
    print_error "服务启动失败，请检查日志: docker compose logs"
fi
