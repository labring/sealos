- [v4.1.3-rc1](#v413-rc1httpsgithubcomlabringsealosreleasestagv413-rc1)
  - [Downloads for v4.1.3-rc1](#downloads-for-v413-rc1)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.3-rc1](#changelog-since-v412)


# [v4.1.3-rc1](https://github.com/labring/sealos/releases/tag/v4.1.3-rc1)

## Downloads for v4.1.3-rc1


### Source Code

filename |
-------- |
[v4.1.3-rc1.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.3-rc1.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.3-rc1_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.3-rc1/sealos_4.1.3-rc1_linux_amd64.tar.gz) |
[sealos_4.1.3-rc1_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.3-rc1/sealos_4.1.3-rc1_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.3-rc1/sealos_4.1.3-rc1_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.3-rc1_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.3-rc1/sealos_4.1.3-rc1_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.3-rc1_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.2

### What's Changed

* desktop ui  by @LeezQ in https://github.com/labring/sealos/pull/1675
* feature(main): add docker image for sealos by @cuisongliu in https://github.com/labring/sealos/pull/1636
* feature(main): add usergroupbindings controller for namespace by @cuisongliu in https://github.com/labring/sealos/pull/1632
* fix: release binary segfault on centos by @SignorMercurio in https://github.com/labring/sealos/pull/1694
* feature(main): fix shim image for online by @cuisongliu in https://github.com/labring/sealos/pull/1693
* update gorelease typo locaion by @zzjin in https://github.com/labring/sealos/pull/1695
* feat(auth): casdoor  static file server by @Abingcbc in https://github.com/labring/sealos/pull/1698
* feature(main): fix upx for release by @cuisongliu in https://github.com/labring/sealos/pull/1702
* optimize go step action by @zzjin in https://github.com/labring/sealos/pull/1699
* fix sealos will not use local images if there is a newer one remote by @yyf1986 in https://github.com/labring/sealos/pull/1689

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.2...v4.1.3-rc1

