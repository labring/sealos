- [v4.1.0-rc2](#v410-rc2httpsgithubcomlabringsealosreleasestagv410-rc2)
  - [Downloads for v4.1.0-rc2](#downloads-for-v410-rc2)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.0-rc2](#changelog-since-v410-rc1)
  - [NewContributors](#new-contributors)


# [v4.1.0-rc2](https://github.com/labring/sealos/releases/tag/v4.1.0-rc2)

## Downloads for v4.1.0-rc2


### Source Code

filename |
-------- |
[v4.1.0-rc2.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.0-rc2.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.0-rc2_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.0-rc2/sealos_4.1.0-rc2_linux_amd64.tar.gz) |
[sealos_4.1.0-rc2_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.0-rc2/sealos_4.1.0-rc2_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.0-rc2/sealos_4.1.0-rc2_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.0-rc2_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.0-rc2/sealos_4.1.0-rc2_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.0-rc2_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.0-rc1

### What's Changed

* fixed readme run command by @fanux in https://github.com/labring/sealos/pull/1409
* fix(auth): retain mysql pv when delete pvc by @Abingcbc in https://github.com/labring/sealos/pull/1410
* add sleaos cloud overview by @fanux in https://github.com/labring/sealos/pull/1414
* docs(main): fix targz by @cuisongliu in https://github.com/labring/sealos/pull/1411
* add trackgit by @fanux in https://github.com/labring/sealos/pull/1415
* add docker and readme by @zzjin in https://github.com/labring/sealos/pull/1407
* fix docs that have english by @willzhang in https://github.com/labring/sealos/pull/1416
* ci: fix path error in sync_docs.yml by @SignorMercurio in https://github.com/labring/sealos/pull/1418
* ci: set COMMIT_EACH_FILE to false in sync by @SignorMercurio in https://github.com/labring/sealos/pull/1419
* fix(auth): connect to casdoor by @Abingcbc in https://github.com/labring/sealos/pull/1428
* docs: add more instructions on docs contributing by @SignorMercurio in https://github.com/labring/sealos/pull/1430
* docs(main): fix miss mount in add nodes by @cuisongliu in https://github.com/labring/sealos/pull/1429
* fixed go file name clinet.go change to client.go by @zsyaoo in https://github.com/labring/sealos/pull/1435
* add desktop Dockerfile and makefile by @zzjin in https://github.com/labring/sealos/pull/1417
* feat: support netlink mode by @fengxsong in https://github.com/labring/sealos/pull/1424
* fix(auth): get ca cert from kubeconfig by @Abingcbc in https://github.com/labring/sealos/pull/1439
* fix chart parse image  and add unit test by @yyf1986 in https://github.com/labring/sealos/pull/1438
* docs：Add registry docs by @willzhang in https://github.com/labring/sealos/pull/1443
* add blazeface docs by @luanshaotong in https://github.com/labring/sealos/pull/1442
* add create/get aws instance success by @fanux in https://github.com/labring/sealos/pull/1444
* Add Customize Docs by @willzhang in https://github.com/labring/sealos/pull/1448
* Add Prerequisites Docs by @willzhang in https://github.com/labring/sealos/pull/1447
* add delete aws instance by @fanux in https://github.com/labring/sealos/pull/1446
* feat(auth): deploy for service auth by @Abingcbc in https://github.com/labring/sealos/pull/1450
* add reconcile instance, test aws reconcile instance success by @fanux in https://github.com/labring/sealos/pull/1456
* test(main): add chart image unit test by @cuisongliu in https://github.com/labring/sealos/pull/1458
* fixed docs/4.0/i18n/zh-Hans/design/user.md by @1oda in https://github.com/labring/sealos/pull/1461
* update login redirect by @zzjin in https://github.com/labring/sealos/pull/1455
* feat: support removing digest from image tags by @SignorMercurio in https://github.com/labring/sealos/pull/1466
* Fix sealos build by @fengxsong in https://github.com/labring/sealos/pull/1471
* fix private registry docs by @willzhang in https://github.com/labring/sealos/pull/1464
* init applications controller by @fanux in https://github.com/labring/sealos/pull/1477
* Improve contributing docs by @willzhang in https://github.com/labring/sealos/pull/1445
* feature(main): guest env render by @cuisongliu in https://github.com/labring/sealos/pull/1486
* Fix ingress-nginx route rewrite. by @zzjin in https://github.com/labring/sealos/pull/1474
* Set aws infra name & index tag. (#1462) by @Ficus-f in https://github.com/labring/sealos/pull/1489
* fix(cmd): unifiy the format of print columns by @runkecheng in https://github.com/labring/sealos/pull/1492
* fix: iptables tool missing in lvscare image by @fengxsong in https://github.com/labring/sealos/pull/1494
* feat: add terminal controller by @gitccl in https://github.com/labring/sealos/pull/1437
* refactor: unify the use of utils by @SignorMercurio in https://github.com/labring/sealos/pull/1498
* Update frontend/dashboard typo by @zzjin in https://github.com/labring/sealos/pull/1497
* fix: only snat packets marked by @fengxsong in https://github.com/labring/sealos/pull/1496
* Fix lint error by replace `os`&`io` by @zzjin in https://github.com/labring/sealos/pull/1504
* Fix fmt and goimports by @zzjin in https://github.com/labring/sealos/pull/1505
* fix workspace usage by @zzjin in https://github.com/labring/sealos/pull/1506
* feat: add terminal keepalived by @gitccl in https://github.com/labring/sealos/pull/1502
* fix: incompatible with cilium by @fengxsong in https://github.com/labring/sealos/pull/1501
* fix typo by `go fmt` by @zzjin in https://github.com/labring/sealos/pull/1507
* add issue no response auto close it by @fanux in https://github.com/labring/sealos/pull/1509
* no reply issue auto closer by @fanux in https://github.com/labring/sealos/pull/1510
* refactor: upgrade to go 1.19 by @zzjin in https://github.com/labring/sealos/pull/1500
* Reconcile aws infra count. (#1490) by @Ficus-f in https://github.com/labring/sealos/pull/1491
* Reconcile aws infra count. (#1490) by @Ficus-f in https://github.com/labring/sealos/pull/1517
* Update desktop/frontend add user login token by @zzjin in https://github.com/labring/sealos/pull/1520
* fix: revert version of github.com/containers/storage by @fengxsong in https://github.com/labring/sealos/pull/1522
* feat(main): generate user controller by @cuisongliu in https://github.com/labring/sealos/pull/1529
* fix create and delete instance bug by @HURUIZHE in https://github.com/labring/sealos/pull/1533
* Feature/infra: add docs and aws yaml files by @fanux in https://github.com/labring/sealos/pull/1534
* fix: chart deps rendering by @fengxsong in https://github.com/labring/sealos/pull/1536
* fixed build out of memory by @fanux in https://github.com/labring/sealos/pull/1542
* update the docs sidebar by @fanux in https://github.com/labring/sealos/pull/1540
* docs: fix docs typo by @x893675 in https://github.com/labring/sealos/pull/1547
* fix typo by @zzjin in https://github.com/labring/sealos/pull/1548
* fix(main): add max goroutine num by @cuisongliu in https://github.com/labring/sealos/pull/1543
* init applications controller by @fanux in https://github.com/labring/sealos/pull/1538
* docs: update add athenaserving from iflytek by @berlinsaint in https://github.com/labring/sealos/pull/1551
* ci: add image syncing in sync_docs workflow by @SignorMercurio in https://github.com/labring/sealos/pull/1555
* fix(main): add docker-shim support by @cuisongliu in https://github.com/labring/sealos/pull/1553
* docs: fix some refs by @berlinsaint in https://github.com/labring/sealos/pull/1557
* Some doc optimizations. by @Shigure-kai-2 in https://github.com/labring/sealos/pull/1558
* docs: remove some extra pics ref by @berlinsaint in https://github.com/labring/sealos/pull/1560
* fix: sealos build(revert saveBlobs function) by @fengxsong in https://github.com/labring/sealos/pull/1556
* init kubernetes sdk by @zzjin in https://github.com/labring/sealos/pull/1525
* add wechat payment handle by @fanux in https://github.com/labring/sealos/pull/1559
* update gitignore by @zzjin in https://github.com/labring/sealos/pull/1562
* add recharge cli by @fanux in https://github.com/labring/sealos/pull/1563
* fix: oom occured when sealos build by @fengxsong in https://github.com/labring/sealos/pull/1568
* feature(main): add client for k8s by @cuisongliu in https://github.com/labring/sealos/pull/1569
* Fix ca data not returned under incluster mode by @zzjin in https://github.com/labring/sealos/pull/1570
* feature(main): add user generator kubeconfig by @cuisongliu in https://github.com/labring/sealos/pull/1561
* feature(main): add user load ca for kubeconfig by @cuisongliu in https://github.com/labring/sealos/pull/1572
* feat: load clusterfile from template by @fengxsong in https://github.com/labring/sealos/pull/1523
* update zh docs by @fanux in https://github.com/labring/sealos/pull/1573
* feat: deploy ingress for terminal by @gitccl in https://github.com/labring/sealos/pull/1544
* fix(main): fix terminal code,using config host by @cuisongliu in https://github.com/labring/sealos/pull/1576
* docs: experimental usage for sealos apply by @fengxsong in https://github.com/labring/sealos/pull/1578
* ci(main): fix lvscare arm docker image by @cuisongliu in https://github.com/labring/sealos/pull/1579
* feature(main): add user controller logic by @cuisongliu in https://github.com/labring/sealos/pull/1575
* add account and charge CRD by @fanux in https://github.com/labring/sealos/pull/1580
* fix: unexpected config merge by @fengxsong in https://github.com/labring/sealos/pull/1574
* refactor: optimize the creation of terminal ingress by @gitccl in https://github.com/labring/sealos/pull/1581
* add payment controller, user can apply a crd to recharge his account by @fanux in https://github.com/labring/sealos/pull/1583
* update fix go module by @zzjin in https://github.com/labring/sealos/pull/1584
* feature(main): add csr to kubeconfig by @cuisongliu in https://github.com/labring/sealos/pull/1585
* feature(main): delete go  generate for gorelease by @cuisongliu in https://github.com/labring/sealos/pull/1586

## New Contributors

* @willzhang made their first contribution in https://github.com/labring/sealos/pull/1416
* @luanshaotong made their first contribution in https://github.com/labring/sealos/pull/1442
* @1oda made their first contribution in https://github.com/labring/sealos/pull/1461
* @runkecheng made their first contribution in https://github.com/labring/sealos/pull/1492
* @HURUIZHE made their first contribution in https://github.com/labring/sealos/pull/1533
* @x893675 made their first contribution in https://github.com/labring/sealos/pull/1547
* @Shigure-kai-2 made their first contribution in https://github.com/labring/sealos/pull/1558

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.0-rc1...v4.1.0-rc2
