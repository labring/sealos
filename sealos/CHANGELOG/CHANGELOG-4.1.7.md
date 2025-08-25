- [v4.1.7](#v417)
  - [Downloads for v4.1.7](#downloads-for-v417)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.7](#changelog-since-)
  - [NewContributors](#new-contributors)


# [v4.1.7](https://github.com/labring/sealos/releases/tag/v4.1.7)

## Downloads for v4.1.7


### Source Code

filename |
-------- |
[v4.1.7.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.7.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.7_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.7/sealos_4.1.7_linux_amd64.tar.gz) |
[sealos_4.1.7_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.7/sealos_4.1.7_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.7/sealos_4.1.7_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.7_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.7/sealos_4.1.7_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.7_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.7

### What's Changed
* fix(main): delete node not exec clean.sh by @cuisongliu in https://github.com/labring/sealos/pull/2759


**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.5...v4.1.7


