#!/bin/bash

# 安装Docker和Docker Compose脚本
# 使用方法: sudo ./install-docker.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "请使用root用户或sudo运行此脚本"
        exit 1
    fi
}

# 安装Docker
install_docker() {
    if command -v docker &> /dev/null; then
        print_info "Docker已安装: $(docker --version)"
        return
    fi
    
    print_info "安装Docker..."
    
    # 更新包索引
    apt-get update
    
    # 安装Docker
    apt-get install -y docker.io
    
    # 启动Docker服务
    systemctl start docker
    systemctl enable docker
    
    print_info "Docker安装完成"
}

# 安装Docker Compose
install_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        print_info "Docker Compose已安装: $(docker-compose --version)"
        return
    fi
    
    print_info "安装Docker Compose..."
    
    # 下载Docker Compose
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -o '"tag_name": "[^"]*"' | cut -d'"' -f4)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 添加执行权限
    chmod +x /usr/local/bin/docker-compose
    
    print_info "Docker Compose安装完成"
}

# 将当前用户添加到docker组
add_user_to_docker() {
    if [[ -n "$SUDO_USER" ]]; then
        usermod -aG docker "$SUDO_USER"
        print_info "用户 $SUDO_USER 已添加到docker组"
    fi
}

# 主函数
main() {
    echo "=========================================="
    echo "  安装Docker和Docker Compose"
    echo "=========================================="
    echo ""
    
    check_root
    install_docker
    install_docker_compose
    add_user_to_docker
    
    echo ""
    echo "=========================================="
    echo "  安装完成！"
    echo "=========================================="
    echo ""
    echo "Docker版本: $(docker --version)"
    echo "Docker Compose版本: $(docker-compose --version)"
    echo ""
    echo "请重新登录或运行以下命令使docker组生效:"
    echo "  newgrp docker"
    echo ""
    echo "然后可以运行部署脚本:"
    echo "  ./deploy-docker.sh"
    echo "=========================================="
}

# 运行主函数
main "$@"
