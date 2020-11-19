FROM alpine

COPY sealos /bin/sealos
COPY test/entrypoint.sh /entrypoint.sh

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
	apk add --update bash upx && cd /bin &&  upx sealos

ENTRYPOINT ["/entrypoint.sh"]
RUN  chmod +x /entrypoint.sh
