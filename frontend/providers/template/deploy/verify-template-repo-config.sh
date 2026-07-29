#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
entrypoint="${script_dir}/template-frontend-entrypoint.sh"
chart="${script_dir}/charts/template-frontend"
repo_key="templateConfig.templateRepoUrl"
repo_url="https://gogs.example.test/sealos-admin/templates"

key_count="$(grep -Fc "add_set_string ${repo_key} " "${entrypoint}" || true)"
if [[ "${key_count}" -ne 2 ]]; then
  echo "expected both repository branches to set ${repo_key}, found ${key_count}" >&2
  exit 1
fi

if grep -Eq 'add_set_string templateConfig\.templateUrl ' "${entrypoint}"; then
  echo "entrypoint still sets unused templateConfig.templateUrl" >&2
  exit 1
fi

rendered="$(
  helm template template-frontend "${chart}" \
    --namespace template-frontend \
    --set-string "${repo_key}=${repo_url}"
)"

if ! grep -Fq "TEMPLATE_REPO_URL=${repo_url}" <<<"${rendered}"; then
  echo "chart did not render ${repo_key} into TEMPLATE_REPO_URL" >&2
  exit 1
fi

echo "template repository configuration verified"
