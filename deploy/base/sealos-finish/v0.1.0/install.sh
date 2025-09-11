#!/bin/bash

SEALOS_CLOUD_DOMAIN=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudDomain}')
SEALOS_CLOUD_PORT=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudPort}')
timestamp() {
  date +"%Y-%m-%d %T"
}
print() {
  flag=$(timestamp)
  echo -e "\033[1;32m\033[1m INFO [$flag] >> $* \033[0m"
}
warn() {
  flag=$(timestamp)
  echo -e "\033[33m WARN [$flag] >> $* \033[0m"
}
info() {
  flag=$(timestamp)
  echo -e "\033[36m INFO [$flag] >> $* \033[0m"
}
#===========================================================================
kubernetes_version=$(kubectl version | awk -Fv '/Server Version: /{print $3}')
sealos_cloud_version=$(kubectl get deployment -n sealos  desktop-frontend -o jsonpath='{.spec.template.spec.containers[0].image}' | awk -F: '{print $2}')

doc_app(){
    cat << EOF > sealos-document-app.yaml
apiVersion: app.sealos.io/v1
kind: App
metadata:
  name: sealos-document
  namespace: app-system
spec:
  data:
    desc: Sealos Documents
    url: https://sealos.run/docs/Intro/
  displayType: normal
  i18n:
    zh:
      name: 文档中心
    zh-Hans:
      name: 文档中心
  icon: https://objectstorageapi.cloud.sealos.top/resources/document.svg
  name: Sealos Document
  type: iframe
EOF
    kubectl apply -f sealos-document-app.yaml
}

grant_tls(){
    sealos cert --alt-names "${SEALOS_CLOUD_DOMAIN}"
    print "[Step] TLS certificate details:"
    openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | awk -F', ' '
    {
        for(i=1;i<=NF;i++) {
            if ($i ~ /^DNS:/) {
                gsub(/^DNS:/, "🌐 DNS: ", $i)
                print $i
            }
            else if ($i ~ /^IP Address:/) {
                gsub(/^IP Address:/, "📡 IP:   ", $i)
                print $i
            }
        }
    }'
}


finish_info() {
    print "Installation complete!"
    print "Kubernetes version: ${kubernetes_version}"
    print "Sealos Cloud version: ${sealos_cloud_version}"
    print "Access URL: https://${SEALOS_CLOUD_DOMAIN}:${SEALOS_CLOUD_PORT}"
    print "Default admin credentials:"
    print "  Username: admin"
    print "  Password: sealos2023"
}
varAcmednsFullDoamin=$(kubectl get configmap cert-config -n sealos-system -o jsonpath='{.data.ACMEDNS_FULL_DOMAIN}')
varCertMode=$(kubectl get configmap cert-config -n sealos-system -o jsonpath='{.data.CERT_MODE}')

tls_tips() {
    print "TLS certificate information (important - please review):"
    case $varCertMode in
      acmedns)
        print "A CNAME record should point ${SEALOS_CLOUD_DOMAIN} to the ACME DNS name provided during installation."
        print "Create a CNAME record for '_acme-challenge.${SEALOS_CLOUD_DOMAIN}' pointing to the ${varAcmednsFullDoamin}."
        ;;
      self-signed)
        print "No TLS certificate provided — a self-signed certificate will be used by Sealos Cloud."
        print "Browsers and clients will show a warning unless the self-signed certificate is trusted."
        print "To trust the certificate, follow the guide: https://sealos.run/docs/self-hosting/install#信任自签名证书"
        ;;
      https)
        print "A custom TLS certificate and private key were provided."
        print "Ensure the DNS name ${SEALOS_CLOUD_DOMAIN} resolves to this server's IP so the certificate is valid."
        print "If you encounter certificate errors in clients, verify the certificate chain and that the hostname matches."
        ;;
      *)
        error  "Unknown CERT_MODE: ${varCertMode}"
        ;;
      esac
}


{
  info "Starting Sealos Cloud post-installation steps..."
  doc_app
  grant_tls
  finish_info
  tls_tips
}