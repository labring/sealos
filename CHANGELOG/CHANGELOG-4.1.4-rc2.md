- [v4.1.4-rc2](#v414-rc2httpsgithubcomlabringsealosreleasestagv414-rc2)
  - [Downloads for v4.1.4-rc2](#downloads-for-v414-rc2)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.1.4-rc2](#changelog-since-v414-rc1)
  - [NewContributors](#new-contributors)


# [v4.1.4-rc2](https://github.com/labring/sealos/releases/tag/v4.1.4-rc2)

## Downloads for v4.1.4-rc2


### Source Code

filename |
-------- |
[v4.1.4-rc2.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.4-rc2.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.4-rc2_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.4-rc2/sealos_4.1.4-rc2_linux_amd64.tar.gz) |
[sealos_4.1.4-rc2_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.4-rc2/sealos_4.1.4-rc2_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.4-rc2/sealos_4.1.4-rc2_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.4-rc2_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.4-rc2/sealos_4.1.4-rc2_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.4-rc2_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.1.4-rc1

### What's Changed
* feature(main): separate registry from master0 by @xuehaipeng in https://github.com/labring/sealos/pull/1963
* feature(main): separate registry from master0 by @cuisongliu in https://github.com/labring/sealos/pull/1970
* feature(main): fix already installed buildah by @cuisongliu in https://github.com/labring/sealos/pull/1968
* Add docker image builder workflow for service auth  by @maslow in https://github.com/labring/sealos/pull/1976
* feature(main): fix buildah download and sealos build by @cuisongliu in https://github.com/labring/sealos/pull/1971
* docs<git && go-path>: a small number of errors by @cubxxw in https://github.com/labring/sealos/pull/1978
* feature(main): add detach for sealos run, never prompt by @cuisongliu in https://github.com/labring/sealos/pull/1979
* init whitelist webhook by @fanux in https://github.com/labring/sealos/pull/1972
* feature(main): add controllers,webhooks,services ci by @cuisongliu in https://github.com/labring/sealos/pull/1984
* feat: use env instead of hard code by @xiao-jay in https://github.com/labring/sealos/pull/1985
* Update listCRD func by @zzjin in https://github.com/labring/sealos/pull/1992
* feature(main): add auth service deploy ci by @cuisongliu in https://github.com/labring/sealos/pull/1989
* feature(main): replace render charts dir  to scripts dir by @cuisongliu in https://github.com/labring/sealos/pull/1990
* fix: remove prompt arg by @fengxsong in https://github.com/labring/sealos/pull/1999
* feature(main): payment controller disable from env by @cuisongliu in https://github.com/labring/sealos/pull/1995
* feature(main): add container label for repo by @cuisongliu in https://github.com/labring/sealos/pull/2002
* update issue-template by @willzhang in https://github.com/labring/sealos/pull/2005
* feature(main): add docs for DEVELOPGUIDE.md by @cuisongliu in https://github.com/labring/sealos/pull/2006
* Remove mandatory requirements by @willzhang in https://github.com/labring/sealos/pull/2007
* feature(main): add save image to build cmd by @cuisongliu in https://github.com/labring/sealos/pull/1997
* GitHub Actions: Deprecating save-state and set-output commands by @muicoder in https://github.com/labring/sealos/pull/2010
* feat. image hub by @lingdie in https://github.com/labring/sealos/pull/1988
* add imagehub controller deply yaml by @lingdie in https://github.com/labring/sealos/pull/2016
* feature(main): add TryParse for loadClusterfile by @cuisongliu in https://github.com/labring/sealos/pull/2017
* feature(main): add webhook config to sdk by @cuisongliu in https://github.com/labring/sealos/pull/2013
* feature(main): delete pyament env from deploy by @cuisongliu in https://github.com/labring/sealos/pull/2032
* fix terminal hardcoded problem by @gitccl in https://github.com/labring/sealos/pull/2028
* add infra other field by @wuxming in https://github.com/labring/sealos/pull/1994
* add sealos cloud provider fontend by @zjy365 in https://github.com/labring/sealos/pull/2004
* Fix yum package manager command. by @zzjin in https://github.com/labring/sealos/pull/2038
* Add affine app demo. by @zzjin in https://github.com/labring/sealos/pull/2039
* add build sealos on macos ARM using multipass by @fanux in https://github.com/labring/sealos/pull/2043
* feature(main): add BINS=sealos for docs by @cuisongliu in https://github.com/labring/sealos/pull/2052
* feature(main): add pyament deploy by @cuisongliu in https://github.com/labring/sealos/pull/2035
* fixed sealos run manifests conflict by @fanux in https://github.com/labring/sealos/pull/2048
* feature(main): fix guest func for exec shell by @cuisongliu in https://github.com/labring/sealos/pull/2054
* add build cloud image docs by @willzhang in https://github.com/labring/sealos/pull/2055
* fix: remove dependency to casdoor by @Abingcbc in https://github.com/labring/sealos/pull/2033
* fix: misuse of *cluster pointer by @fengxsong in https://github.com/labring/sealos/pull/2057
* add development guide - what is sealos by @fanux in https://github.com/labring/sealos/pull/2053
* feature(main): fix registry bugs by @cuisongliu in https://github.com/labring/sealos/pull/2060
* fix: replace text/template from html/template by @fengxsong in https://github.com/labring/sealos/pull/2067
* feature(main): fix gen doc by @cuisongliu in https://github.com/labring/sealos/pull/2070
* feature(main): fix user controller deploy by @cuisongliu in https://github.com/labring/sealos/pull/2065
* Begin proposal process by @zzjin in https://github.com/labring/sealos/pull/1916
* Support ingress static cache by @zzjin in https://github.com/labring/sealos/pull/2072
* Start Infra and add status  by @wuxming in https://github.com/labring/sealos/pull/2078
* feature(main): fix auth deploy for cluster-image by @cuisongliu in https://github.com/labring/sealos/pull/2083
* Update frontend nonRoot user. by @zzjin in https://github.com/labring/sealos/pull/2085
* fix: copy registry to the correct path by @fengxsong in https://github.com/labring/sealos/pull/2087
* reduction Makefile and add build-multi-arch by @wuxming in https://github.com/labring/sealos/pull/2093
* example: how to run Redis and Pgsql instance on sealos cloud by @cdjianghan in https://github.com/labring/sealos/pull/2104
* Update frontend Readme. by @zzjin in https://github.com/labring/sealos/pull/2102
* fix typo by @fengxsong in https://github.com/labring/sealos/pull/2113
* del:useless go mod by @xiao-jay in https://github.com/labring/sealos/pull/2118
* cloud-provider-fontend page by @zjy365 in https://github.com/labring/sealos/pull/2094
* docs example : how to use env by @fanux in https://github.com/labring/sealos/pull/2109
* fix scp password and support delete scp by @zjy365 in https://github.com/labring/sealos/pull/2119
* fixed sealos\docs\4.0\i18n\zh-Hans\getting-started\build-example-cloudimage.md by @loda13 in https://github.com/labring/sealos/pull/2124
* fix infra controller status by @fanux in https://github.com/labring/sealos/pull/2128
* feat. image hub: datapack rebuild, add finalizer by @lingdie in https://github.com/labring/sealos/pull/2050
* bug: fixed using ssh private key to login instance by @fanux in https://github.com/labring/sealos/pull/2133
* bug: fixed parse image name and tag by @muicoder in https://github.com/labring/sealos/pull/2135
* use user data to permit root login using ssh private key by @fanux in https://github.com/labring/sealos/pull/2136
* modify spec and add default value by @zjy365 in https://github.com/labring/sealos/pull/2130
* feat: support registries HA by @fengxsong in https://github.com/labring/sealos/pull/2096
* fixed cluster operator auto to create kuberentes by @fanux in https://github.com/labring/sealos/pull/2139
* fixed infra recocile vms by @fanux in https://github.com/labring/sealos/pull/2142
* fix: delete sealer by @xiaohan1202 in https://github.com/labring/sealos/pull/2150
* Update README.md, add command for untaint tag when low version by @tanshilingithub in https://github.com/labring/sealos/pull/2149
* Init support image-hub get&list. by @zzjin in https://github.com/labring/sealos/pull/2143
* scp modify the style of the details page by @zjy365 in https://github.com/labring/sealos/pull/2141
* fixed apply cluster on infra by @fanux in https://github.com/labring/sealos/pull/2158
* wait for infra create when get cluster by @fanux in https://github.com/labring/sealos/pull/2160
* instead echo to tee by @fanux in https://github.com/labring/sealos/pull/2161
* Update auto build paths config. by @zzjin in https://github.com/labring/sealos/pull/2162
* fixed set system disk to 40G by default, the device name must be /dev… by @fanux in https://github.com/labring/sealos/pull/2164
* Update Controller Readme. by @zzjin in https://github.com/labring/sealos/pull/2168
* fixed some problem about scp frontend by @zjy365 in https://github.com/labring/sealos/pull/2170
* encapsulate the infra api by @zjy365 in https://github.com/labring/sealos/pull/2169
* Dev apisix by @zzjin in https://github.com/labring/sealos/pull/2144
* Fix the scp timestamp by @zjy365 in https://github.com/labring/sealos/pull/2173
* refactor(user): using finalizer utils replace it by @cuisongliu in https://github.com/labring/sealos/pull/2172
* feat: run sealos without root privileges by @fengxsong in https://github.com/labring/sealos/pull/2163
* Fix: fix aws ec2 price by @xiao-jay in https://github.com/labring/sealos/pull/2174
* fix: copy empty merged dir anyway by @fengxsong in https://github.com/labring/sealos/pull/2182
* feat:  add describe image api and get root device name from ami. by @whybeyoung in https://github.com/labring/sealos/pull/2178
* fix: create instance disk size error and adjust user define disk device name by @whybeyoung in https://github.com/labring/sealos/pull/2179
* fix: kustomize makefile with a little enhance by @whybeyoung in https://github.com/labring/sealos/pull/2185
* fix: coredns crash issue. by @fengxsong in https://github.com/labring/sealos/pull/2180
* Refactor ssh copy by @fengxsong in https://github.com/labring/sealos/pull/2186
* feat: add back create subcommand and support manually unshare by @fengxsong in https://github.com/labring/sealos/pull/2187
* fix: adjust sealos reset process order by @fengxsong in https://github.com/labring/sealos/pull/2190
* update readme, add new product show and some descriptions by @fanux in https://github.com/labring/sealos/pull/2188
* fix: Clusterfile must has right sort of hosts, host[0] must be master… by @gopherWxf in https://github.com/labring/sealos/pull/2191
* Imagehub refactor: delete controller update delete interface. by @lingdie in https://github.com/labring/sealos/pull/2184
* fix: remove detach by @xiaohan1202 in https://github.com/labring/sealos/pull/2193
* enchance: optimizing ssh copy by @fengxsong in https://github.com/labring/sealos/pull/2195
* go get  k8s.io/api@v0.24.3 to fixed build failed by @fanux in https://github.com/labring/sealos/pull/2197
* Fix infra&cluster operator event pkg. by @zzjin in https://github.com/labring/sealos/pull/2198
* refactor(user): rename doReconcile to reconcile by @cuisongliu in https://github.com/labring/sealos/pull/2199
* Dev ci to fix controllers dep. by @zzjin in https://github.com/labring/sealos/pull/2201
* feat: add more print column like status by @whybeyoung in https://github.com/labring/sealos/pull/2204
* feat: add finalizer to stop/terminate aws instance. by @whybeyoung in https://github.com/labring/sealos/pull/2196
* fix: reconcile instance count by @xiaohan1202 in https://github.com/labring/sealos/pull/2203
* feat: add get volumes api when using get instnaces by @whybeyoung in https://github.com/labring/sealos/pull/2200
* feat. sealos login hub.sealos.io by kubeconfig. by @lingdie in https://github.com/labring/sealos/pull/2176
* fix: move IsRootless out of pkg/buildah by @fengxsong in https://github.com/labring/sealos/pull/2207
* feat. sealos registry hub.sealos.io auth server. by @lingdie in https://github.com/labring/sealos/pull/2177
* add appstore product show by @fanux in https://github.com/labring/sealos/pull/2208
* Imagehub.deploy by @lingdie in https://github.com/labring/sealos/pull/2214
* fix deploy.yaml: add service/hub to workflow. by @lingdie in https://github.com/labring/sealos/pull/2215
* feature(main): Support configuration file custom vip by @cuisongliu in https://github.com/labring/sealos/pull/2115
* Hub.deploy by @lingdie in https://github.com/labring/sealos/pull/2216
* feat: delete key pair by @xiaohan1202 in https://github.com/labring/sealos/pull/2217
* fix: only run guest command for app type cloudimage by @fengxsong in https://github.com/labring/sealos/pull/2218
* Remove uuid package to build-in crypto. by @zzjin in https://github.com/labring/sealos/pull/2219
* Fix go mod caused by #2217 by @zzjin in https://github.com/labring/sealos/pull/2220
* hub.deploy by @lingdie in https://github.com/labring/sealos/pull/2221
* fix: reconnect when specified error occur with sftp connection by @fengxsong in https://github.com/labring/sealos/pull/2225
* fix: replace new line sep by @fengxsong in https://github.com/labring/sealos/pull/2228
* feature(main): add delete build file scan by @cuisongliu in https://github.com/labring/sealos/pull/2229
* ci: pin ubuntu version in CI to 20.04 by @SignorMercurio in https://github.com/labring/sealos/pull/2235
* fix: #2232 force override when the prompted answer is yes by @fengxsong in https://github.com/labring/sealos/pull/2237
* fix: get the full root command name by @fengxsong in https://github.com/labring/sealos/pull/2236
* feature(main): support v1 and v1alpha2 version cri by @cuisongliu in https://github.com/labring/sealos/pull/2238
* feature(main): support sys env  by @cuisongliu in https://github.com/labring/sealos/pull/2240
* feature(main): add build-in env docs by @cuisongliu in https://github.com/labring/sealos/pull/2241
* fix: set tls-verify option default to false by @fengxsong in https://github.com/labring/sealos/pull/2239
* Fix: image hub delete useless image detail info. by @lingdie in https://github.com/labring/sealos/pull/2243
* feature(main): add kubernetes support and changelog by @cuisongliu in https://github.com/labring/sealos/pull/2242
* Pin ubuntu version in Release workflow, use correct goreleaser args for sealctl and add release checksum by @SignorMercurio in https://github.com/labring/sealos/pull/2249
* ci: adjust files to be checksumed by @SignorMercurio in https://github.com/labring/sealos/pull/2250

## New Contributors
* @lingdie made their first contribution in https://github.com/labring/sealos/pull/1988
* @wuxming made their first contribution in https://github.com/labring/sealos/pull/1994
* @zjy365 made their first contribution in https://github.com/labring/sealos/pull/2004
* @cdjianghan made their first contribution in https://github.com/labring/sealos/pull/2104
* @xiaohan1202 made their first contribution in https://github.com/labring/sealos/pull/2150
* @tanshilingithub made their first contribution in https://github.com/labring/sealos/pull/2149
* @gopherWxf made their first contribution in https://github.com/labring/sealos/pull/2191

**Full Changelog**: https://github.com/labring/sealos/compare/v4.1.4-rc1...v4.1.4-rc2
