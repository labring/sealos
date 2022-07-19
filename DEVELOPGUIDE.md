# Environment settings

sealos only support linux now, you need a linux server to test it.

Some tools can be very handy to help you start a virtual machine such as [multipass](https://multipass.run/)

## Build the project

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

Then test it locally.

## Notes about cross-platform building

If not explicitly specified, `CGO_ENABLED` will be `0` (disabled), which allows cross-platform building but sacrificing support for subcommands like `images` that relies on CGO. That is, when running `sealos images`, since overlay driver is not supported without CGO, a "driver not supported" error will occur.

Therefore, if you are developing or debugging images storage related functions, you have to build sealos under Linux.

In addition, the released version of sealos is built under Ubuntu (thanks to Github Actions) and has `CGO_ENABLED=1` to support overlay driver.
