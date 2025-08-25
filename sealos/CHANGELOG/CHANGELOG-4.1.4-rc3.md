- [v4.1.4-rc3](#v414-rc3httpsgithubcomlabringsealosreleasestagv414-rc3)
  - [Downloads for v4.1.4-rc3](#downloads-for-v414-rc3)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.4-rc3](#changelog-since-v414-rc2)


# [v4.1.4-rc3](https://github.com/labring/sealos/releases/tag/v4.1.4-rc3)

## Downloads for v4.1.4-rc3


### Source Code

filename |
-------- |
[v4.1.4-rc3.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.4-rc3.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.4-rc3_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.4-rc3/sealos_4.1.4-rc3_linux_amd64.tar.gz) |
[sealos_4.1.4-rc3_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.4-rc3/sealos_4.1.4-rc3_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.4-rc3/sealos_4.1.4-rc3_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.4-rc3_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.4-rc3/sealos_4.1.4-rc3_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.4-rc3_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.4-rc2

### What's Changed

* use admisswebhook sdk to mutate and validate image create, update, delete. by @lingdie in https://github.com/labring/sealos/pull/2244
* Enhancement: imagehub webhook get usernamespace by env. by @lingdie in https://github.com/labring/sealos/pull/2253
* debug: more verbose logging for scp by @fengxsong in https://github.com/labring/sealos/pull/2254
* feat: add reconcile disks and modify infra_types by @xiaohan1202 in https://github.com/labring/sealos/pull/2248
* feat. add repo webhook to set default labels and validate it. by @lingdie in https://github.com/labring/sealos/pull/2257
* feature(main): fix changelogs by @cuisongliu in https://github.com/labring/sealos/pull/2251
* Update SEALOS_SYS_KUBE_VERSION usage. by @zzjin in https://github.com/labring/sealos/pull/2264
* feature(main): env compatible by @cuisongliu in https://github.com/labring/sealos/pull/2265
* feature(main): delete warn by @cuisongliu in https://github.com/labring/sealos/pull/2269


**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.4-rc2...v4.1.4-rc3



