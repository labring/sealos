FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH

WORKDIR /
USER 65532:65532

COPY bin/controller-resources-$TARGETARCH /manager
ENTRYPOINT ["/manager"]
