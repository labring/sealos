# build.sh v3.0.2
COMMIT_SHA1=$(git rev-parse --short HEAD || echo "0.0.0")
go build -o sealos -mod vendor -ldflags "-X github.com/fanux/sealos/version.Version=$1 -X github.com/fanux/sealos/version.Build=${COMMIT_SHA1}" main.go
