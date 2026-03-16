#!/bin/bash
#
# sreg-storage.sh - 对象存储镜像包管理工具（配置文件版本）
#
# 功能：
#   save: 保存镜像到本地、打包并上传到对象存储
#   load: 从对象存储下载或使用本地tar包，解压并同步到目标registry
#
# 使用方式：
#   ./sreg-storage.sh save --config=/path/to/config.yaml
#   ./sreg-storage.sh load --config=/path/to/config.yaml
#

set -ex

RCLONE_CONFIG_FILE=""
RCLONE_GLOBAL_ARGS=()

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    local deps=("sreg" "tar" "gzip" "python3")
    if [[ "$1" == "load" || "$1" == "save" ]]; then
        deps+=("rclone")
    fi

    for cmd in "${deps[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "缺少依赖命令: $cmd"
            exit 1
        fi
    done

    if ! python3 -c "import yaml" 2>/dev/null; then
        log_error "缺少 Python 模块: PyYAML"
        exit 1
    fi
}

parse_config() {
    local config_file="$1"

    if [[ ! -f "$config_file" ]]; then
        log_error "配置文件不存在: $config_file"
        exit 1
    fi

    python3 <<EOF
import yaml
import sys
import json

try:
    with open('$config_file', 'r') as f:
        config = yaml.safe_load(f)

    if 'rclone' in config:
        print(f"export RCLONE_REMOTE='{config['rclone'].get('remote', '')}'")
        rclone_config = config['rclone'].get('config')
        if rclone_config:
            print(f"export RCLONE_CONFIG_JSON='{json.dumps(rclone_config)}'")
            override_config = rclone_config.get('override', {})
            if isinstance(override_config, dict) and 'no_check_certificate' in override_config:
                print(f"export RCLONE_NO_CHECK_CERTIFICATE_OVERRIDE='{str(override_config.get('no_check_certificate')).lower()}'")
            global_config = rclone_config.get('global', {})
            if isinstance(global_config, dict) and 'no_check_certificate' in global_config:
                print(f"export RCLONE_NO_CHECK_CERTIFICATE_GLOBAL='{str(global_config.get('no_check_certificate')).lower()}'")

    if 'tmp_dir' in config:
        print(f"export TMP_DIR='{config['tmp_dir']}'")

    if 'save' in config:
        save_config = config['save']
        if 'path' in save_config:
            print(f"export RCLONE_PATH='{save_config['path']}'")
        if 'images' in save_config:
            images = save_config['images']
            if isinstance(images, list):
                print(f"export IMAGES='{json.dumps(images)}'")

    if 'load' in config:
        load_config = config['load']
        if 'source' in load_config:
            source = load_config['source']
            if 'remote' in source:
                print(f"export SOURCE_REMOTE='{source['remote']}'")
            if 'local' in source:
                print(f"export SOURCE_LOCAL='{source['local']}'")
        if 'extract_dir' in load_config:
            print(f"export EXTRACT_DIR='{load_config['extract_dir']}'")
        if 'local_registry' in load_config:
            local_reg = load_config['local_registry']
            if 'port' in local_reg:
                print(f"export LOCAL_REGISTRY_PORT='{local_reg['port']}'")
        if 'dest_registry' in load_config:
            dest_reg = load_config['dest_registry']
            if 'url' in dest_reg:
                print(f"export DEST_REGISTRY='{dest_reg['url']}'")

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
EOF
}

load_config() {
    local config_file="$1"

    log_info "加载配置文件: $config_file"
    eval "$(parse_config "$config_file")"

    TMP_DIR="${TMP_DIR:-/tmp/sreg-storage}"
    LOCAL_REGISTRY_PORT="${LOCAL_REGISTRY_PORT:-15001}"

    if [[ -z "$RCLONE_REMOTE" ]]; then
        log_error "配置文件缺少必选项: rclone.remote"
        exit 1
    fi
}

