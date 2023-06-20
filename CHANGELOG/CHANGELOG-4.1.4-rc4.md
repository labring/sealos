- [v4.1.4-rc4](#v414-rc4httpsgithubcomlabringsealosreleasestagv414-rc4)
  - [Downloads for v4.1.4-rc4](#downloads-for-v414-rc4)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.4-rc3](#changelog-since-v414-rc3)
  - [NewContributors](#new-contributors)


# [v4.1.4-rc4](https://github.com/labring/sealos/releases/tag/v4.1.4-rc4)

## Downloads for v4.1.4-rc4


### Source Code

filename |
-------- |
[v4.1.4-rc4.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.4-rc4.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.4-rc4_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.4-rc4/sealos_4.1.4-rc4_linux_amd64.tar.gz) |
[sealos_4.1.4-rc4_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.4-rc4/sealos_4.1.4-rc4_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.4-rc4/sealos_4.1.4-rc4_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.4-rc4_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.4-rc4/sealos_4.1.4-rc4_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.4-rc4_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.4-rc3

### What's Changed
* Move applications manifests dir by @zzjin in https://github.com/labring/sealos/pull/2274
* feat. imagehub webhook fix. by @lingdie in https://github.com/labring/sealos/pull/2260
* fix: skip handling app type image while scaling cluster by @fengxsong in https://github.com/labring/sealos/pull/2273
* Update terminal frontend, use user‘s namespace. by @zzjin in https://github.com/labring/sealos/pull/2270
* modify the scp yaml field by @zjy365 in https://github.com/labring/sealos/pull/2261
* fix: only set default --platform flag when it's not changed by @fengxsong in https://github.com/labring/sealos/pull/2276
* mark tls-verify flag hidden by @fengxsong in https://github.com/labring/sealos/pull/2279
* feature(main): change apply logic by @cuisongliu in https://github.com/labring/sealos/pull/2278
* feature(main): add rc3 change_log by @cuisongliu in https://github.com/labring/sealos/pull/2277
* add action operator implement and crd implement by @cdjianghan in https://github.com/labring/sealos/pull/2247
* feat: deploy terminal in user's namespace and support apisix ingress by @gitccl in https://github.com/labring/sealos/pull/2280
* refactor buildah interface, arguments as flagsetters by @fengxsong in https://github.com/labring/sealos/pull/2281
* add registry deply config. by @lingdie in https://github.com/labring/sealos/pull/2275
* feature(main): add cert cmd for append certs by @cuisongliu in https://github.com/labring/sealos/pull/2116
* bugfix: Apply twice will call initCluster twice that causes kubelet port occupied. by @mond77 in https://github.com/labring/sealos/pull/2292
* build pgsql & add pgsql service api by @zjy365 in https://github.com/labring/sealos/pull/2256
* fix:fix queryPrice error by @xiao-jay in https://github.com/labring/sealos/pull/2293
* fix: ensure consistency when crash & fix some bugs by @xiaohan1202 in https://github.com/labring/sealos/pull/2259
* fix: more friendly error output when running rootless mode  by @fengxsong in https://github.com/labring/sealos/pull/2287
* Fix crypto usage. by @zzjin in https://github.com/labring/sealos/pull/2296
* add pgsql users & delete iops througput by @zjy365 in https://github.com/labring/sealos/pull/2297
* fix:payment add defaultcallbackURL by @xiao-jay in https://github.com/labring/sealos/pull/2300
* feat.add image keywords as repo label. by @lingdie in https://github.com/labring/sealos/pull/2291
* feature(main): change default archive is oci by @cuisongliu in https://github.com/labring/sealos/pull/2304
* update datapacks rbac. by @lingdie in https://github.com/labring/sealos/pull/2303
* Update registry doc by @zzjin in https://github.com/labring/sealos/pull/2298
* feature(main): add status cmd for post check by @cuisongliu in https://github.com/labring/sealos/pull/2299
* feat. add org muator, add admit for kube-system group  by @lingdie in https://github.com/labring/sealos/pull/2309
* fix: set SkipTLSVerify to true for SystemConext  by @fengxsong in https://github.com/labring/sealos/pull/2316
* fix infra status & add loading created by @zjy365 in https://github.com/labring/sealos/pull/2307
* feature: add merge feature by @cuisongliu in https://github.com/labring/sealos/pull/2283
* feat: refactor metering ,support Third-party resource access and idempotent by @xiao-jay in https://github.com/labring/sealos/pull/2258
* feature(main): fix etcd config by @cuisongliu in https://github.com/labring/sealos/pull/2323

## New Contributors
* @mond77 made their first contribution in https://github.com/labring/sealos/pull/2292




