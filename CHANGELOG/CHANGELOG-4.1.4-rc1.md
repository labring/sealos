- [v4.1.4-rc1](#v414-rc1httpsgithubcomlabringsealosreleasestagv414-rc1)
  - [Downloads for v4.1.4-rc1](#downloads-for-v414-rc1)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.4-rc1](#changelog-since-v413)
  - [NewContributors](#new-contributors)


# [v4.1.4-rc1](https://github.com/labring/sealos/releases/tag/v4.1.4-rc1)

## Downloads for v4.1.4-rc1


### Source Code

filename |
-------- |
[v4.1.4-rc1.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.4-rc1.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.4-rc1_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.4-rc1/sealos_4.1.4-rc1_linux_amd64.tar.gz) |
[sealos_4.1.4-rc1_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.4-rc1/sealos_4.1.4-rc1_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.4-rc1/sealos_4.1.4-rc1_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.4-rc1_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.4-rc1/sealos_4.1.4-rc1_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.4-rc1_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.3

### What's Changed

* feature(main): optimize Dockerfile(#1711) by @muicoder in https://github.com/labring/sealos/pull/1713
* fix: add index page by @LeezQ in https://github.com/labring/sealos/pull/1715
* Update go module to match workspace by @zzjin in https://github.com/labring/sealos/pull/1716
* Fix Optimized to use buildah sdk with push and pull by @yyf1986 in https://github.com/labring/sealos/pull/1714
* update readme by @pangqyy in https://github.com/labring/sealos/pull/1721
* update readme by @pangqyy in https://github.com/labring/sealos/pull/1722
* feature(main): sealos merge fearure by @cuisongliu in https://github.com/labring/sealos/pull/1706
* update readme by @pangqyy in https://github.com/labring/sealos/pull/1725
* Update and fix login method. by @zzjin in https://github.com/labring/sealos/pull/1719
* feature(main):  add sync user role by @cuisongliu in https://github.com/labring/sealos/pull/1718
* Update Cloud Frontend. by @zzjin in https://github.com/labring/sealos/pull/1726
* fix: issue 1724 by @fengxsong in https://github.com/labring/sealos/pull/1733
* refactor: applier by @fengxsong in https://github.com/labring/sealos/pull/1736
* Fix user controller module by @zzjin in https://github.com/labring/sealos/pull/1739
* update go work modules by @zzjin in https://github.com/labring/sealos/pull/1742
* feat: generate config of components by @fengxsong in https://github.com/labring/sealos/pull/1743
* update terminal controller image, disable CGO by @gitccl in https://github.com/labring/sealos/pull/1745
* fix ci terminal controller build error by @gitccl in https://github.com/labring/sealos/pull/1748
* feature(main):  add sync user role by @cuisongliu in https://github.com/labring/sealos/pull/1749
* feature(main):  add sync user role by @cuisongliu in https://github.com/labring/sealos/pull/1750
* feature(main):  add registry sdk by @cuisongliu in https://github.com/labring/sealos/pull/1746
* Init support of terminal and kubernetes-dashboard. by @zzjin in https://github.com/labring/sealos/pull/1738
* feature(main):  fix user group role by @cuisongliu in https://github.com/labring/sealos/pull/1754
* tmp fix terminal waiting by @zzjin in https://github.com/labring/sealos/pull/1757
* Update cert manager to use dns01 for wildcard. by @zzjin in https://github.com/labring/sealos/pull/1761
* Add Controller Cluster by @HURUIZHE in https://github.com/labring/sealos/pull/1697
* Update favicon& typo by @zzjin in https://github.com/labring/sealos/pull/1763
* Temp Add `terminal`'s namespace by @zzjin in https://github.com/labring/sealos/pull/1762
* remove certificate from terminal-controller by @gitccl in https://github.com/labring/sealos/pull/1765
* update: window manage by @LeezQ in https://github.com/labring/sealos/pull/1767
* add user-controller webhook by @cuisongliu in https://github.com/labring/sealos/pull/1766
* Dev front by @zzjin in https://github.com/labring/sealos/pull/1774
* add start menu  &  fix iframe url bug by @LeezQ in https://github.com/labring/sealos/pull/1780
* Dev front by @zzjin in https://github.com/labring/sealos/pull/1778
* update docs: update calico version by @fanux in https://github.com/labring/sealos/pull/1781
* update readme: add cri-docker and new desktop image by @fanux in https://github.com/labring/sealos/pull/1782
* feature(main): update base image is ubuntu by @cuisongliu in https://github.com/labring/sealos/pull/1784
* Update DEVELOPGUIDE.md by @Dan81067 in https://github.com/labring/sealos/pull/1786
* bugfix: display the correct icon in app store by @BambooSword in https://github.com/labring/sealos/pull/1789
* Update ci dep. by @zzjin in https://github.com/labring/sealos/pull/1794
* feature(main): fix user-controller-rbac for csr by @cuisongliu in https://github.com/labring/sealos/pull/1796
* feature(main): add Platform for sealos pull/create by @cuisongliu in https://github.com/labring/sealos/pull/1797
* feat: add pwa support by @LeezQ in https://github.com/labring/sealos/pull/1785
* Cluster Debug by @HURUIZHE in https://github.com/labring/sealos/pull/1792
* add helm when install calico v3.24.1 by @fanux in https://github.com/labring/sealos/pull/1800
* fixed docs, calico new version needs helm by @fanux in https://github.com/labring/sealos/pull/1802
* feat: generate kubeconfig by user controller by @Abingcbc in https://github.com/labring/sealos/pull/1799
* Update seg to standalone version. by @zzjin in https://github.com/labring/sealos/pull/1803
* Allow semgpeg fails. by @zzjin in https://github.com/labring/sealos/pull/1806
* Generate certificate suitable for use with any Kubernetes Webhook. by @muicoder in https://github.com/labring/sealos/pull/1805
* fix: empty status error of quick query by @Abingcbc in https://github.com/labring/sealos/pull/1810
* feature(main): add user namespace Pod Security Admission by @cuisongliu in https://github.com/labring/sealos/pull/1811
* feature(main): add disable_webhook_env by @cuisongliu in https://github.com/labring/sealos/pull/1809
* Update user's kubeconfig using new user-controller's resp. by @zzjin in https://github.com/labring/sealos/pull/1814
* CREATE SSH pair key when creating instance by @HURUIZHE in https://github.com/labring/sealos/pull/1808
* feat: add user access account permissions by @xiao-jay in https://github.com/labring/sealos/pull/1815
* Dev front by @zzjin in https://github.com/labring/sealos/pull/1818
* fix:add create status when payment create by @xiao-jay in https://github.com/labring/sealos/pull/1821
* fix: ineffective env and cmd override by @SignorMercurio in https://github.com/labring/sealos/pull/1825
* fix #1775: update doc calico version to v3.24.1 by @a1576471428 in https://github.com/labring/sealos/pull/1826
* Feat client sdk and wechat pay by @LeezQ in https://github.com/labring/sealos/pull/1827
* feat: wechat pay by @LeezQ in https://github.com/labring/sealos/pull/1828
* feat:update role of user access ownerreference account by @xiao-jay in https://github.com/labring/sealos/pull/1833
* Update accounts.user.sealos.io sdk usage. by @zzjin in https://github.com/labring/sealos/pull/1832
* Fix terminal rbac permission. by @zzjin in https://github.com/labring/sealos/pull/1834
* fix:change log level by @xiao-jay in https://github.com/labring/sealos/pull/1838
* fix: copy binary with execute permission by @fengxsong in https://github.com/labring/sealos/pull/1842
* fix: return error if any error occured by @fengxsong in https://github.com/labring/sealos/pull/1844
* fix: Hydration failed by @LeezQ in https://github.com/labring/sealos/pull/1840
* feat:add payment secvet set env by @xiao-jay in https://github.com/labring/sealos/pull/1848
* docs: fix some typo in CONTRIBUTING.md. by @Raving-hash in https://github.com/labring/sealos/pull/1852
* Update Frontend apps by @zzjin in https://github.com/labring/sealos/pull/1847
* feat: appstore by @BambooSword in https://github.com/labring/sealos/pull/1837
* feature(main): add sa kubeconfig by @cuisongliu in https://github.com/labring/sealos/pull/1836
* feature(main): fix image pull for user-controller by @cuisongliu in https://github.com/labring/sealos/pull/1857
* feature(main): add auto build cluster-image by @cuisongliu in https://github.com/labring/sealos/pull/1859
* Fix appstore typo by @zzjin in https://github.com/labring/sealos/pull/1856
* fix:sealos creat xxxx image not known by @xiao-jay in https://github.com/labring/sealos/pull/1860
* feat: support pulling in sealos save and loading in sealos run by @SignorMercurio in https://github.com/labring/sealos/pull/1861
* optimize the scale process by @fengxsong in https://github.com/labring/sealos/pull/1855
* fix:sealos creat xxxx image not known by @xiao-jay in https://github.com/labring/sealos/pull/1864
* feat:account delete payment delay 5 minutes by @xiao-jay in https://github.com/labring/sealos/pull/1863
* feat:add metering module by @xiao-jay in https://github.com/labring/sealos/pull/1824
* add support kubernetes versions in readme by @fanux in https://github.com/labring/sealos/pull/1868
* feature(main): fix miss rbac by @cuisongliu in https://github.com/labring/sealos/pull/1874
* Frontend and ssh add pkdata by @HURUIZHE in https://github.com/labring/sealos/pull/1831
* docs: update sealos API docs by @SignorMercurio in https://github.com/labring/sealos/pull/1879
* Fix terminal rbac usage by @zzjin in https://github.com/labring/sealos/pull/1885
* fix: semgrep scan issues by @SignorMercurio in https://github.com/labring/sealos/pull/1881
* fix: the rest of semgrep scan issues by @SignorMercurio in https://github.com/labring/sealos/pull/1886
* feat: deploy terminal in terminal-app ns by @gitccl in https://github.com/labring/sealos/pull/1835
* feature(main): add log for user controller by @cuisongliu in https://github.com/labring/sealos/pull/1888
* fix: watch+select to get kubeconfig by @Abingcbc in https://github.com/labring/sealos/pull/1892
* Add apps by @zzjin in https://github.com/labring/sealos/pull/1893
* improve:make SetClusterRunArgs conform to 'return fast' by @NTH19 in https://github.com/labring/sealos/pull/1889
* add mock dapps by @fanux in https://github.com/labring/sealos/pull/1898
* docs: improve existing docs by @SignorMercurio in https://github.com/labring/sealos/pull/1896
* Dev front by @zzjin in https://github.com/labring/sealos/pull/1901
* feature(main): add registry sdk by @cuisongliu in https://github.com/labring/sealos/pull/1880
* Fix frontend by @LeezQ in https://github.com/labring/sealos/pull/1895
* Fix app import typo by @zzjin in https://github.com/labring/sealos/pull/1904
* doc: update k8s image name by @xiao-jay in https://github.com/labring/sealos/pull/1907
* add copy token by @LeezQ in https://github.com/labring/sealos/pull/1906
* fix: alert cause copy fail by @LeezQ in https://github.com/labring/sealos/pull/1908
* ci: fix docs site build error by @SignorMercurio in https://github.com/labring/sealos/pull/1910
* docs: A few typos by @TomatoQt in https://github.com/labring/sealos/pull/1911
* desktop/frontend/README.md by @cubxxw in https://github.com/labring/sealos/pull/1912
* fix: use unknown user instead of running useradd by @SignorMercurio in https://github.com/labring/sealos/pull/1913
* add contribute guide, add golang install and FAQ by @fanux in https://github.com/labring/sealos/pull/1919
* fix readme and intro by @zyj-111 in https://github.com/labring/sealos/pull/1918
* temp comments out L by @zzjin in https://github.com/labring/sealos/pull/1925
* feature(main): add user-controller rbac for sa by @cuisongliu in https://github.com/labring/sealos/pull/1926
* [fix]add pull policy by @yyf1986 in https://github.com/labring/sealos/pull/1921
* feature(main): add user-controller rbac for sa (#1926) by @cuisongliu in https://github.com/labring/sealos/pull/1928
* Update doc typo. by @zzjin in https://github.com/labring/sealos/pull/1933
* fix: get host arch using SSH for apply/run, apply/reset and apply/scale by @SignorMercurio in https://github.com/labring/sealos/pull/1927
* shell:creat a sealos cluster based on multipass by @xiao-jay in https://github.com/labring/sealos/pull/1934
* feature(main): sync ttl for token and kubeadm-certs by @cuisongliu in https://github.com/labring/sealos/pull/1936
* fix: casdoor non root security by @Abingcbc in https://github.com/labring/sealos/pull/1940
* feature(main): fix nodes for single by @cuisongliu in https://github.com/labring/sealos/pull/1938
* feature(main): add GetContextDir for build by @cuisongliu in https://github.com/labring/sealos/pull/1935
* fix: error link by @ining7 in https://github.com/labring/sealos/pull/1947
* del: update readme by @ining7 in https://github.com/labring/sealos/pull/1948
* feature(main): add sealos action for docs by @cuisongliu in https://github.com/labring/sealos/pull/1949
* Try fix goreleaser for arm package. by @zzjin in https://github.com/labring/sealos/pull/1952
* feature(main): fix cri socket to multiple CRI by @cuisongliu in https://github.com/labring/sealos/pull/1945
* docs: update workspace preparation steps by @wxharry in https://github.com/labring/sealos/pull/1955
* add sealos cloud example: hello world demo by @fanux in https://github.com/labring/sealos/pull/1960
* fix: goreleaser actions failure by @SignorMercurio in https://github.com/labring/sealos/pull/1962
* ci: publish docker image for the release workflow with goreleaser by @SignorMercurio in https://github.com/labring/sealos/pull/1964
* feature(main): fix docker build image by @cuisongliu in https://github.com/labring/sealos/pull/1966
* feature(main): fix default registry ip by @cuisongliu in https://github.com/labring/sealos/pull/1965

## New Contributors

* @pangqyy made their first contribution in https://github.com/labring/sealos/pull/1721
* @Dan81067 made their first contribution in https://github.com/labring/sealos/pull/1786
* @BambooSword made their first contribution in https://github.com/labring/sealos/pull/1789
* @a1576471428 made their first contribution in https://github.com/labring/sealos/pull/1826
* @Raving-hash made their first contribution in https://github.com/labring/sealos/pull/1852
* @NTH19 made their first contribution in https://github.com/labring/sealos/pull/1889
* @TomatoQt made their first contribution in https://github.com/labring/sealos/pull/1911
* @zyj-111 made their first contribution in https://github.com/labring/sealos/pull/1918
* @ining7 made their first contribution in https://github.com/labring/sealos/pull/1947
* @wxharry made their first contribution in https://github.com/labring/sealos/pull/1955

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.3...v4.1.4-rc1
