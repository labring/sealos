FROM gcr.io/distroless/static:nonroot
COPY bin/manager /manager
COPY config/* /
EXPOSE 35001
USER 65532:65532

ENTRYPOINT "/manager", "-config", "/config.yml"