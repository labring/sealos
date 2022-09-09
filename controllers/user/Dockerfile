FROM gcr.io/distroless/static:nonroot

ARG TARGETARCH
ENTRYPOINT ["/manager"]
WORKDIR /
USER 65532:65532
RUN cp /bin/controller-user-$TARGETARCH /manager
