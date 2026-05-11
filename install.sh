#!/bin/bash

# ============================================================================
# IDC设备管理系统 - Linux 安装引导脚本
# ============================================================================
#
# 功能：检测并安装 Node.js，然后运行 install.js
#
# 使用方法：
#   方式1 - 直接运行：
#     chmod +x install.sh && ./install.sh
#
#   方式2 - 一键安装（推荐）：
#     curl -fsSL https://your-domain/install.sh | bash
#
#   方式3 - 从 GitHub：
#     curl -fsSL https://raw.githubusercontent.com/xxx/xxx/main/install.sh | bash
#
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BRIGHT='\033[1m'
DIM='\033[2m'
MAGENTA='\033[0;35m'
WHITE='\033[0;37m'
RESET='\033[0m'

PIPE="│"
ARROW="▶"
POINTER="❯"
DIAMOND="◆"
CHECK="✔"
CROSS="✖"
WARN="⚠"
INFO="ℹ"

log_info() { echo -e "  ${CYAN}${INFO}${RESET}  $1"; }
log_success() { echo -e "  ${GREEN}${CHECK}${RESET}  $1"; }
log_warning() { echo -e "  ${YELLOW}${WARN}${RESET}  $1"; }
log_error() { echo -e "  ${RED}${CROSS}${RESET}  $1"; }
log_step() { echo -e "\n  ${BRIGHT}${CYAN}${ARROW}${RESET} ${BRIGHT}$1${RESET}"; }
log_divider() { echo -e "  ${DIM}$(printf '─%.0s' {1..56})${RESET}"; }
log_thick_divider() { echo -e "  ${DIM}$(printf '═%.0s' {1..56})${RESET}"; }

SCRIPT_VERSION="1.0.0"
MIN_NODE_VERSION=16

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_banner() {
    local width=58
    local line=$(printf '═%.0s' $(seq 1 $width))

    echo -e ""
    echo -e "  ${CYAN}╔${line}╗${RESET}"
    echo -e "  ${CYAN}║${BRIGHT}${WHITE}    IDC 设备管理系统 - Linux 安装引导脚本${RESET}    ${CYAN}║${RESET}"
    echo -e "  ${CYAN}║${DIM}         Linux Bootstrap Installation Script${RESET}         ${CYAN}║${RESET}"
    echo -e "  ${CYAN}║$(printf '%*s' $width '')║${RESET}" | sed "s/  /  v${SCRIPT_VERSION}  /2"
    echo -e "  ${CYAN}╚${line}╝${RESET}"
    echo -e ""
}

detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif [ -f /etc/redhat-release ]; then
        echo "rhel"
    else
        echo "unknown"
    fi
}

is_root() {
    [ "$(id -u)" -eq 0 ]
}

get_sudo() {
    if is_root; then
        echo ""
    else
        echo "sudo"
    fi
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

get_node_version() {
    if command_exists node; then
        node -e "console.log(process.versions.node.split('.')[0])"
    else
        echo "0"
    fi
}

check_node_version() {
    local version=$(get_node_version)
    [ "$version" -ge "$MIN_NODE_VERSION" ]
}

install_node_debian() {
    local sudo=$(get_sudo)
    log_info "使用 NodeSource 安装 Node.js 20.x..."

    if ! command_exists curl; then
        log_info "安装 curl..."
        $sudo apt-get update -qq
        $sudo apt-get install -y -qq curl
    fi

    log_info "添加 NodeSource 源..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | $sudo -E bash -

    log_info "安装 Node.js..."
    $sudo apt-get install -y -qq nodejs

    if command_exists node; then
        log_success "Node.js $(node -v) 安装成功"
        return 0
    else
        return 1
    fi
}

install_node_rhel() {
    local sudo=$(get_sudo)
    log_info "使用 NodeSource 安装 Node.js 20.x..."

    if ! command_exists curl; then
        log_info "安装 curl..."
        $sudo yum install -y -q curl
    fi

    log_info "添加 NodeSource 源..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | $sudo bash -

    log_info "安装 Node.js..."
    $sudo yum install -y -q nodejs

    if command_exists node; then
        log_success "Node.js $(node -v) 安装成功"
        return 0
    else
        return 1
    fi
}

install_node_arch() {
    local sudo=$(get_sudo)
    log_info "使用 pacman 安装 Node.js..."

    $sudo pacman -S --noconfirm nodejs npm

    if command_exists node; then
        log_success "Node.js $(node -v) 安装成功"
        return 0
    else
        return 1
    fi
}

install_node_nvm() {
    log_info "使用 nvm 安装 Node.js..."

    if [ ! -d "$HOME/.nvm" ]; then
        log_info "安装 nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi

    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    log_info "安装 Node.js 20..."
    nvm install 20
    nvm use 20
    nvm alias default 20

    if command_exists node; then
        log_success "Node.js $(node -v) 安装成功"
        return 0
    else
        return 1
    fi
}

auto_install_node() {
    local distro=$(detect_distro)

    log_step "自动安装 Node.js"
    log_info "检测到 Linux 发行版: $distro"

    case $distro in
        ubuntu|debian)
            install_node_debian
            ;;
        centos|rhel|fedora|rocky|almalinux)
            install_node_rhel
            ;;
        arch|manjaro)
            install_node_arch
            ;;
        *)
            log_warning "未知发行版，尝试使用 nvm 安装..."
            install_node_nvm
            ;;
    esac
}

