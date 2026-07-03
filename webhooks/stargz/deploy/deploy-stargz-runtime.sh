#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-deploy}"
TMP_DIR=""

default_node_name() {
  if command -v hostnamectl >/dev/null 2>&1; then
    hostnamectl --static 2>/dev/null || hostname
  else
    hostname
  fi
}

STARGZ_VERSION="${STARGZ_VERSION:-v0.18.2}"
STARGZ_ARCHIVE_SHA256="${STARGZ_ARCHIVE_SHA256:-515a3c3af0012f192ace31fb79e910597977c77227e976680aeaaef6e9ae50a9}"
STARGZ_RELEASE_BASE="${STARGZ_RELEASE_BASE:-https://github.com/containerd/stargz-snapshotter/releases/download}"
STARGZ_TARBALL="${STARGZ_TARBALL:-stargz-snapshotter-${STARGZ_VERSION}-linux-amd64.tar.gz}"
STARGZ_URL="${STARGZ_URL:-${STARGZ_RELEASE_BASE}/${STARGZ_VERSION}/${STARGZ_TARBALL}}"

CONTAINERD_CONFIG="${CONTAINERD_CONFIG:-/etc/containerd/config.toml}"
DEFAULT_SNAPSHOTTER="${DEFAULT_SNAPSHOTTER:-overlayfs}"
STARGZ_RUNTIME_HANDLER="${STARGZ_RUNTIME_HANDLER:-stargz}"

STARGZ_CONFIG_DIR="${STARGZ_CONFIG_DIR:-/etc/containerd-stargz-grpc}"
STARGZ_CONFIG="${STARGZ_CONFIG:-${STARGZ_CONFIG_DIR}/config.toml}"
STARGZ_ROOT="${STARGZ_ROOT:-/var/lib/containerd-stargz-grpc}"
STARGZ_ADDRESS="${STARGZ_ADDRESS:-/run/containerd-stargz-grpc/containerd-stargz-grpc.sock}"
STARGZ_INSECURE_REGISTRIES="${STARGZ_INSECURE_REGISTRIES:-}"
STARGZ_DOCKER_CONFIG_DIR="${STARGZ_DOCKER_CONFIG_DIR:-${STARGZ_CONFIG_DIR}/docker}"
STARGZ_REGISTRY_AUTHS="${STARGZ_REGISTRY_AUTHS:-}"
IMAGE_CRI_SHIM_CONFIG="${IMAGE_CRI_SHIM_CONFIG:-/etc/image-cri-shim.yaml}"
STARGZ_NODE_LABEL_KEY="${STARGZ_NODE_LABEL_KEY:-stargz.sealos.io/runtime}"
STARGZ_NODE_LABEL_VALUE="${STARGZ_NODE_LABEL_VALUE:-true}"
STARGZ_LABEL_NODE="${STARGZ_LABEL_NODE:-true}"
STARGZ_UNLABEL_NODE="${STARGZ_UNLABEL_NODE:-true}"
KUBECONFIG="${KUBECONFIG:-}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/containerd-stargz-runtime}"
VERIFY_IMAGE="${VERIFY_IMAGE:-ghcr.io/stargz-containers/alpine:3.15.3-esgz}"
VERIFY_NAMESPACE="${VERIFY_NAMESPACE:-default}"
VERIFY_TIMEOUT="${VERIFY_TIMEOUT:-120s}"

