# build.sh v3.0.2
COMMIT_SHA1=$(git rev-parse --short HEAD || echo "0.0.0")
BUILD_TIME=$(date "+%F %T")
go build -o sealos  -ldflags "-s -w -X github.com/fanux/sealos/version.Version=$1 -X github.com/fanux/sealos/version.Build=${COMMIT_SHA1} -X 'github.com/fanux/sealos/version.BuildTime=${BUILD_TIME}'" main.go
command  -v upx &> /dev/null && upx sealos