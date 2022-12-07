# Environment settings

sealos only support linux now, you need a linux server to test it.

Some tools can be very handy to help you start a virtual machine such as [multipass](https://multipass.run/)

## Install golang

```shell
wget https://go.dev/dl/go1.19.2.linux-amd64.tar.gz
tar -C /usr/local -zxvf go1.19.2.linux-amd64.tar.gz
cat >> /etc/profile <<EOF
# set go path
export PATH=\$PATH:/usr/local/go/bin
EOF
source /etc/profile  && go version
```

## Build the project

```shell script
git clone https://github.com/labring/sealos.git
cd sealos
make build BINS=sealos
```

You can scp the bin file to your linux host.

If you use multipaas, you can mount the bin dir to the vm:

```shell script
multipass mount /your-bin-dir <name>[:<path>]
```

Then test it locally.

## Notes about cross-platform building

All the binaries except `sealos` can be built anywhere since they have `CGO_ENABLED=0`. However, `sealos` needs to support overlay driver when running some subcommands like `images`, which relies on CGO. Therefore CGO is switched on when building `sealos`, making it impossible to build `sealos` binaries on platforms other than Linux.

> Both Makefile and GoReleaser in this project have this setting.

## Notes about go workspace

As sealos is using go1.18's workspace feature, once you add a new module, you need to run `go work usr -r .` at root directry to update the workspace synced.

### Create a new CRD and Controller
Create your CRD directory in pkg "controllers" first.

Cd into your CRD directory

```shell script
kubebuilder init --domain sealos.io --repo github.com/labring/sealos/controllers/<name>
```

Then `go work use -r .` at current directory to update the workspace.

```shell script
kubebuilder create api --group <name> --version v1 --kind <name>
```

## Using sealos image ci

### How to build container image
1. fix makefile build step
    ```makefile
   .PHONY: build
    build:## Build manager binary.
    CGO_ENABLED=0 go build -o bin/manager main.go
    ```
2. build amd64 bin and arm64 bin
    - amd64 bin
   ```
   GOARCH=amd64 make build
   mv bin/manager bin/controller-${{ matrix.module }}-amd64
   chmod +x bin/controller-${{ matrix.module }}-amd64
   ```
    - arm64 bin
   ```
   GOARCH=arm64 make build
   mv bin/manager bin/controller-${{ matrix.module }}-arm64
   chmod +x bin/controller-${{ matrix.module }}-arm64
   ```
3. fix dockerfile
   ```dockerfile
   FROM gcr.io/distroless/static:nonroot
   ARG TARGETARCH
   
   WORKDIR /
   USER 65532:65532
   
   COPY bin/controller-${{ matrix.module }}-$TARGETARCH /manager
   ENTRYPOINT ["/manager"]
   ```
   tips: .dockerignore not add bin dir
4. docker buildx
   ```shell
   docker buildx build \
      --platform linux/amd64,linux/arm64 \
      --push \
      -t ${DOCKER_REPO}:${{ steps.prepare.outputs.tag_name }} \
      -f Dockerfile \
      .
   ```

### How to build sealos clusterimage

1. add makefile pre-deploy
   ```makefile
   .PHONY: deploy
   pre-deploy: manifests kustomize ## Deploy controller to the K8s cluster specified in ~/.kube/config.
   cd config/manager && $(KUSTOMIZE) edit set image controller=${IMG}
   $(KUSTOMIZE) build -e SERVICE_NAME=webhook-service -e SERVICE_NAMESPACE=system config/default  > deploy/manifests/deploy.yaml.tmpl
   ```
2. mkdir deploy/manifests
3. touch deploy/Kubefile
4. write Kubefile
   ```dockerfile
    FROM scratch
    USER 65532:65532
    COPY manifests ./manifests/xxxx
    COPY registry ./registry
    CMD ["kubectl apply -f manifests/xxx"]
   ```
5. commit pr to cluster-image
   code:  https://github.com/labring/cluster-image/blob/main/applications/sealos-app-controller/dev/init.sh

## Example: how to build sealos on macOS(ARM64) using multipass

1. luanch vm and mount sealos source code:
```shell
multipass launch \
   --mount /Users/fanux/work/src/github.com/labring/sealos:/go/src/github.com/labring/sealos \
   --name sealos-dev --cpus 2 --mem 4G --disk 40G
```
convert the source code DIR(/Users/fanux/work/src/github.com/labring/sealos) to your own.
2. exec into the vm
```shell
multipass exec sealos-dev bash
sudo su
```
3. install golang
```shell
apt-get install build-essential
apt install make
wget https://go.dev/dl/go1.19.3.linux-arm64.tar.gz
tar -C /usr/local -zxvf go1.19.3.linux-arm64.tar.gz
cat >> /etc/profile <<EOF
# set go path
export PATH=\$PATH:/usr/local/go/bin
EOF
source /etc/profile  && go version
```
4. Build the source code
```shell
go env -w GOPROXY=https://goproxy.cn,direct && make build
# OR make build
```

## FAQ

1. clone code slow, your can use ghproxy: `git clone https://ghproxy.com/https://github.com/labring/sealos`
2. build download package slow, you can use goproxy: `go env -w GOPROXY=https://goproxy.cn,direct && make build`
3. `cgo: C compiler "x86_64-linux-gnu-gcc" not found: exec: "x86_64-linux-gnu-gcc": executable file not found in $PATH` you need install gnu-gcc, like: `apt-get install build-essential` or `yum -y install gcc-c++-x86_64-linux-gnu`
