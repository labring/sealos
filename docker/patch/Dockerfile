FROM scratch
LABEL image="ghcr.io/labring/lvscare:v1.1.3-beta.8"
LABEL sealos.io.type="patch"
COPY images ./images
COPY registry ./registry
COPY sealctl ./opt/sealctl
COPY image-cri-shim ./cri/image-cri-shim
