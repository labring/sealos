- [v4.1.5-alpha2](#v415-alpha2httpsgithubcomlabringsealosreleasestagv415-alpha2)
  - [Downloads for v4.1.5-alpha2](#downloads-for-v415-alpha2)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.5-alpha2](#changelog-since-)
  - [NewContributors](#new-contributors)


# [v4.1.5-alpha2](https://github.com/labring/sealos/releases/tag/v4.1.5-alpha2)

## Downloads for v4.1.5-alpha2


### Source Code

filename |
-------- |
[v4.1.5-alpha2.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.5-alpha2.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.5-alpha2_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5-alpha2/sealos_4.1.5-alpha2_linux_amd64.tar.gz) |
[sealos_4.1.5-alpha2_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5-alpha2/sealos_4.1.5-alpha2_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5-alpha2/sealos_4.1.5-alpha2_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.5-alpha2_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5-alpha2/sealos_4.1.5-alpha2_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.5-alpha2_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.5-alpha1

### What's Changed
* fix(main): fix inspect local image by @cuisongliu in https://github.com/labring/sealos/pull/2410
* fix(main): fix ci for buildx by @cuisongliu in https://github.com/labring/sealos/pull/2446
* docs(main): fix 404 for changelog addr by @cuisongliu in https://github.com/labring/sealos/pull/2448
* docs(main): fix sealos design by @cuisongliu in https://github.com/labring/sealos/pull/2449
* change icon color & delete fingerpoint by @zjy365 in https://github.com/labring/sealos/pull/2457
* Fixed application drag boundaries by @zjy365 in https://github.com/labring/sealos/pull/2458
* Update cloud docs. by @zzjin in https://github.com/labring/sealos/pull/2462
* update docs to v4.1.4 by @fanux in https://github.com/labring/sealos/pull/2461
* fixed issues with creating infra by @zjy365 in https://github.com/labring/sealos/pull/2463
* fix: Metering fix bug by @xiao-jay in https://github.com/labring/sealos/pull/2460
* bugfix: kubelet cgroup driver not match containerd by @xiao-jay in https://github.com/labring/sealos/pull/2466
* feat: keypair garbage collection by @xiaohan1202 in https://github.com/labring/sealos/pull/2467
* bugfix: nodename should be lower case by @mond77 in https://github.com/labring/sealos/pull/2474
* bugfix by @mond77 in https://github.com/labring/sealos/pull/2478
* Add desktio UX by @c121914yu in https://github.com/labring/sealos/pull/2477
* fix: configure default clustername by @xiaohan1202 in https://github.com/labring/sealos/pull/2476
* feat:add deduction details in accountbalance by @xiao-jay in https://github.com/labring/sealos/pull/2480
* add how to run bytebase on sealos cloud by @fanux in https://github.com/labring/sealos/pull/2472
* feat: add aws instance gc by @xiaohan1202 in https://github.com/labring/sealos/pull/2481
* update sealos cloud intro by @fanux in https://github.com/labring/sealos/pull/2484
* update run bytebase on sealos cloud by @fanux in https://github.com/labring/sealos/pull/2491
* fix:go mod tidy error by @xiao-jay in https://github.com/labring/sealos/pull/2490
* Update to go version 1.20 by @zzjin in https://github.com/labring/sealos/pull/2488
* fix a blinking delete dialog by @zjy365 in https://github.com/labring/sealos/pull/2486

## New Contributors
* @c121914yu made their first contribution in https://github.com/labring/sealos/pull/2477

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.5-alpha1...v4.1.5-alpha2




