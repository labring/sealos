FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH
COPY bin/service-hubble-$TARGETARCH /manager
EXPOSE 8428
USER 65532:65532

ENTRYPOINT [ "/manager", "config/config.yml" ]