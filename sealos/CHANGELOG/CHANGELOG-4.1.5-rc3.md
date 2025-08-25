- [v4.1.5-rc3](#v415-rc3)
  - [Downloads for v4.1.5-rc3](#downloads-for-v415-rc3)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.5-rc3](#changelog-since-v415-rc2)


# [v4.1.5-rc3](https://github.com/labring/sealos/releases/tag/v4.1.5-rc3)

## Downloads for v4.1.5-rc3


### Source Code

filename |
-------- |
[v4.1.5-rc3.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.5-rc3.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.5-rc3_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5-rc3/sealos_4.1.5-rc3_linux_amd64.tar.gz) |
[sealos_4.1.5-rc3_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5-rc3/sealos_4.1.5-rc3_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5-rc3/sealos_4.1.5-rc3_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.5-rc3_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5-rc3/sealos_4.1.5-rc3_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.5-rc3_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.5-rc2

### What's Changed
* feat(main): add changelog by @cuisongliu in https://github.com/labring/sealos/pull/2618
* feat(main): add logger for registry and remote shell by @cuisongliu in https://github.com/labring/sealos/pull/2617
* fix(auth): replace user id with nanoId by @Abingcbc in https://github.com/labring/sealos/pull/2443
* Fix image pull policy by @fengxsong in https://github.com/labring/sealos/pull/2623
* feat(main): add registry imageID by @cuisongliu in https://github.com/labring/sealos/pull/2608
* Drop semgrep lint text/template for use. by @zzjin in https://github.com/labring/sealos/pull/2626
* Drop semgrep 2 lint for common usage. (#2626) by @zzjin in https://github.com/labring/sealos/pull/2628
* chore(deps): bump kubernetes version by @fengxsong in https://github.com/labring/sealos/pull/2629
* feat: app refactor by @lingdie in https://github.com/labring/sealos/pull/2633
* remove "list namespace" privileges from clusterroles created by the user controller by @dinoallo in https://github.com/labring/sealos/pull/2637
* Feat: init app, add app data, add workflow, add app to go.work by @lingdie in https://github.com/labring/sealos/pull/2638
* feat(main): delete upx ci by @cuisongliu in https://github.com/labring/sealos/pull/2640
* Fix: fix app deploy.yaml, set rep=0. by @lingdie in https://github.com/labring/sealos/pull/2642
* feat: refactor imagecrbuilder, add cr-option flag. by @lingdie in https://github.com/labring/sealos/pull/2620
* ci(main): fix note using sealos.io by @cuisongliu in https://github.com/labring/sealos/pull/2647
* fix: inspect with id #2635 by @fengxsong in https://github.com/labring/sealos/pull/2639
* ci(main): fix scp error by @cuisongliu in https://github.com/labring/sealos/pull/2636


**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.5-rc2...v4.1.5-rc3