show_manual_install_guide() {
    echo -e ""
    echo -e "  ${BRIGHT}${MAGENTA}${DIAMOND}${RESET} ${BRIGHT}Node.js 手动安装指引${RESET}"
    log_divider()

    echo -e "  ${PIPE}  ${YELLOW}Ubuntu/Debian:${RESET}"
    echo -e "  ${PIPE}    ${CYAN}curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -${RESET}"
    echo -e "  ${PIPE}    ${CYAN}sudo apt-get install -y nodejs${RESET}"
    echo -e ""
    echo -e "  ${PIPE}  ${YELLOW}CentOS/RHEL/Fedora:${RESET}"
    echo -e "  ${PIPE}    ${CYAN}curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -${RESET}"
    echo -e "  ${PIPE}    ${CYAN}sudo yum install -y nodejs${RESET}"
    echo -e ""
    echo -e "  ${PIPE}  ${YELLOW}Arch Linux:${RESET}"
    echo -e "  ${PIPE}    ${CYAN}sudo pacman -S nodejs npm${RESET}"
    echo -e ""
    echo -e "  ${PIPE}  ${YELLOW}使用 nvm（推荐开发者）:${RESET}"
    echo -e "  ${PIPE}    ${CYAN}curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash${RESET}"
    echo -e "  ${PIPE}    ${CYAN}source ~/.bashrc && nvm install 20 && nvm use 20${RESET}"
    echo -e ""
    echo -e "  ${PIPE}  ${YELLOW}验证安装:${RESET}"
    echo -e "  ${PIPE}    ${CYAN}node -v${RESET}   # 应显示 v20.x.x"
    echo -e "  ${PIPE}    ${CYAN}npm -v${RESET}    # 应显示 10.x.x"
    log_divider()
    log_info "安装完成后，请重新运行此脚本继续安装 IDC 设备管理系统"
}

check_and_install_dependencies() {
    log_step "检查系统依赖"

    local sudo=$(get_sudo)
    local distro=$(detect_distro)
    local needs_install=()

    if ! command_exists git; then
        needs_install+=("git")
    fi

    if ! command_exists curl; then
        needs_install+=("curl")
    fi

    if ! command_exists wget; then
        needs_install+=("wget")
    fi

    if [ ${#needs_install[@]} -gt 0 ]; then
        log_info "需要安装依赖: ${needs_install[*]}"

        case $distro in
            ubuntu|debian)
                $sudo apt-get update -qq
                $sudo apt-get install -y -qq "${needs_install[@]}"
                ;;
            centos|rhel|fedora|rocky|almalinux)
                $sudo yum install -y -q "${needs_install[@]}"
                ;;
            arch|manjaro)
                $sudo pacman -S --noconfirm "${needs_install[@]}"
                ;;
            *)
                log_warning "无法自动安装依赖，请手动安装: ${needs_install[*]}"
                return 1
                ;;
        esac

        log_success "依赖安装完成"
    else
        log_success "系统依赖已满足"
    fi
}

