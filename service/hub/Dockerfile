FROM gcr.io/distroless/static:nonroot
COPY bin/manager /manager
EXPOSE 5001
USER 65532:65532

ENTRYPOINT "/manager"