usage() {
  cat <<'USAGE'
Usage:
  deploy-stargz-runtime.sh deploy
  deploy-stargz-runtime.sh status
  deploy-stargz-runtime.sh verify
  deploy-stargz-runtime.sh rollback [backup-file]

Run this script directly on each node that should support the stargz RuntimeClass.
It does not use SSH, cordon, or drain.

What it does:
  - installs containerd-stargz-grpc
  - keeps the default CRI snapshotter as DEFAULT_SNAPSHOTTER, overlayfs by default
  - adds a CRI runtime handler named STARGZ_RUNTIME_HANDLER, stargz by default
  - sets only that handler's snapshotter to stargz

Examples:
  ./deploy-stargz-runtime.sh status
  ./deploy-stargz-runtime.sh deploy
  DEFAULT_SNAPSHOTTER=overlayfs ./deploy-stargz-runtime.sh deploy
  STARGZ_INSECURE_REGISTRIES=registry.internal:5000,sealos.hub:5000 \
    ./deploy-stargz-runtime.sh deploy
  STARGZ_REGISTRY_AUTHS=registry.example.com=<user>:<password> \
    ./deploy-stargz-runtime.sh deploy

Registry auth:
  Stargz snapshotter does not reuse containerd credentials. This script writes
  /etc/containerd-stargz-grpc/docker/config.json and sets DOCKER_CONFIG for the
  stargz systemd service.

  - STARGZ_REGISTRY_AUTHS: comma-separated host=username:password entries
  - IMAGE_CRI_SHIM_CONFIG: auto-detect primary and registries[]. auth from
    /etc/image-cri-shim.yaml when present

Node scheduling label:
  RuntimeClass/stargz uses scheduling.nodeSelector on this label. After deploy,
  this script labels the current node so scheduler can place stargz Pods here.

  - STARGZ_NODE_LABEL_KEY=stargz.sealos.io/runtime
  - STARGZ_NODE_LABEL_VALUE=true
  - STARGZ_LABEL_NODE=true
  - KUBECONFIG=/etc/kubernetes/admin.conf
USAGE
}

log() {
  printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"
}

cleanup() {
  if [[ -n "${TMP_DIR}" ]]; then
    rm -rf "${TMP_DIR}"
  fi
}
trap cleanup EXIT

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

validate_handler_name() {
  case "$1" in
    *[!A-Za-z0-9_-]*|'')
      echo "invalid runtime handler: $1; use only A-Z a-z 0-9 _ -" >&2
      exit 1
      ;;
  esac
}

resolve_kubeconfig() {
  if [[ -n "${KUBECONFIG}" && -f "${KUBECONFIG}" ]]; then
    printf '%s' "${KUBECONFIG}"
    return 0
  fi

  local candidate
  for candidate in /etc/kubernetes/admin.conf "${HOME}/.kube/config"; do
    if [[ -f "${candidate}" ]]; then
      printf '%s' "${candidate}"
      return 0
    fi
  done

  return 1
}

label_stargz_node() {
  local node_name="${1:-${NODE_NAME:-$(default_node_name)}}"
  local kubeconfig

  if [[ "${STARGZ_LABEL_NODE}" != "true" ]]; then
    log "skip node label; STARGZ_LABEL_NODE=${STARGZ_LABEL_NODE}"
    return 0
  fi

  if ! command -v kubectl >/dev/null 2>&1; then
    log "kubectl not found; skip labeling node ${node_name} with ${STARGZ_NODE_LABEL_KEY}=${STARGZ_NODE_LABEL_VALUE}"
    return 0
  fi

  if ! kubeconfig="$(resolve_kubeconfig)"; then
    log "no kubeconfig found; skip labeling node ${node_name}"
    return 0
  fi

  if KUBECONFIG="${kubeconfig}" kubectl label node "${node_name}" \
    "${STARGZ_NODE_LABEL_KEY}=${STARGZ_NODE_LABEL_VALUE}" --overwrite >/dev/null; then
    log "labeled node ${node_name}: ${STARGZ_NODE_LABEL_KEY}=${STARGZ_NODE_LABEL_VALUE}"
  else
    log "failed to label node ${node_name}; ensure kubectl can patch nodes"
  fi
}