main() {
    show_banner

    if [ ! -f "$SCRIPT_DIR/install.js" ]; then
        log_error "未找到 install.js 文件"
        log_info "请在项目根目录运行此脚本"
        exit 1
    fi

    log_step "检查 Node.js 环境"

    if command_exists node; then
        local node_version=$(get_node_version)
        log_info "检测到 Node.js: $(node -v)"

        if check_node_version; then
            log_success "Node.js 版本满足要求 (>= v$MIN_NODE_VERSION)"
        else
            log_warning "Node.js 版本过低 (v$node_version < v$MIN_NODE_VERSION)"

            echo -e "  ${POINTER} ${CYAN}1${RESET}) 自动升级 Node.js 到 v20（推荐）"
            echo -e "    ${DIM}2${RESET}) 显示手动安装指引"
            echo -e "    ${DIM}3${RESET}) 退出"

            read -p "  ❯ 请选择 [1-3]: " choice

            case $choice in
                1)
                    auto_install_node || {
                        log_error "Node.js 升级失败"
                        show_manual_install_guide
                        exit 1
                    }
                    export PATH="/usr/bin:$HOME/.nvm/versions/node/v20*/bin:$PATH"
                    hash -r
                    ;;
                2)
                    show_manual_install_guide
                    exit 0
                    ;;
                3)
                    log_info "已取消安装"
                    exit 0
                    ;;
                *)
                    log_error "无效选择"
                    exit 1
                    ;;
            esac
        fi
    else
        log_warning "未检测到 Node.js"

        echo -e "  ${POINTER} ${CYAN}1${RESET}) 自动安装 Node.js v20（推荐）"
        echo -e "    ${DIM}2${RESET}) 显示手动安装指引"
        echo -e "    ${DIM}3${RESET}) 退出"

        read -p "  ❯ 请选择 [1-3]: " choice

        case $choice in
            1)
                check_and_install_dependencies
                auto_install_node || {
                    log_error "Node.js 安装失败"
                    show_manual_install_guide
                    exit 1
                }
                export PATH="/usr/bin:$HOME/.nvm/versions/node/v20*/bin:$PATH"
                hash -r
                ;;
            2)
                show_manual_install_guide
                exit 0
                ;;
            3)
                log_info "已取消安装"
                exit 0
                ;;
            *)
                log_error "无效选择"
                exit 1
                ;;
        esac
    fi

    log_step "检查 npm"
    if command_exists npm; then
        log_success "npm $(npm -v)"
    else
        log_warning "npm 未安装，尝试自动安装..."

        local distro=$(detect_distro)
        local sudo=$(get_sudo)

        case $distro in
            ubuntu|debian)
                $sudo apt-get update -qq
                $sudo apt-get install -y -qq npm
                ;;
            centos|rhel|fedora|rocky|almalinux)
                $sudo yum install -y -q npm
                ;;
            arch|manjaro)
                $sudo pacman -S --noconfirm npm
                ;;
            *)
                if command_exists corepack; then
                    log_info "尝试使用 corepack 启用 npm..."
                    corepack enable
                    corepack prepare npm@latest --activate
                else
                    log_error "无法自动安装 npm，请手动安装"
                    echo -e "  ${PIPE}  ${YELLOW}手动安装 npm：${RESET}"
                    echo -e "  ${PIPE}    Ubuntu/Debian: ${CYAN}sudo apt-get install npm${RESET}"
                    echo -e "  ${PIPE}    CentOS/RHEL: ${CYAN}sudo yum install npm${RESET}"
                    exit 1
                fi
                ;;
        esac

        if command_exists npm; then
            log_success "npm $(npm -v) 安装成功"
        else
            log_error "npm 安装失败，请手动安装"
            exit 1
        fi
    fi

    log_divider
    log_success "环境检查通过！"

    log_step "启动安装程序"
    log_info "正在运行 install.js..."
    echo ""

    cd "$SCRIPT_DIR"
    node install.js "$@"
}

main "$@"
