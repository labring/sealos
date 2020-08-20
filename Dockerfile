FROM  golang:1.14.3  AS builder

ENV GO111MODULE=on
ENV GOPROXY=https://goproxy.io

WORKDIR /root

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build  -o /sealos -mod vendor -ldflags "-X github.com/fanux/sealos/version.Version=latest  -X github.com/fanux/sealos/version.Build= -X 'github.com/fanux/sealos/version.BuildTime='" main.go

FROM alpine:3.7
COPY --from=builder /sealos /bin/sealos
ENTRYPOINT ["/bin/sealos"]