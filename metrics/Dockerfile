FROM gcr.io/distroless/static:nonroot

WORKDIR /
USER 65532:65532

COPY crd_exporter /crd_exporter
ENTRYPOINT ["/crd_exporter"]