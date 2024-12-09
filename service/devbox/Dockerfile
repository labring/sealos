FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH
COPY bin/service-aiproxy-$TARGETARCH /manager
EXPOSE 8092
USER 65532:65532

ENTRYPOINT ["/manager"]