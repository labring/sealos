- [v4.1.0](#v410httpsgithubcomlabringsealosreleasestagv410)
  - [Downloads for v4.1.0](#downloads-for-v410)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.0](#changelog-since-v410-rc3)


# [v4.1.0](https://github.com/labring/sealos/releases/tag/v4.1.0)

## Downloads for v4.1.0


### Source Code

filename |
-------- |
[v4.1.0.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.0.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.0_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.0/sealos_4.1.0_linux_amd64.tar.gz) |
[sealos_4.1.0_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.0/sealos_4.1.0_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.0/sealos_4.1.0_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.0_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.0/sealos_4.1.0_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.0_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.0-rc3

### What's Changed

* feature(main): add usergroupbindings controller for user by @cuisongliu in https://github.com/labring/sealos/pull/1618
* fix: use bufio.reader to avoid token too long error by @fengxsong in https://github.com/labring/sealos/pull/1624
* add payment spec verify by @fanux in https://github.com/labring/sealos/pull/1622
* add terminal record to show how to use sealos install kubernetes cluster by @fanux in https://github.com/labring/sealos/pull/1626
* update install doc by @zzjin in https://github.com/labring/sealos/pull/1627
* add first contribution about github workflow by @fanux in https://github.com/labring/sealos/pull/1628
* fix vercel render failed by @fanux in https://github.com/labring/sealos/pull/1630
* fix vercel render failed by @fanux in https://github.com/labring/sealos/pull/1631
* fixed vercel build failed by @fanux in https://github.com/labring/sealos/pull/1634
* Update repo-file-sync-action version to v1 by @SignorMercurio in https://github.com/labring/sealos/pull/1635
* add english docs for cluster lifecycle by @fanux in https://github.com/labring/sealos/pull/1637
* style: unifying definitions of command line flags by @fengxsong in https://github.com/labring/sealos/pull/1638
* add uuid address for terminal by @gitccl in https://github.com/labring/sealos/pull/1639
* add some notes by @HURUIZHE in https://github.com/labring/sealos/pull/1644
* change 'auth/main.go log' by @Rushmmmc in https://github.com/labring/sealos/pull/1642
* ci: auto format code with `make format` by @SignorMercurio in https://github.com/labring/sealos/pull/1645
* feature(main): add docker support by @cuisongliu in https://github.com/labring/sealos/pull/1604
* feat:init metering by @xiao-jay in https://github.com/labring/sealos/pull/1647
* translate en docs by @fanux in https://github.com/labring/sealos/pull/1646
* fix auto-format by pull from right repo url by @zzjin in https://github.com/labring/sealos/pull/1653
* feature(main): add convert code from kubernetes by @cuisongliu in https://github.com/labring/sealos/pull/1652
* feature(main): fix shim for docker by @cuisongliu in https://github.com/labring/sealos/pull/1657


**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.0-rc3...v4.1.0
