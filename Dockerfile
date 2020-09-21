FROM  golang:1.15.2-alpine AS builder

ENV GO111MODULE=on
ENV GOPROXY=https://goproxy.io

WORKDIR /root

COPY . .
RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build  -o /sealos -ldflags "-s -w -X github.com/fanux/sealos/version.Version=latest  -X github.com/fanux/sealos/version.Build= -X github.com/fanux/sealos/version.BuildTime=" main.go

FROM alpine AS UPX
COPY --from=builder /sealos /sealos
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
	apk add --update upx && upx /sealos
FROM scratch
COPY --from=UPX /sealos /bin/sealos
ENTRYPOINT ["/bin/sealos"]