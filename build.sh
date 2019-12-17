# build.sh v3.0.2
go build -mod vendor -o sealos -ldflags "-X github.com/fanux/sealos/version.Version=$1" main.go
