#!/bin/bash
set -e

# 配置（支持环境变量覆盖）
RELEASE_NAME=${RELEASE_NAME:-"devbox"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"devbox-system"}
DEVBOX_VERSION=${DEVBOX_VERSION:-"v2alpha2"}  # v1alpha1 or v2alpha2

echo "===== 开始采纳资源到 Helm 管理 ====="

# 采纳命名空间级别的资源
adopt_namespaced_resource() {
  local kind="$1"
  local name="$2"
  
  echo "检查 ${kind}/${name} ..."
  
  if kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" >/dev/null 2>&1; then
    echo "  → 采纳 ${kind}/${name}"
    kubectl -n "${RELEASE_NAMESPACE}" label "${kind}" "${name}" \
      app.kubernetes.io/managed-by=Helm --overwrite
    kubectl -n "${RELEASE_NAMESPACE}" annotate "${kind}" "${name}" \
      meta.helm.sh/release-name="${RELEASE_NAME}" \
      meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite
    echo "  ✅ 已采纳"
  else
    echo "  ⊘ 资源不存在，跳过"
  fi
}

# 采纳集群级别的资源
adopt_cluster_resource() {
  local kind="$1"
  local name="$2"
  
  echo "检查 ${kind}/${name} ..."
  
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    echo "  → 采纳 ${kind}/${name}"
    kubectl label "${kind}" "${name}" \
      app.kubernetes.io/managed-by=Helm --overwrite
    kubectl annotate "${kind}" "${name}" \
      meta.helm.sh/release-name="${RELEASE_NAME}" \
      meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite
    echo "  ✅ 已采纳"
  else
    echo "  ⊘ 资源不存在，跳过"
  fi
}

# 采纳 Namespace
echo ""
echo "===== 采纳 Namespace ====="
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  echo "采纳 namespace/${RELEASE_NAMESPACE}"
  kubectl label namespace "${RELEASE_NAMESPACE}" \
    app.kubernetes.io/managed-by=Helm --overwrite
  kubectl annotate namespace "${RELEASE_NAMESPACE}" \
    meta.helm.sh/release-name="${RELEASE_NAME}" \
    meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite
  echo "✅ 已采纳"
else
  echo "⊘ Namespace 不存在，跳过"
fi

# 采纳命名空间级别的资源
echo ""
echo "===== 采纳命名空间级别的资源 ====="

# 根据版本采纳不同的部署类型
if [ "${DEVBOX_VERSION}" = "v1alpha1" ]; then
  echo "检测到 v1alpha1 版本，采纳 Deployment"
  adopt_namespaced_resource deployment devbox-controller-manager
  adopt_namespaced_resource serviceaccount controller-manager
else
  echo "检测到 v2alpha2 版本，采纳 DaemonSet"
  adopt_namespaced_resource daemonset devbox-controller-manager
fi

adopt_namespaced_resource serviceaccount devbox-controller-manager
adopt_namespaced_resource role devbox-leader-election-role
adopt_namespaced_resource role devbox-default-user
adopt_namespaced_resource rolebinding devbox-leader-election-rolebinding
adopt_namespaced_resource rolebinding devbox-default-user-rolebinding

# 采纳集群级别的资源
echo ""
echo "===== 采纳集群级别的资源 ====="
adopt_cluster_resource clusterrole devbox-manager-role
adopt_cluster_resource clusterrole devbox-metrics-reader
adopt_cluster_resource clusterrolebinding devbox-manager-rolebinding

# 采纳 CRD（可选，通常 CRD 不由 Helm 管理）
echo ""
echo "===== 采纳 CRD（可选）====="
adopt_cluster_resource customresourcedefinition devboxes.devbox.sealos.io
adopt_cluster_resource customresourcedefinition devboxreleases.devbox.sealos.io

echo ""
echo "===== ✅ 资源采纳完成 ====="
echo ""
echo "现在可以运行 helm install 了："
echo ""

if [ "${DEVBOX_VERSION}" = "v1alpha1" ]; then
  echo "helm install ${RELEASE_NAME} ./charts/devbox-controller-v1alpha1/ \\"
else
  echo "helm install ${RELEASE_NAME} ./charts/devbox-controller/ \\"
fi

echo "  -n ${RELEASE_NAMESPACE} \\"
echo "  --create-namespace \\"
echo "  --set image=ghcr.io/labring/sealos-devbox-controller:latest \\"
echo "  --set env.registryAddr=http://sealos.hub:5000 \\"
echo "  --set env.registryUser=admin \\"
echo "  --set env.registryPassword=5e79497edb8bafb9"

