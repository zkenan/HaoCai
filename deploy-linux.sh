#!/bin/bash

# 耗材管理系统 Linux 部署脚本（使用外部MySQL数据库）
# 使用方法: chmod +x deploy-linux.sh && sudo ./deploy-linux.sh

set -e

APP_NAME="xapiaihaocai"
APP_DIR="/opt/xapiaihaocai"
SERVICE_NAME="xapiaihaocai"
NODE_VERSION="18"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "请使用root用户或sudo运行此脚本"
        exit 1
    fi
}

install_node() {
    if ! command -v node &> /dev/null; then
        print_info "安装Node.js ${NODE_VERSION}..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
        apt-get install -y nodejs
    else
        print_info "Node.js已安装: $(node -v)"
    fi
}

install_nginx() {
    if ! command -v nginx &> /dev/null; then
        print_info "安装Nginx..."
        apt-get install -y nginx
    else
        print_info "Nginx已安装"
    fi
}

create_app_dir() {
    print_info "创建应用目录..."
    mkdir -p $APP_DIR
    mkdir -p $APP_DIR/uploads
    mkdir -p $APP_DIR/uploads/backups
}

copy_app_files() {
    print_info "复制应用文件..."
    cp -r ./* $APP_DIR/
    cp .env $APP_DIR/.env 2>/dev/null || true

    print_info "安装后端依赖..."
    cd $APP_DIR/server
    npm install --production

    print_info "构建前端..."
    cd $APP_DIR/client
    npm install
    npm run build
}

configure_env() {
    if [ -f $APP_DIR/.env ]; then
        print_warn ".env 文件已存在，跳过创建"
        return
    fi

    print_info "配置外部MySQL数据库连接..."
    echo ""

    read -p "请输入MySQL主机地址 [192.168.20.17]: " DB_HOST
    DB_HOST=${DB_HOST:-192.168.20.17}

    read -p "请输入MySQL端口 [3306]: " DB_PORT
    DB_PORT=${DB_PORT:-3306}

    read -p "请输入数据库名称 [xapiaihaocai]: " DB_DATABASE
    DB_DATABASE=${DB_DATABASE:-xapiaihaocai}

    read -p "请输入数据库用户名 [aihaocai]: " DB_USER
    DB_USER=${DB_USER:-aihaocai}

    read -sp "请输入数据库密码: " DB_PASSWORD
    echo ""
    if [ -z "$DB_PASSWORD" ]; then
        print_error "数据库密码不能为空"
        exit 1
    fi

    JWT_SECRET=$(openssl rand -hex 32)

    cat > $APP_DIR/.env << EOF
# 数据库配置（外部MySQL）
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_DATABASE=$DB_DATABASE
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# JWT配置
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3000
NODE_ENV=production
EOF

    print_info ".env 文件已创建"
}

create_systemd_service() {
    print_info "创建systemd服务..."

    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=XapiAiHaoCai Consumable Management System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/server
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    systemctl start $SERVICE_NAME

    print_info "服务创建完成"
}

configure_nginx() {
    print_info "配置Nginx..."

    cat > /etc/nginx/sites-available/$APP_NAME << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    location / {
        root /opt/xapiaihaocai/server/public;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
NGINXEOF

    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    nginx -t && systemctl reload nginx

    print_info "Nginx配置完成"
}

configure_firewall() {
    print_info "配置防火墙..."

    if command -v ufw &> /dev/null; then
        ufw allow 'Nginx Full'
        ufw allow ssh
        ufw --force enable
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
    fi

    print_info "防火墙配置完成"
}

show_info() {
    echo ""
    echo "=========================================="
    echo "  部署完成！"
    echo "=========================================="
    echo ""
    echo "应用目录: $APP_DIR"
    echo "服务名称: $SERVICE_NAME"
    echo ""
    echo "常用命令:"
    echo "  启动服务: systemctl start $SERVICE_NAME"
    echo "  停止服务: systemctl stop $SERVICE_NAME"
    echo "  重启服务: systemctl restart $SERVICE_NAME"
    echo "  查看状态: systemctl status $SERVICE_NAME"
    echo "  查看日志: journalctl -u $SERVICE_NAME -f"
    echo ""
    echo "访问地址: http://$(hostname -I | awk '{print $1}')"
    echo ""
    echo "注意: 首次启动会自动创建数据库表和默认管理员账号"
    echo "默认管理员: admin / admin123"
    echo "请尽快登录后修改默认密码！"
    echo "=========================================="
}

main() {
    check_root

    echo "=========================================="
    echo "  耗材管理系统 Linux 部署脚本"
    echo "  (使用外部MySQL数据库)"
    echo "=========================================="
    echo ""

    print_info "更新系统包..."
    apt-get update
    apt-get upgrade -y

    install_node
    install_nginx

    create_app_dir
    copy_app_files
    configure_env

    create_systemd_service
    configure_nginx
    configure_firewall

    show_info
}

main "$@"
