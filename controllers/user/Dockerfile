FROM gcr.io/distroless/static:nonroot

ARG TARGETARCH
ENTRYPOINT ["/manager"]
WORKDIR /
USER 65532:65532
COPY bin/controller-user-$TARGETARCH /manager

