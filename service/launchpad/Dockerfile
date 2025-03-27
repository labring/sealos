FROM --platform=linux/amd64 gcr.io/distroless/static:nonroot
ARG TARGETARCH=amd64
COPY bin/service-launchpad-$TARGETARCH /manager
EXPOSE 9090
USER 65532:65532
ENTRYPOINT ["/manager"]