- [v4.1.3](#v413httpsgithubcomlabringsealosreleasestagv413)
  - [Downloads for v4.1.3](#downloads-for-v413)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.3](#changelog-since-v413-rc1)


# [v4.1.3](https://github.com/labring/sealos/releases/tag/v4.1.3)

## Downloads for v4.1.3


### Source Code

filename |
-------- |
[v4.1.3.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.3.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.3_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.3/sealos_4.1.3_linux_amd64.tar.gz) |
[sealos_4.1.3_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.3/sealos_4.1.3_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.3/sealos_4.1.3_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.3_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.3/sealos_4.1.3_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.3_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.3-rc1

### What's Changed
* remove upx compress on sealos binary by @zzjin in https://github.com/labring/sealos/pull/1705
* Frontend updates by @zzjin in https://github.com/labring/sealos/pull/1707
* feature(main):  add binary for buildah by @cuisongliu in https://github.com/labring/sealos/pull/1709
* feature(main):  add upx for sealos by @cuisongliu in https://github.com/labring/sealos/pull/1710


**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.3-rc1...v4.1.3


