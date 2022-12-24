FROM gcr.io/distroless/static:nonroot

ARG TARGETARCH
WORKDIR /
USER 65532:65532

ENV USER_NAMESPACE=user-system
ENV IMAGEHUB_NAMESPACE=imagehub-system

COPY bin/controller-imagehub-$TARGETARCH /manager

ENTRYPOINT ["/manager"]