#!/bin/bash
ARCH=${ARCH:-"amd64"}
CLOUD_VERSION=${CLOUD_VERSION:-"latest"}
PROXY=${PROXY:-"ghcr.io"}
# pull and save images
mkdir -p output/tars

images=(
  ${PROXY}/labring/sealos/kubernetes:v1.28.15
  ${PROXY}/labring/sealos/helm:v3.16.2
  ${PROXY}/labring/sealos/cilium:v1.17.1
  ${PROXY}/labring/sealos/cert-manager:v1.14.6
  ${PROXY}/labring/sealos/openebs:v3.10.0
  ${PROXY}/labring/sealos/victoria-metrics-k8s-stack:v1.124.0
  ${PROXY}/labring/sealos/higress:v2.1.3
  ${PROXY}/labring/sealos/kubeblocks:v0.8.2
  ${PROXY}/labring/sealos/kubeblocks-kafka:v0.8.2
  ${PROXY}/labring/sealos/cockroach:v2.12.0
  ${PROXY}/labring/sealos/metrics-server:v0.6.4
  ${PROXY}/labring/sealos/sealos-certs:v0.1.0
  ${PROXY}/labring/sealos/sealos-finish:v0.1.0
  ${PROXY}/labring/sealos-cloud:$CLOUD_VERSION
)

for image in "${images[@]}"; do
  sealos pull --platform "linux/$ARCH" "$image"
  filename=$(echo "$image" | cut -d':' -f1 | tr / -)
  if [[ ! -f "output/tars/${filename}.tar" ]]; then
    sealos save -o "output/tars/${filename}.tar" "$image"
  fi
done

mkdir -p output/cli

VERSION="v5.1.1"

wget https://github.com/labring/sealos/releases/download/${VERSION}/sealos_${VERSION#v}_linux_${ARCH}.tar.gz \
   && tar zxvf sealos_${VERSION#v}_linux_${ARCH}.tar.gz sealos && chmod +x sealos && mv sealos output/cli


echo '#!/bin/bash

cp cli/sealos /usr/local/bin

for file in tars/*.tar; do
  /usr/local/bin/sealos load -i $file
done

'  > output/load-images.sh

curl -sfL https://raw.githubusercontent.com/labring/sealos/main/scripts/cloud/install-v2.sh -o output/install-v2.sh
curl -sfL https://raw.githubusercontent.com/labring/sealos/main/scripts/cloud/sealos.env -o output/sealos.env

# tar output to a tar.gz
mv output sealos-cloud
tar czfv sealos-cloud.tar.gz sealos-cloud

# md5sum output tar.gz
md5sum sealos-cloud.tar.gz | cut -d " " -f1 > sealos-cloud.tar.gz.md5