unlabel_stargz_node() {
  local node_name="${1:-${NODE_NAME:-$(default_node_name)}}"
  local kubeconfig

  if [[ "${STARGZ_UNLABEL_NODE}" != "true" ]]; then
    log "skip node unlabel; STARGZ_UNLABEL_NODE=${STARGZ_UNLABEL_NODE}"
    return 0
  fi

  if ! command -v kubectl >/dev/null 2>&1; then
    log "kubectl not found; skip removing label ${STARGZ_NODE_LABEL_KEY} from node ${node_name}"
    return 0
  fi

  if ! kubeconfig="$(resolve_kubeconfig)"; then
    log "no kubeconfig found; skip removing label from node ${node_name}"
    return 0
  fi

  if KUBECONFIG="${kubeconfig}" kubectl label node "${node_name}" "${STARGZ_NODE_LABEL_KEY}-" --overwrite >/dev/null; then
    log "removed label ${STARGZ_NODE_LABEL_KEY} from node ${node_name}"
  else
    log "failed to remove label ${STARGZ_NODE_LABEL_KEY} from node ${node_name}"
  fi
}

detect_http_registries() {
  local config_path="/etc/containerd/certs.d"
  if [[ ! -d "${config_path}" ]]; then
    return 0
  fi

  find "${config_path}" -name hosts.toml -type f -print0 2>/dev/null |
    while IFS= read -r -d '' hosts_file; do
      python3 - "${hosts_file}" <<'PY'
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

text = Path(sys.argv[1]).read_text(errors="ignore")
matches = re.findall(r'^\s*(?:server\s*=\s*)?["\']?(http://[^"\'\]\s]+)', text, re.M)
matches += re.findall(r'^\s*\[host\."(http://[^"]+)"\]', text, re.M)
for raw in matches:
    parsed = urlparse(raw)
    if parsed.netloc:
        print(parsed.netloc)
PY
    done | awk 'NF && !seen[$0]++'
}

merge_csv_unique() {
  printf '%s\n' "$@" |
    tr ',' '\n' |
    awk '
      {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0)
      }
      NF && !seen[$0]++ {
        if (out != "") {
          out = out "," $0
        } else {
          out = $0
        }
      }
      END {
        print out
      }
    '
}

collect_stargz_registry_auths() {
  python3 - "${STARGZ_REGISTRY_AUTHS}" "${IMAGE_CRI_SHIM_CONFIG}" <<'PY'
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

explicit = sys.argv[1].strip()
shim_config = sys.argv[2]

def normalize_host(raw):
    raw = raw.strip().strip('"').strip("'")
    if not raw:
        return ""
    parsed = urlparse(raw if "://" in raw else f"//{raw}")
    host = parsed.netloc or parsed.path.split("/", 1)[0]
    return host.strip().rstrip("/")

def add_auth(auths, host, creds):
    host = normalize_host(host)
    if not host or not creds:
        return
    username, sep, password = creds.partition(":")
    if not sep:
        return
    auths[host] = {"username": username, "password": password}

auths = {}

shim_path = Path(shim_config)
if shim_path.is_file():
    text = shim_path.read_text(errors="ignore")
    lines = text.splitlines()
    current_address = None
    in_registries = False
    registry_address = None

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if re.match(r"^registries\s*:", stripped):
            in_registries = True
            current_address = None
            registry_address = None
            continue

        stripped = re.sub(r"^-\s+", "", stripped)
        address_match = re.match(r"^address\s*:\s*(.+)$", stripped)
        if address_match:
            current_address = address_match.group(1).strip()
            if in_registries:
                registry_address = current_address
            continue

        auth_match = re.match(r"^auth\s*:\s*(.+)$", stripped)
        if not auth_match:
            continue

        creds = auth_match.group(1).strip().strip('"').strip("'")
        if not creds:
            continue

        if in_registries and registry_address:
            add_auth(auths, registry_address, creds)
            registry_address = None
        elif not in_registries and current_address:
            add_auth(auths, current_address, creds)

if explicit:
    for entry in explicit.split(","):
        entry = entry.strip()
        if not entry:
            continue
        host, sep, creds = entry.partition("=")
        if not sep:
            raise SystemExit(f"invalid STARGZ_REGISTRY_AUTHS entry (expected host=user:pass): {entry}")
        add_auth(auths, host, creds)

print(json.dumps(auths, sort_keys=True))
PY
}

