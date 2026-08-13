#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
entrypoint="${script_dir}/template-frontend-entrypoint.sh"
chart="${script_dir}/charts/template-frontend"
env_template="${script_dir}/../.env.template"
auto_inject_key="templateConfig.templateRepoAutoInject"
repo_key="templateConfig.templateRepoUrl"
repo_url="https://gogs.example.test/sealos-admin/templates"
readme_key="templateConfig.templateRepoEnableReadmeFetch"
ssl_key="templateConfig.templateRepoGitSslNoVerify"

key_count="$(grep -Fc "add_set_string ${repo_key} " "${entrypoint}" || true)"
if [[ "${key_count}" -ne 2 ]]; then
  echo "expected both repository branches to set ${repo_key}, found ${key_count}" >&2
  exit 1
fi

if ! grep -Fq "if read_template_repo_auto_inject; then" "${entrypoint}"; then
  echo "entrypoint does not guard repository auto-injection" >&2
  exit 1
fi

if grep -Eq 'templateConfig\.(enableReadmeFetch|gitSslNoVerify|templateUrl)\b|^ENABLE_README_FETCH=' "${entrypoint}" "${chart}/values.yaml" "${chart}/template-frontend-values.yaml" "${env_template}"; then
  echo "template repository settings still use old or unused templateConfig keys" >&2
  exit 1
fi

rendered="$(
  helm template template-frontend "${chart}" \
    --namespace template-frontend \
    --set-string "${auto_inject_key}=false" \
    --set-string "${repo_key}=${repo_url}"
)"

if ! grep -Fq "TEMPLATE_REPO_AUTO_INJECT=false" <<<"${rendered}"; then
  echo "chart did not render ${auto_inject_key} into TEMPLATE_REPO_AUTO_INJECT" >&2
  exit 1
fi

if ! grep -Fq "TEMPLATE_REPO_URL=${repo_url}" <<<"${rendered}"; then
  echo "chart did not render ${repo_key} into TEMPLATE_REPO_URL" >&2
  exit 1
fi

if ! grep -Fq "TEMPLATE_REPO_ENABLE_README_FETCH=true" <<<"${rendered}"; then
  echo "chart did not render ${readme_key} into TEMPLATE_REPO_ENABLE_README_FETCH" >&2
  exit 1
fi

if ! grep -Fq "TEMPLATE_REPO_GIT_SSL_NO_VERIFY=false" <<<"${rendered}"; then
  echo "chart did not render ${ssl_key} into TEMPLATE_REPO_GIT_SSL_NO_VERIFY" >&2
  exit 1
fi

echo "template repository configuration verified"
