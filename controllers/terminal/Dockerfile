FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH
WORKDIR /
COPY bin/controller-terminal-$TARGETARCH /manager
ENTRYPOINT ["/manager"]