write_stargz_docker_config() {
  local docker_config_dir="$1"
  local docker_config="${docker_config_dir}/config.json"
  local registry_auths_json

  registry_auths_json="$(collect_stargz_registry_auths)"
  if [[ "${registry_auths_json}" == "{}" ]]; then
    return 1
  fi

  mkdir -p "${docker_config_dir}"
  python3 - "${docker_config}" "${registry_auths_json}" <<'PY'
import base64
import json
import sys
from pathlib import Path

config_path = Path(sys.argv[1])
auths = json.loads(sys.argv[2])

payload = {"auths": {}}
for host, creds in auths.items():
    token = f"{creds['username']}:{creds['password']}".encode()
    payload["auths"][host] = {"auth": base64.b64encode(token).decode()}

config_path.write_text(json.dumps(payload, indent=2) + "\n")
config_path.chmod(0o600)
PY

  printf '%s\n' "${docker_config}"
}

capture_original_file() {
  local source_path="$1"
  local backup_dir="$2"
  local label="$3"

  mkdir -p "${backup_dir}"
  if [[ -f "${backup_dir}/original-${label}" || -f "${backup_dir}/original-${label}.missing" ]]; then
    return 0
  fi
  if [[ -e "${source_path}" ]]; then
    cp -a "${source_path}" "${backup_dir}/original-${label}"
  else
    : > "${backup_dir}/original-${label}.missing"
  fi
}

