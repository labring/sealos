FROM alpine AS production
ARG TARGETOS TARGETARCH

COPY ./$TARGETOS\_$TARGETARCH/lvscare /usr/bin/lvscare
ENTRYPOINT ["/usr/bin/lvscare"]
