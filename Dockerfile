FROM  golang:1.14.3  AS builder

ENV GO111MODULE=on
ENV GOPROXY=https://goproxy.io

WORKDIR /root

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build  -o /sealos -mod vendor -ldflags "-X github.com/fanux/sealos/version.Version=latest  -X github.com/fanux/sealos/version.Build= -X 'github.com/fanux/sealos/version.BuildTime='" main.go

FROM alpine:3.7
ENV TZ=Asia/Shangha
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
	apk add tzdata ca-certificates && \
	cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
	echo "Asia/Shanghai" > /etc/timezone && apk add --update bash && \
	rm -rf /var/cache/apk/*
COPY --from=builder /sealos /bin/sealos
ENTRYPOINT ["/bin/sealos"]