write_stargz_config() {
  local stargz_config="$1"
  local stargz_root="$2"
  local stargz_address="$3"
  local insecure_registries="$4"

  cat > "${stargz_config}" <<EOF
version = 1
root = "${stargz_root}"
address = "${stargz_address}"

[registry]
config_path = "/etc/containerd/certs.d"
EOF

  if [[ -n "${insecure_registries}" ]]; then
    IFS=',' read -r -a registries <<< "${insecure_registries}"
    for registry_host in "${registries[@]}"; do
      registry_host="${registry_host#"${registry_host%%[![:space:]]*}"}"
      registry_host="${registry_host%"${registry_host##*[![:space:]]}"}"
      if [[ -z "${registry_host}" ]]; then
        continue
      fi
      cat >> "${stargz_config}" <<EOF

[[resolver.host."${registry_host}".mirrors]]
host = "${registry_host}"
insecure = true
EOF
    done
  fi
}

write_stargz_service() {
  local stargz_config="$1"
  local docker_config_dir="${2:-}"

  cat > /etc/systemd/system/stargz-snapshotter.service <<EOF
[Unit]
Description=Stargz Snapshotter
Documentation=https://github.com/containerd/stargz-snapshotter
After=network.target
Before=containerd.service

[Service]
Type=simple
ExecStart=/usr/local/bin/containerd-stargz-grpc --config ${stargz_config}
Restart=always
RestartSec=5
Delegate=yes
LimitNOFILE=1048576
TasksMax=infinity
EOF

  if [[ -n "${docker_config_dir}" ]]; then
    cat >> /etc/systemd/system/stargz-snapshotter.service <<EOF
Environment=DOCKER_CONFIG=${docker_config_dir}
EOF
  fi

  cat >> /etc/systemd/system/stargz-snapshotter.service <<'EOF'

[Install]
WantedBy=multi-user.target
EOF
}

patch_containerd_config() {
  local containerd_config="$1"
  local default_snapshotter="$2"
  local handler="$3"
  local stargz_address="$4"

  python3 - "${containerd_config}" "${default_snapshotter}" "${handler}" "${stargz_address}" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
default_snapshotter = sys.argv[2]
handler = sys.argv[3]
stargz_address = sys.argv[4]

cri_containerd = 'plugins."io.containerd.grpc.v1.cri".containerd'
runtimes_prefix = cri_containerd + ".runtimes."
handler_table = runtimes_prefix + handler
proxy_table = "proxy_plugins.stargz"

lines = path.read_text().splitlines()

def table_name(line):
    stripped = line.strip()
    if not stripped.startswith("[") or not stripped.endswith("]"):
        return None
    return stripped.strip("[]")

def is_under(name, parent):
    return name == parent or name.startswith(parent + ".")

def remove_sections(input_lines, parents):
    output = []
    skipping = False
    for line in input_lines:
        name = table_name(line)
        if name is not None:
            skipping = any(is_under(name, parent) for parent in parents)
        if not skipping:
            output.append(line)
    return output

def find_default_runtime(input_lines):
    current = None
    for line in input_lines:
        name = table_name(line)
        if name is not None:
            current = name
            continue
        if current == cri_containerd:
            match = re.match(r'\s*default_runtime_name\s*=\s*"([^"]+)"', line)
            if match:
                return match.group(1)
    return "runc"

source_handler = find_default_runtime(lines)

source_table = runtimes_prefix + source_handler
source_options_table = source_table + ".options"

def find_runtime_type(input_lines):
    current = None
    for line in input_lines:
        name = table_name(line)
        if name is not None:
            current = name
            continue
        if current == source_table:
            match = re.match(r'\s*runtime_type\s*=\s*"([^"]+)"', line)
            if match:
                return match.group(1)
    return "io.containerd.runc.v2"

def find_source_options(input_lines):
    current = None
    options = []
    for line in input_lines:
        name = table_name(line)
        if name is not None:
            current = name
            continue
        if current == source_options_table and line.strip():
            options.append(line.strip())
    return options

runtime_type = find_runtime_type(lines)
source_options = find_source_options(lines)
lines = remove_sections(lines, [handler_table, proxy_table])

output = []
current = None
seen_cri = False
snapshotter_seen = False
disable_seen = False

def finish_cri_section():
    additions = []
    if default_snapshotter and not snapshotter_seen:
        additions.append(f'      snapshotter = "{default_snapshotter}"')
    if not disable_seen:
        additions.append('      disable_snapshot_annotations = false')
    return additions

for line in lines:
    name = table_name(line)
    if name is not None:
        if current == cri_containerd and name != cri_containerd:
            output.extend(finish_cri_section())
        current = name
        if current == cri_containerd:
            seen_cri = True
            snapshotter_seen = False
            disable_seen = False
        output.append(line)
        continue

    stripped = line.strip()
    if current == cri_containerd and stripped.startswith("snapshotter"):
        if default_snapshotter:
            output.append(f'      snapshotter = "{default_snapshotter}"')
        else:
            output.append(line)
        snapshotter_seen = True
        continue
    if current == cri_containerd and stripped.startswith("disable_snapshot_annotations"):
        output.append('      disable_snapshot_annotations = false')
        disable_seen = True
        continue
    output.append(line)

if current == cri_containerd:
    output.extend(finish_cri_section())

if not seen_cri:
    output.append("")
    output.append(f'[{cri_containerd}]')
    if default_snapshotter:
        output.append(f'      snapshotter = "{default_snapshotter}"')
    output.append('      disable_snapshot_annotations = false')

output.append("")
output.append("[proxy_plugins.stargz]")
output.append('  type = "snapshot"')
output.append(f'  address = "{stargz_address}"')
output.append("  [proxy_plugins.stargz.exports]")
output.append('    root = "/var/lib/containerd-stargz-grpc/"')

output.append("")
output.append(f'[{handler_table}]')
output.append(f'  runtime_type = "{runtime_type}"')
output.append('  snapshotter = "stargz"')
output.append('  privileged_without_host_devices = false')
if source_options:
    output.append(f'  [{handler_table}.options]')
    for option in source_options:
        output.append(f'    {option}')

text = "\n".join(output).rstrip() + "\n"
if f'[{handler_table}]' not in text:
    raise SystemExit("failed to add stargz runtime handler")
if 'snapshotter = "stargz"' not in text:
    raise SystemExit("failed to set stargz handler snapshotter")
if default_snapshotter and f'snapshotter = "{default_snapshotter}"' not in text:
    raise SystemExit("failed to keep default snapshotter")
if f'address = "{stargz_address}"' not in text:
    raise SystemExit("failed to add stargz proxy plugin")

path.write_text(text)
PY
}

run_deploy() {
  local detected_insecure_registries
  local stargz_insecure_registries
  local stargz_docker_config
  local actual_sha
  local backup

  validate_handler_name "${STARGZ_RUNTIME_HANDLER}"
  require_cmd curl
  require_cmd tar
  require_cmd install
  require_cmd sha256sum
  require_cmd python3
  require_cmd systemctl
  require_cmd containerd
  require_cmd ctr

  if [[ ! -f "${CONTAINERD_CONFIG}" ]]; then
    echo "containerd config not found: ${CONTAINERD_CONFIG}" >&2
    exit 1
  fi

  log "host: $(hostname)"
  log "default snapshotter target: ${DEFAULT_SNAPSHOTTER}"
  log "stargz runtime handler: ${STARGZ_RUNTIME_HANDLER}"
  log "containerd: $(containerd --version)"

  TMP_DIR="$(mktemp -d)"

  curl -fsSL "${STARGZ_URL}" -o "${TMP_DIR}/stargz-snapshotter.tar.gz"
  actual_sha="$(sha256sum "${TMP_DIR}/stargz-snapshotter.tar.gz" | awk '{print $1}')"
  if [[ "${actual_sha}" != "${STARGZ_ARCHIVE_SHA256}" ]]; then
    echo "sha256 mismatch for ${STARGZ_URL}" >&2
    echo "expected: ${STARGZ_ARCHIVE_SHA256}" >&2
    echo "actual:   ${actual_sha}" >&2
    exit 1
  fi

  tar -xzf "${TMP_DIR}/stargz-snapshotter.tar.gz" -C "${TMP_DIR}"
  install -m 0755 "${TMP_DIR}/containerd-stargz-grpc" /usr/local/bin/containerd-stargz-grpc
  install -m 0755 "${TMP_DIR}/ctr-remote" /usr/local/bin/ctr-remote

  mkdir -p "${STARGZ_CONFIG_DIR}" "$(dirname "${STARGZ_ADDRESS}")" "${STARGZ_ROOT}" "${BACKUP_DIR}"

  detected_insecure_registries="$(detect_http_registries | paste -sd, -)"
  stargz_insecure_registries="$(merge_csv_unique "${STARGZ_INSECURE_REGISTRIES}" "${detected_insecure_registries}")"
  if [[ -n "${stargz_insecure_registries}" ]]; then
    log "stargz insecure/plain HTTP registries: ${stargz_insecure_registries}"
  fi

  write_stargz_config "${STARGZ_CONFIG}" "${STARGZ_ROOT}" "${STARGZ_ADDRESS}" "${stargz_insecure_registries}"

  stargz_docker_config=""
  if stargz_docker_config="$(write_stargz_docker_config "${STARGZ_DOCKER_CONFIG_DIR}")"; then
    capture_original_file "${stargz_docker_config}" "${BACKUP_DIR}" "stargz-docker-config.json"
    log "stargz registry auth config: ${stargz_docker_config}"
    log "stargz registry hosts: $(python3 - "${stargz_docker_config}" <<'PY'
import json
import sys
from pathlib import Path

data = json.loads(Path(sys.argv[1]).read_text())
print(", ".join(sorted(data.get("auths", {}))))
PY
)"
    write_stargz_service "${STARGZ_CONFIG}" "${STARGZ_DOCKER_CONFIG_DIR}"
  else
    log "no stargz registry auth configured; set STARGZ_REGISTRY_AUTHS or provide ${IMAGE_CRI_SHIM_CONFIG}"
    write_stargz_service "${STARGZ_CONFIG}"
  fi

  capture_original_file "${CONTAINERD_CONFIG}" "${BACKUP_DIR}" "config.toml"
  backup="${BACKUP_DIR}/config.toml.$(date -u +%Y%m%dT%H%M%SZ)"
  cp -a "${CONTAINERD_CONFIG}" "${backup}"
  log "backed up containerd config to ${backup}"

  patch_containerd_config \
    "${CONTAINERD_CONFIG}" \
    "${DEFAULT_SNAPSHOTTER}" \
    "${STARGZ_RUNTIME_HANDLER}" \
    "${STARGZ_ADDRESS}"

  containerd --config "${CONTAINERD_CONFIG}" config dump >/dev/null

  systemctl daemon-reload
  systemctl enable --now stargz-snapshotter.service
  systemctl restart containerd.service
  systemctl is-active --quiet stargz-snapshotter.service
  systemctl is-active --quiet containerd.service

  ctr plugins ls | grep -E 'snapshotter|stargz|cri' || true
  ctr plugins ls | awk '$1 == "io.containerd.snapshotter.v1" && $2 == "stargz" && $4 == "ok" {found=1} END {exit found ? 0 : 1}'
  label_stargz_node
  log "deploy complete"
}

