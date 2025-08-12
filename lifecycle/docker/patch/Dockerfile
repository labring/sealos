FROM scratch
LABEL sealos.io.type="patch"
COPY images ./images
COPY registry ./registry
COPY sealctl ./opt/sealctl
COPY image-cri-shim ./cri/image-cri-shim
COPY upgrade.sh ./upgrade.sh
# nosemgrep: dockerfile.security.missing-user.missing-user
CMD ["bash upgrade.sh"]
