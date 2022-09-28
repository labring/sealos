#!/usr/bin/env sh

set -e

usage() {
  cat <<EOF
Generate certificate suitable for use with any Kubernetes Mutating Webhook.
This script uses k8s' CertificateSigningRequest API to generate a certificate signed by k8s CA suitable for use with any Kubernetes Mutating Webhook service pod.
This requires permissions to create and approve CSR. See: https://kubernetes.io/docs/tasks/tls/managing-tls-in-a-cluster for detailed explanation and additional instructions.
The server key/cert k8s CA cert are stored in a k8s secret.
usage: ${0} [OPTIONS]
The following flags are required.
    --service          Service name of webhook.
    --webhook          Webhook config name.
    --namespace        Namespace where webhook service and secret reside.
    --secret           Secret for CA certificate and server certificate/key pair.
The following flags are optional.
    --webhook-kind     Webhook kind, either MutatingWebhookConfiguration or
                       ValidatingWebhookConfiguration (defaults to MutatingWebhookConfiguration)
EOF
}

while [ $# -gt 0 ]; do
  case ${1} in
  --service)
    service="$2"
    ;;
  --webhook)
    webhook="$2"
    ;;
  --secret)
    secret="$2"
    ;;
  --namespace)
    namespace="$2"
    ;;
  --webhook-kind)
    kind="$2"
    ;;
  *)
    usage
    exit
    ;;
  esac
  shift 2
done

[ -z "${service}" ] && echo "ERROR: --service flag is required" && exit 1
[ -z "${webhook}" ] && echo "ERROR: --webhook flag is required" && exit 1
[ -z "${secret}" ] && echo "ERROR: --secret flag is required" && exit 1
[ -z "${namespace}" ] && echo "ERROR: --namespace flag is required" && exit 1

fullServiceDomain="${service}.${namespace}.svc"
# THE CN has a limit of 64 characters.
if [ ${#fullServiceDomain} -gt 64 ]; then
  echo "ERROR: common name exceeds the 64(character) limit: ${fullServiceDomain}"
  exit 1
fi

if ! command -v openssl; then
  echo "ERROR: openssl not found"
  exit 1
fi

tmpdir=${TMPDIR:-$(mktemp -d)}
echo "creating certs in tmpdir ${tmpdir}"

readonly CA="${tmpdir}/ca.crt"
readonly CAkey="${tmpdir}/ca.key"
readonly SERVER="${tmpdir}/server"
$(which cp) /etc/kubernetes/pki/ca.crt "$CA" >/dev/null 2>&1 || true
$(which cp) /etc/kubernetes/pki/ca.key "$CAkey" >/dev/null 2>&1 || true
[ -s "$CAkey" ] || openssl genrsa -out "$CAkey" 4096
[ -s "$SERVER.key" ] || openssl genrsa -out "$SERVER.key" 4096
cat <<EOF >"$SERVER.conf"
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
[req_distinguished_name]
[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = ${service}
DNS.2 = ${service}.${namespace}
DNS.3 = ${fullServiceDomain}
EOF

{
  openssl rand -out "$HOME/.rnd" 1024
  [ -s "$CA" ] || openssl req -new -key "$CAkey" -out "$CA" \
    -x509 -days $((365 * 30)) \
    -subj "/C=CN/ST=OpenSource/L=Community/O=Borg/OU=Kubernetes/CN=SelfSigned"
  openssl req -new -key "$SERVER.key" -out "$SERVER.csr" \
    -config "$SERVER.conf" \
    -subj "/CN=${fullServiceDomain}"
  openssl x509 -in "$SERVER.csr" -out "$SERVER.crt" \
    -req -days $((365 * 10)) -extensions v3_req -extfile "$SERVER.conf" \
    -CA "$CA" -CAkey "$CAkey" -CAcreateserial -CAserial "$SERVER.srl"
}

# create the secret with CA cert and server cert/key
kubectl create secret tls "${secret}" \
  --key="${tmpdir}/server.key" \
  --cert="${tmpdir}/server.crt" \
  --dry-run=client -o yaml |
  kubectl -n "${namespace}" apply -f -

caBundle=$(base64 "${tmpdir}/ca.crt" | tr -d '\n')

# Patch the webhook adding the caBundle. It uses an `add` operation to avoid errors in OpenShift because it doesn't set a default value of empty string like Kubernetes. Instead, it doesn't create the caBundle key.
# As the webhook is not created yet (the process should be done manually right after this job is created), the job will not end until the webhook is patched.
for webhook_index in $(seq "$(kubectl get "${kind:-mutatingwebhookconfiguration}" "${webhook}" -o template='{{.webhooks|len}}')"); do
  while true; do
    echo "INFO: Trying to patch webhook adding the caBundle."
    if kubectl patch "${kind:-mutatingwebhookconfiguration}" "${webhook}" --type='json' -p "[{'op': 'add', 'path': '/webhooks/$((webhook_index - 1))/clientConfig/caBundle', 'value':'${caBundle}'}]"; then
      break
    fi
    echo "INFO: webhook not patched. Retrying in 5s..."
    sleep 5
  done
done
