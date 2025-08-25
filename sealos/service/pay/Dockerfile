FROM gcr.io/distroless/static:nonroot

ARG TARGETARCH
COPY bin/service-pay-$TARGETARCH /manager
EXPOSE 2303
USER 65532:65532

ENTRYPOINT ["/manager"]