FROM gcr.io/distroless/static:nonroot

ARG TARGETARCH
WORKDIR /
USER 65532:65532

COPY bin/service-imagehub-$TARGETARCH /service
COPY etc /etc

ENTRYPOINT ["/service -f etc/config.yaml"]