- [v4.1.5-rc1](#v415-rc1httpsgithubcomlabringsealosreleasestagv415-rc1)
  - [Downloads for v4.1.5-rc1](#downloads-for-v415-rc1)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.5-rc1](#changelog-since-v415-alpha2)
  - [NewContributors](#new-contributors)


# [v4.1.5-rc1](https://github.com/labring/sealos/releases/tag/v4.1.5-rc1)

## Downloads for v4.1.5-rc1


### Source Code

filename |
-------- |
[v4.1.5-rc1.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.5-rc1.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.5-rc1_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5-rc1/sealos_4.1.5-rc1_linux_amd64.tar.gz) |
[sealos_4.1.5-rc1_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5-rc1/sealos_4.1.5-rc1_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5-rc1/sealos_4.1.5-rc1_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.5-rc1_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5-rc1/sealos_4.1.5-rc1_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.5-rc1_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.5-alpha2

### What's Changed
* feature(main): add changelog for sealos by @cuisongliu in https://github.com/labring/sealos/pull/2495
* docs: fix mistakes in the English version of cloud docs by @ShuaoZhang in https://github.com/labring/sealos/pull/2493
* add a period at the end of each line by @fanux in https://github.com/labring/sealos/pull/2499
* feature(main): add changelog for sealos by @cuisongliu in https://github.com/labring/sealos/pull/2498
* add a period at the end of each line by @fanux in https://github.com/labring/sealos/pull/2500
* fix(desktop): drag icon, first login fail by @c121914yu in https://github.com/labring/sealos/pull/2483
* feat. add repo.spec.IsPrivate by @lingdie in https://github.com/labring/sealos/pull/2504
* bug. fix cluster status. by @lingdie in https://github.com/labring/sealos/pull/2506
* feat(desktop): double click, open app by @c121914yu in https://github.com/labring/sealos/pull/2512
* feat:split user and account by @xiao-jay in https://github.com/labring/sealos/pull/2470
* feat: add ami ConfigMap && allow changable sealos version by @xiaohan1202 in https://github.com/labring/sealos/pull/2502
* add kubernetes version cri version output in sealos verison cmd by @cdjianghan in https://github.com/labring/sealos/pull/2511
* apply process optimization by @fengxsong in https://github.com/labring/sealos/pull/2520
* fix: account image build ci by @xiao-jay in https://github.com/labring/sealos/pull/2522
* docs:add english pull private image in sealos cloud docs by @xiao-jay in https://github.com/labring/sealos/pull/2521
* fix: reduce error output by @fengxsong in https://github.com/labring/sealos/pull/2525
* feat scp add mirror selection and validation by @zjy365 in https://github.com/labring/sealos/pull/2517
* bug: optimize installApp by @lingdie in https://github.com/labring/sealos/pull/2519
* fix: secret name bug by @xiaohan1202 in https://github.com/labring/sealos/pull/2536
* fix: ignore cancel error by @fengxsong in https://github.com/labring/sealos/pull/2543
* fix: sealos download by @xiaohan1202 in https://github.com/labring/sealos/pull/2542
* fix sealos version err return bug by @cdjianghan in https://github.com/labring/sealos/pull/2545
* feat: support arm arch && new version cmd by @xiaohan1202 in https://github.com/labring/sealos/pull/2546
* make `getGuestCmd` handle RootfsImage by @dinoallo in https://github.com/labring/sealos/pull/2550
* docs(main): fix deploy for user,account,terminal by @cuisongliu in https://github.com/labring/sealos/pull/2537
* fix: inspect function support resolving shortname by @24sama in https://github.com/labring/sealos/pull/2551
* feat: add compatible Aliyun interface by @xiaohan1202 in https://github.com/labring/sealos/pull/2552
* remove duplicate pull image by @huiwq1990 in https://github.com/labring/sealos/pull/2492

## New Contributors
* @ShuaoZhang made their first contribution in https://github.com/labring/sealos/pull/2493
* @dinoallo made their first contribution in https://github.com/labring/sealos/pull/2550
* @24sama made their first contribution in https://github.com/labring/sealos/pull/2551
* @huiwq1990 made their first contribution in https://github.com/labring/sealos/pull/2492

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.5-alpha2...v4.1.5-rc1



