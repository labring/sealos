FROM alpine:latest

ARG TARGETARCH
COPY bin/service-aiproxy-$TARGETARCH /aiproxy

ENV PUID=0 PGID=0 UMASK=022

ENV FFPROBE_ENABLED=true

EXPOSE 3000

RUN apk add --no-cache ca-certificates tzdata ffmpeg && \
    rm -rf /var/cache/apk/*

ENTRYPOINT ["/aiproxy"]
