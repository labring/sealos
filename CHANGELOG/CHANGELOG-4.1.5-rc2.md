- [v4.1.5-rc2](#v415-rc2)
  - [Downloads for v4.1.5-rc2](#downloads-for-v415-rc2)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.5-rc2](#changelog-since-v415-rc1)
  - [NewContributors](#new-contributors)


# [v4.1.5-rc2](https://github.com/labring/sealos/releases/tag/v4.1.5-rc2)

## Downloads for v4.1.5-rc2


### Source Code

filename |
-------- |
[v4.1.5-rc2.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.5-rc2.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.5-rc2_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5-rc2/sealos_4.1.5-rc2_linux_amd64.tar.gz) |
[sealos_4.1.5-rc2_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5-rc2/sealos_4.1.5-rc2_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5-rc2/sealos_4.1.5-rc2_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.5-rc2_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5-rc2/sealos_4.1.5-rc2_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.5-rc2_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.5-rc1

### What's Changed
* docs(main): add action and images to link by @cuisongliu in https://github.com/labring/sealos/pull/2555
* docs: update develop guide by @aFlyBird0 in https://github.com/labring/sealos/pull/2556
* Add roadmap link in readme by @fanux in https://github.com/labring/sealos/pull/2554
* docs(main) add changelog by @GaoQun825 in https://github.com/labring/sealos/pull/2557
* feat. add repo public for hubauth svc. by @lingdie in https://github.com/labring/sealos/pull/2518
* Feat. add downloadCount in repo status by @lingdie in https://github.com/labring/sealos/pull/2563
* refactor: adjust the order of merging kubeadm configs by @fengxsong in https://github.com/labring/sealos/pull/2567
* Ci e2e metering by @xiao-jay in https://github.com/labring/sealos/pull/2572
* ci(main): fix pr controllers build by @cuisongliu in https://github.com/labring/sealos/pull/2564
* ci(main): fix lic,converage,format-code ci by @cuisongliu in https://github.com/labring/sealos/pull/2573
* Update controllers module usage. by @zzjin in https://github.com/labring/sealos/pull/2574
* remove olg unused `pkg/infra` by @zzjin in https://github.com/labring/sealos/pull/2581
* ci(main): fix test ci for inspect by @cuisongliu in https://github.com/labring/sealos/pull/2582
* fix: error in inspect function when the image is in format "docker-archive:./xxx.tar" by @24sama in https://github.com/labring/sealos/pull/2579
* Fix: cluster updateStatus. by @lingdie in https://github.com/labring/sealos/pull/2588
* fix: mark buildah's flags as hidden to prevent incorrect use by @fengxsong in https://github.com/labring/sealos/pull/2590
* docs image tag error by @xiao-jay in https://github.com/labring/sealos/pull/2591
* feat: add Failed status for cloud provider by @xiaohan1202 in https://github.com/labring/sealos/pull/2566
* init status modify condition by @lingdie in https://github.com/labring/sealos/pull/2597
* Feat: add command conditions in cluster status. by @lingdie in https://github.com/labring/sealos/pull/2592
* add cluster concurrent reconciles opts by @ghostloda in https://github.com/labring/sealos/pull/2601
* feat(main): fix docker calico image by @cuisongliu in https://github.com/labring/sealos/pull/2613
* docs(main): add docker pulls by @cuisongliu in https://github.com/labring/sealos/pull/2610
* feat(main): fix merge for cri and socket by @cuisongliu in https://github.com/labring/sealos/pull/2616

## New Contributors
* @aFlyBird0 made their first contribution in https://github.com/labring/sealos/pull/2556
* @GaoQun825 made their first contribution in https://github.com/labring/sealos/pull/2557
* @ghostloda made their first contribution in https://github.com/labring/sealos/pull/2601

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.5-rc1...v4.1.5-rc2




