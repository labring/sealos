FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH

WORKDIR /
RUN useradd -u 1337 terminal
USER terminal

COPY bin/controller-terminal-$TARGETARCH /manager
ENTRYPOINT ["/manager"]
