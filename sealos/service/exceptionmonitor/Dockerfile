FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH
COPY bin/service-exceptionmonitor-$TARGETARCH /manager
USER 65532:65532
ENTRYPOINT ["/manager"]