- [v4.1.2](#v412httpsgithubcomlabringsealosreleasestagv412)
  - [Downloads for v4.1.2](#downloads-for-v412)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.2](#changelog-since-v411)


# [v4.1.2](https://github.com/labring/sealos/releases/tag/v4.1.2)

## Downloads for v4.1.2


### Source Code

filename |
-------- |
[v4.1.2.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.2.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.2_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.2/sealos_4.1.2_linux_amd64.tar.gz) |
[sealos_4.1.2_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.2/sealos_4.1.2_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.2/sealos_4.1.2_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.2_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.2/sealos_4.1.2_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.2_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.1

### What's Changed

* fix: override spec value from flags by @fengxsong in https://github.com/labring/sealos/pull/1685

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.1...v4.1.2


