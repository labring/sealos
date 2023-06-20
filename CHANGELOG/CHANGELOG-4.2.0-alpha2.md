- [v4.2.0-alpha2](#v420-alpha2)
  - [Downloads for v4.2.0-alpha2](#downloads-for-v420-alpha2)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.2.0-alpha1](#changelog-since-v420-alpha1)

# [v4.2.0-alpha2](https://github.com/labring/sealos/releases/tag/v4.2.0-alpha2)

## Downloads for v4.2.0-alpha2

### Source Code

filename |
-------- |
[v4.2.0-alpha2.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.2.0-alpha2.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.2.0-alpha2_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.2.0-alpha2/sealos_4.2.0-alpha2_linux_amd64.tar.gz) |
[sealos_4.2.0-alpha2_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.2.0-alpha2/sealos_4.2.0-alpha2_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.2.0-alpha2/sealos_4.2.0-alpha2_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.2.0-alpha2_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.2.0-alpha2/sealos_4.2.0-alpha2_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.2.0-alpha2_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

## Changelog since v4.2.0-alpha1

### What's Changed
* 22baae1a - cuisongliu - feature(main): delete registry code from fork (https://github.com/labring/sealos/pull/#2875)
* 41d2092f - Zihan Li - feat: update RunNewImages based on image diffs (https://github.com/labring/sealos/pull/#2856)
* afb274c7 - zhujingyang - feat desktop notification system (https://github.com/labring/sealos/pull/#2809)
* 7c1d411a - 晓杰 - fix metering e2e ci (https://github.com/labring/sealos/pull/#2873)
* 6c45ffed - 晓杰 - feat: add Notification CRD (https://github.com/labring/sealos/pull/#2580)
* fb01faca - 晓杰 - refactor:Strip billing function to reosurce-controller (https://github.com/labring/sealos/pull/#2811)
* 75dd26e7 - cuisongliu - feature(main): add token config for token cmd (https://github.com/labring/sealos/pull/#2869)
* 0ba7843d - cuisongliu - feature(main): replace name ref from registry (https://github.com/labring/sealos/pull/#2834)
* 6c49e19e - 榴莲榴莲 - Add rateLimiter opts for controllers (https://github.com/labring/sealos/pull/#2831)
* b338add0 - 晓杰 - Feat: add Debt CRD, limit user rbac when in arrears (https://github.com/labring/sealos/pull/#2634)
* 26df5bfb - yy - feat. registry add pull limit. (https://github.com/labring/sealos/pull/#2857)
* 7593a1dd - cuisongliu - feature(main): using bootstrap undo (https://github.com/labring/sealos/pull/#2867)
* 339adfa1 - Xinwei Xiong - fix: Password does not add single quotes will identify environment va… (https://github.com/labring/sealos/pull/#2862)
* ec97abfb - fengxsong - feat: add auto answer sudo prompt in ssh command (https://github.com/labring/sealos/pull/#2840)
* a02ebcaf - fengxsong - fix: ensure response body has to be read fully and close correctly; also use a sharedclients (https://github.com/labring/sealos/pull/#2855)
* 69bd0edb - fengxsong - feat: register all versions of the ImageServiceServer (https://github.com/labring/sealos/pull/#2853)
* cc8027c7 - fengxsong - fix: avoid rendering template repeatedly (https://github.com/labring/sealos/pull/#2852)
* 6071e10a - 晓杰 - fix(): cluster make build fail and controller ci fail (https://github.com/labring/sealos/pull/#2847)
* 56a2e78f - cuisongliu - feature(main): add env image test (https://github.com/labring/sealos/pull/#2845)
* 373c1f7f - zhujingyang - fix pgsql create default state (https://github.com/labring/sealos/pull/#2843)
* 15bcbc31 - zhujingyang - fix the request header problem (https://github.com/labring/sealos/pull/#2846)
* 7836f557 - fengxsong - fix(ci): golangci-lint error (https://github.com/labring/sealos/pull/#2844)
* 111e7ec4 - zhujingyang - Request failed to switch config (https://github.com/labring/sealos/pull/#2835)
* de1a400f - zhujingyang - Change 1 RMB equals 10000 (https://github.com/labring/sealos/pull/#2839)
* abc607f4 - fengxsong - fix: json tag of ssh field (https://github.com/labring/sealos/pull/#2830)

**Full Changelog**: https://github.com/labring/sealos/compare/v4.2.0-alpha1...v4.2.0-alpha2
