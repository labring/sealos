FROM gcr.io/distroless/static:nonroot

ARG TARGETARCH
WORKDIR /
USER 65532:65532

ENV USER_NAMESPACE=user-system
ENV APP_NAMESPACE=app-system

COPY bin/controller-app-$TARGETARCH /manager

ENTRYPOINT ["/manager"]