run_status() {
  printf '== host ==\n'
  hostname
  if command -v hostnamectl >/dev/null 2>&1; then
    hostnamectl --static 2>/dev/null || true
  fi

  printf '\n== services ==\n'
  systemctl is-active containerd || true
  systemctl is-active stargz-snapshotter 2>/dev/null || true

  printf '\n== versions ==\n'
  containerd --version
  command -v containerd-stargz-grpc >/dev/null 2>&1 && containerd-stargz-grpc --version || true

  printf '\n== default snapshotter and stargz handler ==\n'
  if [[ -f "${CONTAINERD_CONFIG}" ]]; then
    sed -n '/\[plugins\."io\.containerd\.grpc\.v1\.cri"\.containerd\]/,/\[plugins\."io\.containerd\.grpc\.v1\.cri"\.containerd\.runtimes\./p' "${CONTAINERD_CONFIG}" || true
    sed -n "/\\[plugins\\.\"io\\.containerd\\.grpc\\.v1\\.cri\"\\.containerd\\.runtimes\\.${STARGZ_RUNTIME_HANDLER}\\]/,/^\\[/p" "${CONTAINERD_CONFIG}" || true
    sed -n '/\[proxy_plugins\.stargz\]/,/^\[/p' "${CONTAINERD_CONFIG}" || true
  fi

  printf '\n== stargz config ==\n'
  if [[ -f "${STARGZ_CONFIG}" ]]; then
    sed -n '1,220p' "${STARGZ_CONFIG}"
  fi

  printf '\n== stargz registry auth ==\n'
  if [[ -f "${STARGZ_DOCKER_CONFIG_DIR}/config.json" ]]; then
    python3 - "${STARGZ_DOCKER_CONFIG_DIR}/config.json" <<'PY'
import json
import sys
from pathlib import Path

data = json.loads(Path(sys.argv[1]).read_text())
for host in sorted(data.get("auths", {})):
    print(host)
PY
    systemctl show stargz-snapshotter -p Environment --value 2>/dev/null | tr ' ' '\n' | grep '^DOCKER_CONFIG=' || true
  else
    echo "no ${STARGZ_DOCKER_CONFIG_DIR}/config.json"
  fi

  printf '\n== plugins ==\n'
  ctr plugins ls | grep -E 'snapshotter|stargz|cri' || true

  printf '\n== crictl ==\n'
  if command -v crictl >/dev/null 2>&1; then
    crictl info 2>/dev/null | grep -E '"snapshotter"|"defaultRuntimeName"' | head -20 || true
  fi

  printf '\n== node scheduling label ==\n'
  printf 'label key: %s=%s\n' "${STARGZ_NODE_LABEL_KEY}" "${STARGZ_NODE_LABEL_VALUE}"
  if command -v kubectl >/dev/null 2>&1; then
    local kubeconfig node_name
    node_name="${NODE_NAME:-$(default_node_name)}"
    if kubeconfig="$(resolve_kubeconfig)"; then
      KUBECONFIG="${kubeconfig}" kubectl get node "${node_name}" \
        -o "jsonpath={.metadata.labels['${STARGZ_NODE_LABEL_KEY}']}{'\n'}" 2>/dev/null ||
        echo "unable to read label for node ${node_name}"
    else
      echo "no kubeconfig found"
    fi
  else
    echo "kubectl not found"
  fi
}

