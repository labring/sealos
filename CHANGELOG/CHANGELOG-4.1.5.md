- [v4.1.5](#v415httpsgithubcomlabringsealosreleasestagv415)
  - [Downloads for v4.1.5](#downloads-for-v415)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.5](#changelog-since-v415-rc3)
  - [NewContributors](#new-contributors)


# [v4.1.5](https://github.com/labring/sealos/releases/tag/v4.1.5)

## Downloads for v4.1.5


### Source Code

filename |
-------- |
[v4.1.5.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.5.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.5_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5/sealos_4.1.5_linux_amd64.tar.gz) |
[sealos_4.1.5_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5/sealos_4.1.5_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5/sealos_4.1.5_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.5_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5/sealos_4.1.5_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.5_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.5-rc3

### What's Changed
* ci(main): fix merge error by @cuisongliu in https://github.com/labring/sealos/pull/2648
* Update false semgrep of `missing-user` by @zzjin in https://github.com/labring/sealos/pull/2650
* feat desktop supports app install by @zjy365 in https://github.com/labring/sealos/pull/2645
* feat: desktop app SDK and sdk using demo #2547 by @c121914yu in https://github.com/labring/sealos/pull/2549
* ci(main): add changelog by @cuisongliu in https://github.com/labring/sealos/pull/2649
* Fix ENTRYPOINT using exec form by @zzjin in https://github.com/labring/sealos/pull/2652
* Fix image command error by @yangchuansheng in https://github.com/labring/sealos/pull/2656
* Replace `github.com/pkg/errors` with builtin `errors` by @zzjin in https://github.com/labring/sealos/pull/2658
* Remove not used package by @zzjin in https://github.com/labring/sealos/pull/2659
* feat: implement aliyun interface by @xiaohan1202 in https://github.com/labring/sealos/pull/2627
* fix: same issue #2623 again by @fengxsong in https://github.com/labring/sealos/pull/2666
* Update module(special for service/hub) by @zzjin in https://github.com/labring/sealos/pull/2664
* fix version typo by @zzjin in https://github.com/labring/sealos/pull/2665
* update pravite registry docs by @willzhang in https://github.com/labring/sealos/pull/2672
* fix: delete local file by @c121914yu in https://github.com/labring/sealos/pull/2662
* fix(main): fix merge and hidden flags by @cuisongliu in https://github.com/labring/sealos/pull/2667
* Use lock to ensure safe build configuration under goroutine. by @bxy4543 in https://github.com/labring/sealos/pull/2673
* better sealos version by @cdjianghan in https://github.com/labring/sealos/pull/2679
* fix(main): delete pkg/infra code by @cuisongliu in https://github.com/labring/sealos/pull/2674

## New Contributors
* @bxy4543 made their first contribution in https://github.com/labring/sealos/pull/2673

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.5-rc3...v4.1.5


