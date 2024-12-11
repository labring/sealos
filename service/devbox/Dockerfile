FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH
COPY bin/service-devbox-$TARGETARCH /manager
EXPOSE 8092
USER 65532:65532

ENTRYPOINT ["/manager"]