setup_rclone_config() {
    local remote="$1"
    local config_json="${RCLONE_CONFIG_JSON:-}"
    local no_check_certificate_override="${RCLONE_NO_CHECK_CERTIFICATE_OVERRIDE:-}"
    local no_check_certificate_global="${RCLONE_NO_CHECK_CERTIFICATE_GLOBAL:-}"

    if [[ -n "$config_json" ]]; then
        local config_dir="${TMP_DIR}/rclone"
        local config_file="${config_dir}/rclone.conf"

        mkdir -p "$config_dir"
        rm -f "$config_file"

        log_info "根据配置文件创建 rclone remote: $remote"

        local create_args
        if ! create_args=$(RCLONE_REMOTE_NAME="$remote" RCLONE_CONFIG_JSON="$config_json" python3 <<'EOF'
import json
import os
import shlex
import sys

remote = os.environ["RCLONE_REMOTE_NAME"]
config = json.loads(os.environ["RCLONE_CONFIG_JSON"])

remote_type = config.get("type")
if not remote_type:
    print("missing rclone.config.type", file=sys.stderr)
    sys.exit(1)

args = ["config", "create", remote, str(remote_type)]
for key, value in config.items():
    if key == "type" or value is None:
        continue
    if isinstance(value, dict):
        for sub_key, sub_value in value.items():
            if sub_value is None:
                continue
            flat_key = f"{key}.{sub_key}"
            if isinstance(sub_value, bool):
                sub_value = "true" if sub_value else "false"
            elif isinstance(sub_value, (dict, list)):
                sub_value = json.dumps(sub_value, ensure_ascii=False)
            else:
                sub_value = str(sub_value)
            args.extend([flat_key, sub_value])
        continue
    if isinstance(value, bool):
        value = "true" if value else "false"
    elif isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    else:
        value = str(value)
    args.extend([key, value])

print(" ".join(shlex.quote(arg) for arg in args))
EOF
); then
            log_error "解析 rclone.config 失败，请检查 YAML 配置"
            exit 1
        fi

        if ! rclone --config "$config_file" $create_args >/dev/null; then
            log_error "创建 rclone remote 失败"
            exit 1
        fi

        export RCLONE_CONFIG="$config_file"
        RCLONE_CONFIG_FILE="$config_file"
        RCLONE_GLOBAL_ARGS=(--config "$config_file")
        if [[ "$no_check_certificate_override" == "true" || "$no_check_certificate_global" == "true" ]]; then
            RCLONE_GLOBAL_ARGS+=(--no-check-certificate)
        fi
        return 0
    fi

    local config_type="RCLONE_CONFIG_${remote^^}_TYPE"

    if [[ -n "${!config_type}" ]]; then
        log_info "使用环境变量配置 rclone remote: $remote"
        RCLONE_GLOBAL_ARGS=()
        if [[ "$no_check_certificate_override" == "true" || "$no_check_certificate_global" == "true" ]]; then
            RCLONE_GLOBAL_ARGS+=(--no-check-certificate)
        fi
        return 0
    fi

    if ! rclone listremotes 2>/dev/null | grep -q "^${remote}:$"; then
        log_error "rclone remote \"$remote\" 不存在"
        exit 1
    fi

    log_info "使用已配置的 rclone remote: $remote"
    RCLONE_GLOBAL_ARGS=()
    if [[ "$no_check_certificate_override" == "true" || "$no_check_certificate_global" == "true" ]]; then
        RCLONE_GLOBAL_ARGS+=(--no-check-certificate)
    fi
}

rclone_run() {
    rclone "${RCLONE_GLOBAL_ARGS[@]}" "$@"
}

ensure_remote_parent_dir() {
    local remote="$1"
    local remote_file_path="$2"
    local parent_dir="${remote_file_path%/*}"

    if [[ "$parent_dir" == "$remote_file_path" || -z "$parent_dir" || "$parent_dir" == "." ]]; then
        return 0
    fi

    log_info "确保对象存储目录存在: ${remote}:${parent_dir}"
    if ! rclone_run mkdir "${remote}:${parent_dir}"; then
        log_error "创建对象存储目录失败: ${remote}:${parent_dir}"
        exit 1
    fi
}

