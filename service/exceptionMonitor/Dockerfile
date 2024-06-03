FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH
COPY bin/service-exceptionMonitor-$TARGETARCH /manager

ENTRYPOINT ["/manager"]