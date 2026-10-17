# Compile bin/manager on the native runner before packaging this image.
FROM gcr.io/distroless/static:nonroot
COPY bin/manager /manager
USER 65532:65532
EXPOSE 8428
ENTRYPOINT ["/manager", "/config/config.yml"]