cleanup() {
    if [[ -n "$RCLONE_CONFIG_FILE" && -f "$RCLONE_CONFIG_FILE" ]]; then
        log_info "清理临时 rclone 配置: $RCLONE_CONFIG_FILE"
        rm -f "$RCLONE_CONFIG_FILE"
        rmdir "$(dirname "$RCLONE_CONFIG_FILE")" 2>/dev/null || true
    fi
    if [[ -d "$TMP_DIR" ]]; then
        log_info "清理临时目录: $TMP_DIR"
        rm -rf "$TMP_DIR"
    fi
}

cmd_save() {
    local config_file="$1"

    check_dependencies "save"
    load_config "$config_file"
    setup_rclone_config "$RCLONE_REMOTE"

    if [[ -z "$IMAGES" ]]; then
        log_error "配置文件缺少必选项: save.images"
        exit 1
    fi

    local images=($(echo "$IMAGES" | python3 -c "import sys, json; print(' '.join(json.load(sys.stdin)))"))

    local timestamp=$(date +%Y%m%d%H%M%S)
    local registry_dir="$TMP_DIR/registry-$timestamp"
    local tar_file="registry-$timestamp.tar.gz"
    local tar_path="$TMP_DIR/$tar_file"

    log_info "开始保存镜像..."
    log_info "镜像列表: ${images[*]}"

    log_info "步骤1/4: 保存镜像到本地目录..."
    mkdir -p "$registry_dir"

    local image_list=""
    for img in "${images[@]}"; do
        if [[ -z "$image_list" ]]; then
            image_list="$img"
        else
            image_list="$image_list,$img"
        fi
    done

    if ! sreg save --registry-dir="$registry_dir" --images="$image_list"; then
        log_error "保存镜像失败"
        cleanup
        exit 1
    fi

    log_info "步骤2/4: 打包镜像目录..."
    cd "$registry_dir"
    if ! tar czf "$tar_path" .; then
        log_error "打包失败"
        cleanup
        exit 1
    fi
    cd - > /dev/null

    local tar_size
    tar_size=$(du -h "$tar_path" | cut -f1)
    log_info "打包完成: $tar_path (大小: $tar_size)"

    log_info "步骤3/4: 上传到对象存储..."

    local remote_object_path="$tar_file"
    if [[ -n "$RCLONE_PATH" ]]; then
        remote_object_path="${RCLONE_PATH%/}/$tar_file"
    fi

    ensure_remote_parent_dir "$RCLONE_REMOTE" "$remote_object_path"

    local remote_path="${RCLONE_REMOTE}:${remote_object_path}"

    if ! rclone_run copyto "$tar_path" "$remote_path" --progress; then
        log_error "上传到对象存储失败"
        cleanup
        exit 1
    fi

    log_info "步骤4/4: 完成"
    echo ""
    echo "=========================================="
    log_info "镜像包已成功上传到对象存储"
    echo "------------------------------------------"
    echo "  远程路径: $remote_path"
    echo "  本地路径: $tar_path"
    echo "  文件大小: $tar_size"
    echo "  镜像数量: ${#images[@]}"
    echo "=========================================="
    echo ""

    rm -rf "$registry_dir"
}

