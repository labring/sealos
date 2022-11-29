FROM gcr.io/distroless/static:nonroot

ARG TARGETARCH
WORKDIR /
USER 65532:65532
COPY bin/controller-app-$TARGETARCH /manager

ENTRYPOINT ["/manager"]
