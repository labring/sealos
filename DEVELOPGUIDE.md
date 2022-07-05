# Environment settings

sealos only support linux now, you need a linux server to test it.

Some tools can be very handy to help you start a virtual machine such as [multipass](https://multipass.run/)

# Build the project

```shell script
git clone https://github.com/labrirng/sealos
cd sealos
make build
```

You can scp the bin file to your linux host.

If you use multipaas, you can mount the bin dir to the vm:

```shell script
multipass mount /your-bin-dir <name>[:<path>]
```

## Notice About build and cross build

Since Golang CGO_ENABLED is enabled by default if it is not specified, if you compile the sealos binary of linuxos on
macos, it is cross-compiled, and since CGO_ENABLED is not explicitly specified, go will close CGO_ENABLED by default,
that is, CGO_ENABLED=0, and compile at this time Some functions of sealos will not be supported, such as
'images' subcommand depends on cgo for overlay. At this time, sealos does not support overlay driver by default, and
will report "driver not supported" error. Therefore, if you are developing or debugging images storage related
functions, it is best to compile sealos in a linux environment such as ubuntu.

In addition, the final release build of sealos is based on the ubuntu environment of Github Action. The built binary
defaults to open CGO and supports overlay driver.

Then test it locally.