cmd_load() {
    local config_file="$1"

    check_dependencies "load"
    load_config "$config_file"

    if [[ -z "$DEST_REGISTRY" ]]; then
        log_error "配置文件缺少必选项: load.dest_registry.url"
        exit 1
    fi

    if [[ -z "$EXTRACT_DIR" ]]; then
        log_error "配置文件缺少必选项: load.extract_dir"
        exit 1
    fi

    local tar_path=""
    local source_info=""

    if [[ -n "$SOURCE_REMOTE" ]]; then
        log_info "步骤1/5: 从对象存储下载镜像包..."

        setup_rclone_config "$RCLONE_REMOTE"

        local filename
        filename=$(basename "$SOURCE_REMOTE")
        tar_path="$TMP_DIR/$filename"
        source_info="$SOURCE_REMOTE"

        if ! rclone_run copyto "$SOURCE_REMOTE" "$tar_path" --progress; then
            log_error "从对象存储下载失败"
            cleanup
            exit 1
        fi

        local tar_size
        tar_size=$(du -h "$tar_path" | cut -f1)
        log_info "下载完成: $tar_path (大小: $tar_size)"
    elif [[ -n "$SOURCE_LOCAL" ]]; then
        log_info "步骤1/5: 使用本地镜像包..."
        if [[ ! -f "$SOURCE_LOCAL" ]]; then
            log_error "文件不存在: $SOURCE_LOCAL"
            exit 1
        fi
        tar_path="$SOURCE_LOCAL"
        source_info="$SOURCE_LOCAL"
        local tar_size
        tar_size=$(du -h "$tar_path" | cut -f1)
        log_info "本地文件: $tar_path (大小: $tar_size)"
    else
        log_error "配置文件缺少源文件配置: load.source.remote 或 load.source.local"
        exit 1
    fi

    log_info "步骤2/5: 解压镜像包..."
    mkdir -p "$EXTRACT_DIR"
    if ! tar xzf "$tar_path" -C "$EXTRACT_DIR"; then
        log_error "解压失败"
        cleanup
        exit 1
    fi
    log_info "解压完成: $EXTRACT_DIR"

    log_info "步骤3/5: 启动临时本地 registry 服务 (端口: $LOCAL_REGISTRY_PORT)..."
    local pid_file="$TMP_DIR/registry.pid"
    local log_file="$TMP_DIR/registry.log"
    mkdir -p "$TMP_DIR"

    sreg serve filesystem "$EXTRACT_DIR" --port="$LOCAL_REGISTRY_PORT" > "$log_file" 2>&1 &
    local registry_pid=$!
    echo "$registry_pid" > "$pid_file"

    sleep 3
    if ! kill -0 "$registry_pid" 2>/dev/null; then
        log_error "registry 服务启动失败"
        cat "$log_file"
        cleanup
        exit 1
    fi
    log_info "临时 registry 服务已启动 (PID: $registry_pid, 端口: $LOCAL_REGISTRY_PORT)"

    log_info "步骤4/5: 同步镜像到 $DEST_REGISTRY..."
    local source_registry="localhost:$LOCAL_REGISTRY_PORT"

    if ! sreg sync -a "$source_registry" "$DEST_REGISTRY"; then
        log_warn "同步过程中出现错误（可能是部分镜像已存在）"
    fi

    log_info "步骤5/5: 清理临时文件..."
    if [[ -n "$SOURCE_REMOTE" ]]; then
        rm -f "$tar_path"
    fi

    if kill "$registry_pid" 2>/dev/null; then
        wait "$registry_pid" 2>/dev/null || true
    fi
    rm -f "$pid_file" "$log_file"

    echo ""
    echo "=========================================="
    log_info "镜像同步完成"
    echo "------------------------------------------"
    echo "  源地址: $source_info"
    echo "  目标: $DEST_REGISTRY"
    echo "=========================================="
    echo ""

    cleanup
}

main() {
    if [[ $# -eq 0 ]]; then
        echo "sreg-storage.sh - 对象存储镜像包管理工具（配置文件版本）"
        echo ""
        echo "用法:"
        echo "  $0 save --config=<配置文件路径>"
        echo "  $0 load --config=<配置文件路径>"
        exit 0
    fi

    local command="$1"
    shift

    case "$command" in
        save)
            local config_file=""
            while [[ $# -gt 0 ]]; do
                case "$1" in
                    --config=*)
                        config_file="${1#*=}"
                        shift
                        ;;
                    *)
                        log_error "未知参数: $1"
                        exit 1
                        ;;
                esac
            done

            if [[ -z "$config_file" ]]; then
                log_error "缺少必选参数: --config"
                exit 1
            fi

            cmd_save "$config_file"
            ;;
        load)
            local config_file=""
            while [[ $# -gt 0 ]]; do
                case "$1" in
                    --config=*)
                        config_file="${1#*=}"
                        shift
                        ;;
                    *)
                        log_error "未知参数: $1"
                        exit 1
                        ;;
                esac
            done

            if [[ -z "$config_file" ]]; then
                log_error "缺少必选参数: --config"
                exit 1
            fi

            cmd_load "$config_file"
            ;;
        *)
            log_error "未知命令: $command"
            echo "可用命令: save, load"
            exit 1
            ;;
    esac
}

main "$@"
