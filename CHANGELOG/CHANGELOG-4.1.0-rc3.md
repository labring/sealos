- [v4.1.0-rc3](#v410-rc3httpsgithubcomlabringsealosreleasestagv410-rc3)
  - [Downloads for v4.1.0-rc3](#downloads-for-v410-rc3)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.0-rc3](#changelog-since-v410-rc2)
  - [NewContributors](#new-contributors)


# [v4.1.0-rc3](https://github.com/labring/sealos/releases/tag/v4.1.0-rc3)

## Downloads for v4.1.0-rc3


### Source Code

filename |
-------- |
[v4.1.0-rc3.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.0-rc3.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.0-rc3_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.0-rc3/sealos_4.1.0-rc3_linux_amd64.tar.gz) |
[sealos_4.1.0-rc3_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.0-rc3/sealos_4.1.0-rc3_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.0-rc3/sealos_4.1.0-rc3_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.0-rc3_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.0-rc3/sealos_4.1.0-rc3_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.0-rc3_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.0-rc2

### What's Changed

* feat: add terminal status by @gitccl in https://github.com/labring/sealos/pull/1587
* docs: add example for Config by @fengxsong in https://github.com/labring/sealos/pull/1591
* update terminal frontend svc get by @zzjin in https://github.com/labring/sealos/pull/1582
* style: correct flag usage by @fengxsong in https://github.com/labring/sealos/pull/1593
* feature(main): buildx user-controller by @cuisongliu in https://github.com/labring/sealos/pull/1588
* Update client-js to support crd get status return by @zzjin in https://github.com/labring/sealos/pull/1595
* Fix work replace by @zzjin in https://github.com/labring/sealos/pull/1597
* feat: Attach aws Volume (#1512) by @HURUIZHE in https://github.com/labring/sealos/pull/1589
* feature(main): add usergroups controller for user by @cuisongliu in https://github.com/labring/sealos/pull/1600
* fixed typo by @fanux in https://github.com/labring/sealos/pull/1607
* style: file rename by @LeezQ in https://github.com/labring/sealos/pull/1602
* Fix #1605 by @muicoder in https://github.com/labring/sealos/pull/1606
* update account controller to listen the payment crd by @fanux in https://github.com/labring/sealos/pull/1609
* add semgrep sast scan by @zzjin in https://github.com/labring/sealos/pull/1610
* feature(main): add tips in running routeMode by @cuisongliu in https://github.com/labring/sealos/pull/1611
* feature(main): add image for sealos by @cuisongliu in https://github.com/labring/sealos/pull/1613
* feature(main): add v1.25 k8s support by @cuisongliu in https://github.com/labring/sealos/pull/1616
* fix payment and account controller recharge failed by @fanux in https://github.com/labring/sealos/pull/1617

## New Contributors

* @LeezQ made their first contribution in https://github.com/labring/sealos/pull/1602
* @muicoder made their first contribution in https://github.com/labring/sealos/pull/1606

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.0-rc2...v4.1.0-rc3
