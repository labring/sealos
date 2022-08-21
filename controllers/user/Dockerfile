FROM alpine:3.16.2

ARG TARGETPLATFORM
ARG TARGETARCH
ENTRYPOINT ["/manager"]

WORKDIR /root

RUN --mount=target=/bin cp /bin/controllers-user-${TARGETARCH} /manager && chmod +x /manager
