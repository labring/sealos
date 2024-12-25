# FROM scratch
FROM gcr.io/distroless/static:nonroot
# FROM gengweifeng/gcr-io-distroless-static-nonroot
ARG TARGETARCH
COPY bin/service-launchpad-$TARGETARCH /manager
EXPOSE 9090
USER 65532:65532

ENTRYPOINT ["/manager"]
