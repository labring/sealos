# build.sh v3.0.2
COMMIT_SHA1=$(git rev-parse --short HEAD || echo "0.0.0")
BUILD_TIME=$(date "+%F %T")
docker run -v $GOPATH/src/github.com/fanux/sealos:/go/src/github.com/fanux/sealos -w /go/src/github.com/fanux/sealos --rm golang:1.13.5 \
go build -o sealos -ldflags "-X github.com/fanux/sealos/version.Version=$1 -X github.com/fanux/sealos/version.Build=${COMMIT_SHA1} -X 'github.com/fanux/sealos/version.BuildTime=${BUILD_TIME}'" main.go
command  -v upx &> /dev/null && upx sealos
../ossutil64 -c ../oss-config cp -f sealos oss://sealyun/$1/sealos
