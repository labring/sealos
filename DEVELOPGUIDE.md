# Environment settings

sealos only support linux now, you need a linux server to test it.

Some tools can be very handy to help you start a virtual machine such as [multipass](https://multipass.run/)

## Install golang

```shell
wget https://go.dev/dl/go1.19.2.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.19.2.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
go version
```

## Build the project

```shell script
git clone https://github.com/labring/sealos
cd sealos
make build
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

## FAQ

1. clone code slow, your can use ghproxy: `git clone https://ghproxy.com/https://github.com/labring/sealos`
2. build download package slow, you can use goproxy: `go env -w GOPROXY=https://goproxy.cn,direct && make build`
3. `cgo: C compiler "x86_64-linux-gnu-gcc" not found: exec: "x86_64-linux-gnu-gcc": executable file not found in $PATH` you need install gnu-gcc, like: `apt-get install build-essential` or `yum -y install gcc-c++-x86_64-linux-gnu`
