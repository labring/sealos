- [v4.1.4](#v414httpsgithubcomlabringsealosreleasestagv414)
  - [Downloads for v4.1.4](#downloads-for-v414)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.4](#changelog-since-v414-rc4)


# [v4.1.4](https://github.com/labring/sealos/releases/tag/v4.1.4)

## Downloads for v4.1.4


### Source Code

filename |
-------- |
[v4.1.4.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.4.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.4_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.4/sealos_4.1.4_linux_amd64.tar.gz) |
[sealos_4.1.4_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.4/sealos_4.1.4_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.4/sealos_4.1.4_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.4_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.4/sealos_4.1.4_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.4_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.4-rc4

### What's Changed

* feature(main): add changelog by @cuisongliu in https://github.com/labring/sealos/pull/2325
* feature(main): fix ci error by @cuisongliu in https://github.com/labring/sealos/pull/2326
* feature(main): change calico docs by @cuisongliu in https://github.com/labring/sealos/pull/2327
* add ImageCRDBuilder implement by @cdjianghan in https://github.com/labring/sealos/pull/2311
* better code : use config.GetAllCredentials func  to place CheckLoginStatus func in imagecrdbuilder by @cdjianghan in https://github.com/labring/sealos/pull/2328
* update download sealos command by @fanux in https://github.com/labring/sealos/pull/2324
* change some func name to better understand add Success and Faild output by @cdjianghan in https://github.com/labring/sealos/pull/2332
* feature(main): fix registry find manifest logic by @cuisongliu in https://github.com/labring/sealos/pull/2314
* add infra e2e test by @xiaohan1202 in https://github.com/labring/sealos/pull/2331
* imagecrbuilder better code by @cdjianghan in https://github.com/labring/sealos/pull/2334
* feature(main): add cert for old version by @cuisongliu in https://github.com/labring/sealos/pull/2333
* add size to imagegrid. fix repository reconcile. by @lingdie in https://github.com/labring/sealos/pull/2337
* fix image cr doc by @cdjianghan in https://github.com/labring/sealos/pull/2338
* docs: add hub.sealos.cn  and imagehub CRD desigin docs. by @lingdie in https://github.com/labring/sealos/pull/2131
* Docs: add build template docs by @zzjin in https://github.com/labring/sealos/pull/2335
* Fixed the application window switch problem by @zjy365 in https://github.com/labring/sealos/pull/2342


