- [v4.1.1](#v411httpsgithubcomlabringsealosreleasestagv411)
  - [Downloads for v4.1.1](#downloads-for-v411)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.1](#changelog-since-v410)


# [v4.1.1](https://github.com/labring/sealos/releases/tag/v4.1.1)

## Downloads for v4.1.1


### Source Code

filename |
-------- |
[v4.1.1.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.1.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.1_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.1/sealos_4.1.1_linux_amd64.tar.gz) |
[sealos_4.1.1_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.1/sealos_4.1.1_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.1/sealos_4.1.1_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.1_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.1/sealos_4.1.1_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.1_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.0

### What's Changed

* feat(auth): local cdn by @Abingcbc in https://github.com/labring/sealos/pull/1664
* feature(main): override registry config for buildah by @cuisongliu in https://github.com/labring/sealos/pull/1665
* feature(main): doc: add docker images for sealos by @cuisongliu in https://github.com/labring/sealos/pull/1667
* feature(main): docs fix title by @cuisongliu in https://github.com/labring/sealos/pull/1669
* update install on single node, add calico and version requirement by @fanux in https://github.com/labring/sealos/pull/1671
* update docs by @zzjin in https://github.com/labring/sealos/pull/1673
* Update developguide by @Rushmmmc in https://github.com/labring/sealos/pull/1678
* feat: support merging configs on run command by @fengxsong in https://github.com/labring/sealos/pull/1658
* feature(main):  hotfix kubelet 10250 dead by @cuisongliu in https://github.com/labring/sealos/pull/1681

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.0...v4.1.1
