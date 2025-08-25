- [v4.1.5-alpha1](#v415-alpha1httpsgithubcomlabringsealosreleasestagv415-alpha1)
  - [Downloads for v4.1.5-alpha1](#downloads-for-v415-alpha1)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.5-alpha1](#changelog-since-v414)
  - [NewContributors](#new-contributors)


# [v4.1.5-alpha1](https://github.com/labring/sealos/releases/tag/v4.1.5-alpha1)

## Downloads for v4.1.5-alpha1


### Source Code

filename |
-------- |
[v4.1.5-alpha1.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.5-alpha1.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.5-alpha1_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5-alpha1/sealos_4.1.5-alpha1_linux_amd64.tar.gz) |
[sealos_4.1.5-alpha1_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.5-alpha1/sealos_4.1.5-alpha1_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5-alpha1/sealos_4.1.5-alpha1_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.5-alpha1_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.5-alpha1/sealos_4.1.5-alpha1_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.5-alpha1_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.4

### What's Changed
* Update terminal image tag by @zzjin in https://github.com/labring/sealos/pull/2345
* init image hub page & image hub api  by @zjy365 in https://github.com/labring/sealos/pull/2321
* add discord link by @fanux in https://github.com/labring/sealos/pull/2350
* Fix metering go module by @zzjin in https://github.com/labring/sealos/pull/2346
* docs(main): add changelog for sealos by @cuisongliu in https://github.com/labring/sealos/pull/2351
* feat. imagehub export  func and add URL to image_types. by @lingdie in https://github.com/labring/sealos/pull/2353
* Add static file cdn by @zzjin in https://github.com/labring/sealos/pull/2355
* Feature: upgrade the cluster by @mond77 in https://github.com/labring/sealos/pull/2340
* update build cloud image docs by @willzhang in https://github.com/labring/sealos/pull/2320
* refactor: implement exponential backoff retry for ssh connect by @fengxsong in https://github.com/labring/sealos/pull/2358
* Fixed Firefox scrollbar & switch app problem by @zjy365 in https://github.com/labring/sealos/pull/2362
* add ssh-privatekey secret to prevent ssh problems by @xiaohan1202 in https://github.com/labring/sealos/pull/2371
* add infra user guide by @fanux in https://github.com/labring/sealos/pull/2373
* Fix ci semgrep by @zzjin in https://github.com/labring/sealos/pull/2374
* feat. imagehub: add size to tagdata. by @lingdie in https://github.com/labring/sealos/pull/2376
* feat.imagehub mutate image cr. by @lingdie in https://github.com/labring/sealos/pull/2377
* bugfix: 'sealos run' cannot scale cluster by @mond77 in https://github.com/labring/sealos/pull/2366
* bugfix: sealos run error  by @mond77 in https://github.com/labring/sealos/pull/2382
* New Cloud doc location. by @zzjin in https://github.com/labring/sealos/pull/2391
* Fix doc typo. by @zzjin in https://github.com/labring/sealos/pull/2392
* bugfix: set kubeconfig server  by @mond77 in https://github.com/labring/sealos/pull/2393
* feature(main): fix cert for init masters by @cuisongliu in https://github.com/labring/sealos/pull/2383
* add clean all aws key pairs by @fanux in https://github.com/labring/sealos/pull/2381
* refactor: rename apply pkg by @cuisongliu in https://github.com/labring/sealos/pull/2397
* fix desktop switching app & add error page and skeleton screen by @zjy365 in https://github.com/labring/sealos/pull/2390
* bugfix: add node failure by @mond77 in https://github.com/labring/sealos/pull/2395
* Fix typos by @loda13 in https://github.com/labring/sealos/pull/2403
* refactor: autoLoad apiServer ip and port by @cuisongliu in https://github.com/labring/sealos/pull/2401
* fix: modify delete logic to support cloud provider by @xiaohan1202 in https://github.com/labring/sealos/pull/2402
* docs:pull private image tutorial in cloud by @xiao-jay in https://github.com/labring/sealos/pull/2404
* feat: refactor buildah's inspect method so we can inspect remote image by @fengxsong in https://github.com/labring/sealos/pull/2405
* fix: export function FormatReferenceWithTransportName by @fengxsong in https://github.com/labring/sealos/pull/2408
* docs(main): fix gen before pull image and inspect it by @cuisongliu in https://github.com/labring/sealos/pull/2367
* fix: inspect image in gen command by @fengxsong in https://github.com/labring/sealos/pull/2411
* add image detail skeleton by @zjy365 in https://github.com/labring/sealos/pull/2400
* add scp document by @xiaohan1202 in https://github.com/labring/sealos/pull/2417
* Pgsql Product Document by @cdjianghan in https://github.com/labring/sealos/pull/2415
* enable cloud provider to scale cluster by @xiaohan1202 in https://github.com/labring/sealos/pull/2387
* fix pg doc img bug by @cdjianghan in https://github.com/labring/sealos/pull/2419
* feat: apply feature #2405 on sealos inspect command by @fengxsong in https://github.com/labring/sealos/pull/2416
* Pgsql readme by @cdjianghan in https://github.com/labring/sealos/pull/2420
* add scp english docs by @xiaohan1202 in https://github.com/labring/sealos/pull/2424
* add terminal user guide by @fanux in https://github.com/labring/sealos/pull/2421
* write a pgsql Stress Test in /test by @cdjianghan in https://github.com/labring/sealos/pull/2423
* sealos cloud provider version upgraded by @zjy365 in https://github.com/labring/sealos/pull/2426
* Update README.md by @sxxpqp in https://github.com/labring/sealos/pull/2414
* update sealos version to 4.1.4 by @fanux in https://github.com/labring/sealos/pull/2429
* docs. imagehub docs by @lingdie in https://github.com/labring/sealos/pull/2425
* add terminal english docs by @fanux in https://github.com/labring/sealos/pull/2427
* docs:add metering design docs by @xiao-jay in https://github.com/labring/sealos/pull/2121
* pgsql form validation by @zjy365 in https://github.com/labring/sealos/pull/2428
* app header add document link by @zjy365 in https://github.com/labring/sealos/pull/2431
* Bug. fix latest tag. by @lingdie in https://github.com/labring/sealos/pull/2435
* Add cname doc by @zzjin in https://github.com/labring/sealos/pull/2441
* update userData to support multiple AMIs by @xiaohan1202 in https://github.com/labring/sealos/pull/2440
* add sealos intro and quick start by @fanux in https://github.com/labring/sealos/pull/2436
* Need Discussion: Fix sealos push require imagehub module. by @zzjin in https://github.com/labring/sealos/pull/2442
* image hub list paging & pagination component by @zjy365 in https://github.com/labring/sealos/pull/2437
* feat: add account recharge way by @xiao-jay in https://github.com/labring/sealos/pull/2432
* Add sealos cloud docs link in readme by @fanux in https://github.com/labring/sealos/pull/2445

## New Contributors
* @sxxpqp made their first contribution in https://github.com/labring/sealos/pull/2414

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.4...v4.1.5-alpha1




