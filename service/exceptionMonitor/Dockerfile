FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH
COPY bin/service-exceptionmonitor-$TARGETARCH /manager

ENTRYPOINT ["/manager"]