run_verify() {
  local pod="stargz-runtime-verify-$(date +%s)"
  local node_name="${NODE_NAME:-$(default_node_name)}"

  if ! command -v kubectl >/dev/null 2>&1; then
    echo "kubectl not found; only local status can be shown" >&2
    run_status
    return 0
  fi

  kubectl delete pod "${pod}" -n "${VERIFY_NAMESPACE}" --ignore-not-found=true >/dev/null
  kubectl apply -n "${VERIFY_NAMESPACE}" -f - <<JSON >/dev/null
apiVersion: v1
kind: Pod
metadata:
  name: ${pod}
  labels:
    app.kubernetes.io/name: stargz-runtime-verify
spec:
  runtimeClassName: ${STARGZ_RUNTIME_HANDLER}
  nodeName: ${node_name}
  restartPolicy: Never
  terminationGracePeriodSeconds: 0
  containers:
  - name: verify
    image: ${VERIFY_IMAGE}
    imagePullPolicy: Always
    command: ["sh", "-c", "sleep 30"]
JSON

  kubectl wait "pod/${pod}" -n "${VERIFY_NAMESPACE}" --for=condition=Ready --timeout="${VERIFY_TIMEOUT}"
  kubectl get pod "${pod}" -n "${VERIFY_NAMESPACE}" -o wide
  kubectl describe pod "${pod}" -n "${VERIFY_NAMESPACE}" | sed -n '/Events:/,$p'
  if command -v ctr >/dev/null 2>&1; then
    printf '\n== stargz snapshots ==\n'
    ctr -n k8s.io snapshots --snapshotter stargz ls 2>/dev/null | sed -n '1,100p' || true
  fi
  kubectl delete pod "${pod}" -n "${VERIFY_NAMESPACE}" --wait=false >/dev/null
}

