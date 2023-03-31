- [v4.2.0-alpha1](#v420-alpha1)
  - [Downloads for v4.2.0-alpha1](#downloads-for-v420-alpha1)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.5](#changelog-since-v415)

# [v4.2.0-alpha1](https://github.com/labring/sealos/releases/tag/v4.2.0-alpha1)

## Downloads for v4.2.0-alpha1

### Source Code

filename |
-------- |
[v4.2.0-alpha1.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.2.0-alpha1.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.2.0-alpha1_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.2.0-alpha1/sealos_4.2.0-alpha1_linux_amd64.tar.gz) |
[sealos_4.2.0-alpha1_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.2.0-alpha1/sealos_4.2.0-alpha1_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.2.0-alpha1/sealos_4.2.0-alpha1_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.2.0-alpha1_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.2.0-alpha1/sealos_4.2.0-alpha1_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.2.0-alpha1_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

## Changelog since v4.1.5

### What's Changed
* af1bae9b - Jiahui - Merge pull request https://github.com/labring/sealos/pull/#2794 from cuisongliu/delete_node
* 07e2bcea - cuisongliu - feature(main): delete node if failed
* ebefb194 - cuisongliu - feature(main): registry list repo fix (https://github.com/labring/sealos/pull/#2821)
* 7a89ce36 - 中弈 - update zh readme (https://github.com/labring/sealos/pull/#2819)
* 5c57670a - cuisongliu - feature(main): delete shim images dir (https://github.com/labring/sealos/pull/#2817)
* 9a419650 - fengxsong - Regenerate types (https://github.com/labring/sealos/pull/#2815)
* 044abe05 - Mihai Țimbota-Belin - fix concurrent map access in clusterClient (https://github.com/labring/sealos/pull/#2812)
* 3cd3ddc4 - zzjin - Update module (https://github.com/labring/sealos/pull/#2813)
* 45e62bae - cuisongliu - feature(main): check scp md5sum to config cmd (https://github.com/labring/sealos/pull/#2806)
* 299ef1c4 - cuisongliu - feature(main): add cri cgroup-driver (https://github.com/labring/sealos/pull/#2805)
* d3b6cdf7 - will - update offline-docs (https://github.com/labring/sealos/pull/#2804)
* 3344780c - yy - feat: add default time to image cr. (https://github.com/labring/sealos/pull/#2774)
* 60e3d636 - yy - feat: refactor auth, move dir. (https://github.com/labring/sealos/pull/#2796)
* 0bd7639e - 晓杰 - fix(account_controller.go): will lead to Repeat recharge when in recharge (https://github.com/labring/sealos/pull/#2763)
* 80c8af28 - fengxsong - refactor: support setting ssh field for each subset of hosts (https://github.com/labring/sealos/pull/#2795)
* 8512a5a8 - Jiahui - Fix println built-in function output to standard error (https://github.com/labring/sealos/pull/#2798)
* 3dffefe8 - Archer - feat: prevent refresh page from keyboard;mock app in 'dev env' (https://github.com/labring/sealos/pull/#2793)
* a22a7cf3 - Jiahui - fix `GetRootfsImage` function cause panic (https://github.com/labring/sealos/pull/#2799)
* e0399833 - zhujingyang - feat modify request header & delete infra (https://github.com/labring/sealos/pull/#2791)
* 6c8f7290 - zhujingyang - Fix iframe copy issue (https://github.com/labring/sealos/pull/#2790)
* 8ac16751 - cuisongliu - feature(main): add system config to sealos (https://github.com/labring/sealos/pull/#2792)
* 350ba2e9 - Meteorite - feat: add infra concurrent opts & optimize delete instances (https://github.com/labring/sealos/pull/#2789)
* 505c6ec0 - cuisongliu - feature(main): add compressed to registry/docker (https://github.com/labring/sealos/pull/#2786)
* e632ccbe - cuisongliu - fix(main): add CHANGELOG-4.1.7.md (https://github.com/labring/sealos/pull/#2787)
* 1521f9cc - zhujingyang - feat Obtain desktop applications through app crd (https://github.com/labring/sealos/pull/#2751)
* 52f954a9 - cuisongliu - fix(main): fix kubeadm init func (https://github.com/labring/sealos/pull/#2756)
* 5e5ac7f5 - cuisongliu - ci(main): add ci for merge (https://github.com/labring/sealos/pull/#2785)
* a22e98e6 - yy - feat: add app cr. (https://github.com/labring/sealos/pull/#2760)
* 97c45eb2 - gitccl - get ingress secret from env (https://github.com/labring/sealos/pull/#2768)
* 201f9d25 - cuisongliu - ci(main): delete rebase (https://github.com/labring/sealos/pull/#2780)
* 429acc6d - Archer - feat: desktopSDK0.1.11 (https://github.com/labring/sealos/pull/#2778)
* 25a9e54f - fengxsong - fix: share the same systemContext in build command (https://github.com/labring/sealos/pull/#2770)
* 9cf172a0 - cuisongliu - ci(main): update COLLABORATOR (https://github.com/labring/sealos/pull/#2779)
* cb2a168a - sealos-ci-robot - Merge pull request https://github.com/labring/sealos/pull/#2777 from cuisongliu/print
* 3e9987d1 - cuisongliu - ci(main): add debug.yml
* d57fc561 - sealos-ci-robot - Merge pull request https://github.com/labring/sealos/pull/#2776 from cuisongliu/print
* 9741bace - cuisongliu - ci(main): add debug.yml
* 44d10a67 - cuisongliu - ci(main): add github.event.comment.author_association (https://github.com/labring/sealos/pull/#2775)
* a31b6b8d - cuisongliu - ci(main): add labels size to .github (https://github.com/labring/sealos/pull/#2773)
* 3875a8a8 - cuisongliu - ci(main): add github.event.comment.author_association (https://github.com/labring/sealos/pull/#2772)
* 7afb70ec - cuisongliu - ci(main): replace GH_TOKEN,GITHUB_TOKEN to GH_PAT (https://github.com/labring/sealos/pull/#2771)
* 3061ca6e - cuisongliu - ci(main): add rebase (https://github.com/labring/sealos/pull/#2769)
* 16998446 - zzjin - Change terminal image to self-host hub (https://github.com/labring/sealos/pull/#2762)
* 62f88352 - cuisongliu - fix(main): delete node not exec clean.sh (https://github.com/labring/sealos/pull/#2765)
* 4e921fe2 - fengxsong - fix: avoid invoking default function before complete merging configs (https://github.com/labring/sealos/pull/#2758)
* 1d6f5f81 - zzjin - Ignore frontend changes from ci docker (https://github.com/labring/sealos/pull/#2761)
* 59c9a394 - fengxsong - feat: add diff subcommand (https://github.com/labring/sealos/pull/#2753)
* dd24d6cc - Xin He - BUG: custom certSANs should append to the default ClusterConfiguration certSANs (https://github.com/labring/sealos/pull/#2752)
* 11c2f8fd - cuisongliu - fix(main): bootstrap registry before all step (https://github.com/labring/sealos/pull/#2742)
* 3fae3c42 - 晓杰 - fix: user limit memory too small lead to pod oom (https://github.com/labring/sealos/pull/#2750)
* 0eb07c46 - yy - add app rbac to user ns. (https://github.com/labring/sealos/pull/#2730)
* debc6c49 - zzjin - Fix readme typo. (https://github.com/labring/sealos/pull/#2748)
* 4a5149e5 - zzjin - Delete unused docs&files. (https://github.com/labring/sealos/pull/#2747)
* 076cf70c - zzjin - Fix Readme assets, using absolute path. (https://github.com/labring/sealos/pull/#2745)
* 3b9ab158 - Meteorite - debug: hostname too long (https://github.com/labring/sealos/pull/#2743)
* 3c29adb4 - fengxsong - fix: provide a common way to wrap bash (https://github.com/labring/sealos/pull/#2739)
* 5418faf0 - zzjin - Add Temp pre-installed deploy-manager (https://github.com/labring/sealos/pull/#2737)
* 3c362ffc - zzjin - rebase doc (https://github.com/labring/sealos/pull/#2735)
* 87b502ce - cuisongliu - fix(main): alt-names empty check (https://github.com/labring/sealos/pull/#2733)
* eafdc1c7 - zzjin - Fix en Intro.md images. (https://github.com/labring/sealos/pull/#2732)
* bd51db4a - Meteorite - add new driver interface and fix some bugs (https://github.com/labring/sealos/pull/#2720)
* 2b51d7bb - cuisongliu - fix(main): delete ipvs ip link (https://github.com/labring/sealos/pull/#2729)
* 32810dc4 - cuisongliu - fix(main): shell Wrapper from env (https://github.com/labring/sealos/pull/#2711)
* d4c0398f - yy - add imagehub frontend deploy.yaml (https://github.com/labring/sealos/pull/#2727)
* d774d064 - yy - feat: add ctime to image detail. (https://github.com/labring/sealos/pull/#2726)
* 630caa69 - zhujingyang - docs how to deploy the application to desktop (https://github.com/labring/sealos/pull/#2718)
* 082923cb - zhujingyang - sealos-image-hub (https://github.com/labring/sealos/pull/#2700)
* 669fba99 - Carson Yang - Update README (https://github.com/labring/sealos/pull/#2724)
* b1b01df4 - 晓杰 - user add clusterrole rbac (https://github.com/labring/sealos/pull/#2722)
* f38c6cac - gitccl - get terminal domain from env (https://github.com/labring/sealos/pull/#2717)
* 7b01f946 - Jiahui - Fix when no app image is specified, run error but the command condition still returns success (https://github.com/labring/sealos/pull/#2715)
* 6b5b2bd8 - Xin He - BUG: setting external etcd address does not take effect (https://github.com/labring/sealos/pull/#2704)
* 235a611a - Jiahui - fix `runtime error: slice bounds out of range [:19] with length 0` (https://github.com/labring/sealos/pull/#2713)
* cf6df12c - 晓杰 - add account balance when account is new user (https://github.com/labring/sealos/pull/#2710)
* 35dc0003 - cuisongliu - fix(main): set short for create feature (https://github.com/labring/sealos/pull/#2708)
* e369f67d - Meteorite - feat: modify infra CRD and support aliyun (https://github.com/labring/sealos/pull/#2682)
* 38fd41b2 - yy - delete cmd, use image cmd. (https://github.com/labring/sealos/pull/#2703)
* c11539ca - zhujingyang - modify the account and add the iframe imagehub (https://github.com/labring/sealos/pull/#2698)
* 16c23bd6 - yy - fix authz logic. (https://github.com/labring/sealos/pull/#2701)
* 50e447f6 - zzjin - Add actions inputs (https://github.com/labring/sealos/pull/#2697)
* 7958c0f0 - zhujingyang - Move desktop to frontend (https://github.com/labring/sealos/pull/#2694)
* 76c63491 - zzjin - Update mod typo (https://github.com/labring/sealos/pull/#2696)
* a612d648 - 榴莲榴莲 - Fix double reconcile by status updates (https://github.com/labring/sealos/pull/#2676)
* 6fc4d4ab - zzjin - Fix errors pkg nil checker (https://github.com/labring/sealos/pull/#2695)
* 867b0f17 - zhihui - bugfix: change CRI version  (https://github.com/labring/sealos/pull/#2680)
* 445139dc - Xin He - feature: single host should allow scheduling to master (https://github.com/labring/sealos/pull/#2654)
* 7212f4ad - cuisongliu - fix(main): add changelog (https://github.com/labring/sealos/pull/#2683)
* 688743f3 - 晓杰 - rolebing.subject.naemspace should set user-system (https://github.com/labring/sealos/pull/#2681)