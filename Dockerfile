FROM  golang:1.16.1-alpine AS builder

ENV GO111MODULE=on
ENV GOPROXY=https://goproxy.io

WORKDIR /root

COPY . .
RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build  -o /sealos -ldflags "-s -w -X github.com/linuxsuren/cobra-extension/version.version=latest  -X github.com/linuxsuren/cobra-extension/version.commit= -X github.com/linuxsuren/cobra-extension/version.date=" main.go

FROM alpine AS UPX
COPY --from=builder /sealos /sealos
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
	apk add --update upx && upx /sealos
FROM alpine
COPY --from=UPX /sealos /bin/sealos
ENTRYPOINT ["/bin/sealos"]
