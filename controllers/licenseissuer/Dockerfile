FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH

WORKDIR /
USER 65532:65532

COPY bin/controller-licenseissuer-$TARGETARCH /manager
COPY bin/preset-$TARGETARCH /preset
COPY bin/launcher-$TARGETARCH /launcher

ENTRYPOINT ["/launcher"]
