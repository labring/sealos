FROM scratch
# FROM gengweifeng/gcr-io-distroless-static-nonroot
ARG TARGETARCH
COPY bin/sealos-cloud-database-monitor-$TARGETARCH /manager
EXPOSE 9090
USER 65532:65532

ENTRYPOINT ["/manager"]
