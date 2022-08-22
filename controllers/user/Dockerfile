FROM alpine:3.16.2

ARG TARGETARCH
ENTRYPOINT ["/manager"]

WORKDIR /root

COPY bin /bin

RUN cp /bin/controller-user-$TARGETARCH /manager && rm -rf /bin