run_rollback() {
  local backup="${1:-}"

  if [[ -z "${backup}" ]]; then
    if [[ -f "${BACKUP_DIR}/original-config.toml" ]]; then
      backup="${BACKUP_DIR}/original-config.toml"
    else
      backup="$(ls -1 "${BACKUP_DIR}"/config.toml.* 2>/dev/null | sort | head -1 || true)"
    fi
  fi
  if [[ -z "${backup}" || ! -f "${backup}" ]]; then
    echo "no backup found; pass one explicitly or check ${BACKUP_DIR}" >&2
    exit 1
  fi

  echo "restoring ${backup} to ${CONTAINERD_CONFIG}"
  cp -a "${backup}" "${CONTAINERD_CONFIG}"
  containerd --config "${CONTAINERD_CONFIG}" config dump >/dev/null

  if ! grep -qE 'snapshotter = "stargz"|\[proxy_plugins\.stargz\]' "${CONTAINERD_CONFIG}"; then
    systemctl disable --now stargz-snapshotter.service 2>/dev/null || true
    unlabel_stargz_node
  fi

  systemctl restart containerd.service
  systemctl is-active --quiet containerd.service
  echo "rollback complete"
}

case "${ACTION}" in
  deploy)
    run_deploy
    ;;
  status)
    run_status
    ;;
  verify)
    run_verify
    ;;
  rollback)
    run_rollback "${2:-}"
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
