#!/bin/bash

# Kubernetes Resource Cloning Tool - Clone resources to a new namespace
# Usage: ./clone-k8s-resources.sh <source-namespace> <new-namespace> <new-domain> [new-image]

set -e

if [ $# -lt 3 ]; then
    cat << EOF
Usage: $0 <source-namespace> <new-namespace> <new-domain> [new-image]

Examples:
  $0 applaunchpad-frontend applaunchpad-brain applaunchpad-brain.192.168.12.53.nip.io
  $0 applaunchpad-frontend applaunchpad-test applaunchpad-test.192.168.12.53.nip.io ghcr.io/labring/sealos:latest
  $0 template-frontend template-test template-test.192.168.12.53.nip.io

Notes:
  - Automatically copies Deployment, Service, ConfigMap, Ingress from source namespace
  - Resource names remain unchanged, only namespace and Ingress domain are modified
  - Creates new namespace automatically if it doesn't exist
EOF
    exit 1
fi

SOURCE_NS=$1
NEW_NS=$2
NEW_DOMAIN=$3
NEW_IMAGE=$4

echo "====================================="
echo "🚀 Kubernetes Resource Clone"
echo "====================================="
echo "Source Namespace: $SOURCE_NS"
echo "New Namespace:    $NEW_NS"
echo "New Domain:       $NEW_DOMAIN"
if [ -n "$NEW_IMAGE" ]; then
    echo "New Image:        $NEW_IMAGE"
fi
echo "====================================="

# Verify source namespace exists
if ! kubectl get ns "$SOURCE_NS" &>/dev/null; then
    echo "❌ Namespace $SOURCE_NS does not exist"
    exit 1
fi

# Create new namespace
if kubectl get ns "$NEW_NS" &>/dev/null; then
    echo ""
    echo "📦 Namespace '$NEW_NS' already exists"
else
    echo ""
    echo "📦 Creating namespace: $NEW_NS"
    kubectl create namespace "$NEW_NS"
fi

# Create output directory
OUTPUT_DIR="k8s-clone-${NEW_NS}-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"
echo ""
echo "📁 YAML files saved to: $OUTPUT_DIR/"

# Clean YAML function
clean_yaml() {
    local file=$1
    # Remove kubectl.kubernetes.io/last-applied-configuration
    awk '
        /kubectl.kubernetes.io\/last-applied-configuration:/ {
            skip=1
            next
        }
        skip && /^  [a-zA-Z-]/ {
            skip=0
        }
        skip { next }
        { print }
    ' "$file" > "${file}.tmp"

    # Remove other metadata
    sed -i '' \
        -e '/creationTimestamp:/d' \
        -e '/generation:/d' \
        -e '/resourceVersion:/d' \
        -e '/uid:/d' \
        -e '/deployment.kubernetes.io\/revision:/d' \
        -e '/kubectl.kubernetes.io\/restartedAt:/d' \
        -e '/status:/,$d' \
        "${file}.tmp"

    mv "${file}.tmp" "$file"
}

echo ""
echo "1️⃣  Exporting ConfigMaps..."
# Find all ConfigMaps
CMS=$(kubectl get cm -n "$SOURCE_NS" -o name | grep -v kube-root-ca.crt || true)
if [ -n "$CMS" ]; then
    for cm in $CMS; do
        CM_NAME=${cm#configmap/}
        kubectl get cm "$CM_NAME" -n "$SOURCE_NS" -o yaml > "$OUTPUT_DIR/cm-${CM_NAME}.yaml"
        sed -i '' "s/namespace: ${SOURCE_NS}/namespace: ${NEW_NS}/" "$OUTPUT_DIR/cm-${CM_NAME}.yaml"
        clean_yaml "$OUTPUT_DIR/cm-${CM_NAME}.yaml"
        echo "   ↳ $CM_NAME"
    done
else
    echo "   ⚠️  No ConfigMaps found"
fi

echo "2️⃣  Exporting Services..."
SVCS=$(kubectl get svc -n "$SOURCE_NS" -o name || true)
if [ -n "$SVCS" ]; then
    for svc in $SVCS; do
        SVC_NAME=${svc#service/}
        kubectl get svc "$SVC_NAME" -n "$SOURCE_NS" -o yaml > "$OUTPUT_DIR/svc-${SVC_NAME}.yaml"
        sed -i '' \
            -e "s/namespace: ${SOURCE_NS}/namespace: ${NEW_NS}/" \
            -e '/clusterIP:/d' \
            -e '/clusterIPs:/d' \
            -e '/- [0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}/d' \
            "$OUTPUT_DIR/svc-${SVC_NAME}.yaml"
        clean_yaml "$OUTPUT_DIR/svc-${SVC_NAME}.yaml"
        echo "   ↳ $SVC_NAME"
    done
else
    echo "   ⚠️  No Services found"
fi

echo "3️⃣  Exporting Deployments..."
DEPLOYS=$(kubectl get deploy -n "$SOURCE_NS" -o name || true)
if [ -n "$DEPLOYS" ]; then
    for deploy in $DEPLOYS; do
        DEPLOY_NAME=${deploy#deployment.apps/}
        kubectl get deploy "$DEPLOY_NAME" -n "$SOURCE_NS" -o yaml > "$OUTPUT_DIR/deploy-${DEPLOY_NAME}.yaml"
        sed -i '' "s/namespace: ${SOURCE_NS}/namespace: ${NEW_NS}/" "$OUTPUT_DIR/deploy-${DEPLOY_NAME}.yaml"

        # Update image if specified
        if [ -n "$NEW_IMAGE" ]; then
            OLD_IMAGE=$(kubectl get deploy "$DEPLOY_NAME" -n "$SOURCE_NS" -o jsonpath='{.spec.template.spec.containers[0].image}')
            sed -i '' "s|image: ${OLD_IMAGE}|image: ${NEW_IMAGE}|" "$OUTPUT_DIR/deploy-${DEPLOY_NAME}.yaml"
            echo "   ↳ $DEPLOY_NAME (image: $NEW_IMAGE)"
        else
            echo "   ↳ $DEPLOY_NAME"
        fi

        clean_yaml "$OUTPUT_DIR/deploy-${DEPLOY_NAME}.yaml"
    done
else
    echo "   ⚠️  No Deployments found"
fi

echo "4️⃣  Exporting Ingresses..."
INGRESSES=$(kubectl get ingress -n "$SOURCE_NS" -o name || true)
if [ -n "$INGRESSES" ]; then
    for ing in $INGRESSES; do
        ING_NAME=${ing#ingress.networking.k8s.io/}
        kubectl get ingress "$ING_NAME" -n "$SOURCE_NS" -o yaml > "$OUTPUT_DIR/ing-${ING_NAME}.yaml"

        # Get original domain
        OLD_DOMAIN=$(kubectl get ingress "$ING_NAME" -n "$SOURCE_NS" -o jsonpath='{.spec.rules[0].host}')

        # Replace namespace
        sed -i '' "s/namespace: ${SOURCE_NS}/namespace: ${NEW_NS}/" "$OUTPUT_DIR/ing-${ING_NAME}.yaml"

        # Replace domain if exists
        if [ -n "$OLD_DOMAIN" ]; then
            sed -i '' \
                -e "s/host: ${OLD_DOMAIN}/host: ${NEW_DOMAIN}/" \
                -e "s/- ${OLD_DOMAIN}/- ${NEW_DOMAIN}/" \
                "$OUTPUT_DIR/ing-${ING_NAME}.yaml"

            # Update domain in CSP if exists
            if grep -q "${OLD_DOMAIN}" "$OUTPUT_DIR/ing-${ING_NAME}.yaml"; then
                sed -i '' "s/${OLD_DOMAIN}/${NEW_DOMAIN}/g" "$OUTPUT_DIR/ing-${ING_NAME}.yaml"
            fi

            echo "   ↳ $ING_NAME (domain: $NEW_DOMAIN)"
        else
            echo "   ↳ $ING_NAME (no domain)"
        fi

        clean_yaml "$OUTPUT_DIR/ing-${ING_NAME}.yaml"
    done
else
    echo "   ⚠️  No Ingresses found"
fi

echo ""
echo "====================================="
echo "📝 Generated files:"
echo "====================================="
ls -lh "$OUTPUT_DIR/" | tail -n +2

echo ""
read -p "Apply now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Applying resources..."
    kubectl apply -f "$OUTPUT_DIR/"

    echo ""
    echo "====================================="
    echo "✅ Done!"
    echo "====================================="
    echo ""
    echo "View resources: kubectl get all,cm,ingress -n $NEW_NS"
    echo "View logs:      kubectl logs -n $NEW_NS -l app=<app-name> -f"
    echo "Access URL:     https://$NEW_DOMAIN"
    echo ""
else
    echo ""
    echo "====================================="
    echo "⏸️  Cancelled"
    echo "====================================="
    echo ""
    echo "Apply manually: kubectl apply -f $OUTPUT_DIR/"
    echo ""
fi
