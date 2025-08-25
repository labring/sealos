- [v4.1.0-rc1](#v410-rc1httpsgithubcomlabringsealosreleasestagv410-rc1)
  - [Downloads for v4.1.0-rc1](#downloads-for-v410-rc1)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.0.0](#changelog-since-v400)
  - [NewContributors](#new-contributors)


# [v4.1.0-rc1](https://github.com/labring/sealos/releases/tag/v4.1.0-rc1)

## Downloads for v4.1.0-rc1


### Source Code

filename |
-------- |
[v4.1.0-rc1.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.1.0-rc1.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_4.1.0-rc1_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.0-rc1/sealos_4.1.0-rc1_linux_amd64.tar.gz) |
[sealos_4.1.0-rc1_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.1.0-rc1/sealos_4.1.0-rc1_linux_arm64.tar.gz) |

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.0-rc1/sealos_4.1.0-rc1_linux_amd64.tar.gz  &&     tar -zxvf sealos_4.1.0-rc1_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.1.0-rc1/sealos_4.1.0-rc1_linux_arm64.tar.gz  &&     tar -zxvf sealos_4.1.0-rc1_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.0.0

### What's Changed

* fix: merge go.build.%.sealctl/sealos by @SignorMercurio in https://github.com/labring/sealos/pull/1226
* update readme by @fanux in https://github.com/labring/sealos/pull/1228
* Update DEVELOPGUIDE.md by @Ficus-f in https://github.com/labring/sealos/pull/1229
* feat: support docs generation by @SignorMercurio in https://github.com/labring/sealos/pull/1231
* feature(main): delete lvscare ipvs and route by @cuisongliu in https://github.com/labring/sealos/pull/1230
* refactor: improve scale and reset params by @SignorMercurio in https://github.com/labring/sealos/pull/1238
* fix a word spell problem by @shy-Xu in https://github.com/labring/sealos/pull/1239
* feat: sealos inspect by @gitccl in https://github.com/labring/sealos/pull/1225
* Update install-sealos.md by @Ficus-f in https://github.com/labring/sealos/pull/1247
* refactor(main): pkg/hosts->utils, pkg/token->pkg/runtime/token by @cuisongliu in https://github.com/labring/sealos/pull/1246
* ci: enable CGO for building sealos by @SignorMercurio in https://github.com/labring/sealos/pull/1244
* feat: refactor infra yaml struct by @taorzhang in https://github.com/labring/sealos/pull/1234
* fix: no longer explicitly specify cgo_enabled by @berlinsaint in https://github.com/labring/sealos/pull/1253
* refactor(main): delete node using hostname by @cuisongliu in https://github.com/labring/sealos/pull/1254
* refactor(main): merge code from lvscare by @cuisongliu in https://github.com/labring/sealos/pull/1249
* refactor(main): add test workflows by @cuisongliu in https://github.com/labring/sealos/pull/1256
* docs: improve DEVELOPGUIDE.md by @SignorMercurio in https://github.com/labring/sealos/pull/1258
* fix:  reduce ci time by @berlinsaint in https://github.com/labring/sealos/pull/1260
* ci: improve workflow and fix ut error by @SignorMercurio in https://github.com/labring/sealos/pull/1261
* Add license scan report and status by @fossabot in https://github.com/labring/sealos/pull/1264
* refactor(main): add codecov img by @cuisongliu in https://github.com/labring/sealos/pull/1263
* Fix ci requirement by @zzjin in https://github.com/labring/sealos/pull/1267
* refactor(main): add test delete node workflows by @cuisongliu in https://github.com/labring/sealos/pull/1262
* refactor(main): add fossa workflows by @cuisongliu in https://github.com/labring/sealos/pull/1268
* refactor(main): add fossa workflows by @cuisongliu in https://github.com/labring/sealos/pull/1269
* refactor(main): delete fossa workflows by @cuisongliu in https://github.com/labring/sealos/pull/1273
* refactor(main): add registry logger by @cuisongliu in https://github.com/labring/sealos/pull/1274
* ci: multiple improvements on CI workflow by @SignorMercurio in https://github.com/labring/sealos/pull/1270
* ci: Update ci.yml to use simpler make build to build testing binaries by @SignorMercurio in https://github.com/labring/sealos/pull/1278
* refactor(main): run app image fix port by @cuisongliu in https://github.com/labring/sealos/pull/1281
* ci: build binaries for lvscare and image-cri-shim by @SignorMercurio in https://github.com/labring/sealos/pull/1283
* refactor(main): Execute the command If it is a local IP, use the os package. by @cuisongliu in https://github.com/labring/sealos/pull/1282
* fix disposition by @gebilxs in https://github.com/labring/sealos/pull/1286
* ci: add workflows to build and push images for lvscare by @SignorMercurio in https://github.com/labring/sealos/pull/1288
* feat: oauth2 to generate kubeconfig by @Abingcbc in https://github.com/labring/sealos/pull/1219
* refactor(main): set default Transport for buildah by @cuisongliu in https://github.com/labring/sealos/pull/1289
* refactor(main): add transport param for save and load by @cuisongliu in https://github.com/labring/sealos/pull/1297
* fix system user design doc  typo by @xiaospider in https://github.com/labring/sealos/pull/1291
* ci: improve go.build in Makefile, setup multi-arch docker image build…    by @SignorMercurio in https://github.com/labring/sealos/pull/1296
* refactor(main): sealos run other server by @cuisongliu in https://github.com/labring/sealos/pull/1292
* ci: use goreleaser to release docker images & deb and rpm packages, r… by @SignorMercurio in https://github.com/labring/sealos/pull/1299
* feat(desktop): casdoor k8s yaml by @Abingcbc in https://github.com/labring/sealos/pull/1302
* refactor(main): fix release to any one by @cuisongliu in https://github.com/labring/sealos/pull/1304
* refactor(main): reset add getSSHInterface for shim by @cuisongliu in https://github.com/labring/sealos/pull/1308
* refactor(main): add note for image and apt deb by @cuisongliu in https://github.com/labring/sealos/pull/1307
* add infra controller scratch by @fanux in https://github.com/labring/sealos/pull/1294
* refactor(main): add note for image and apt deb (#1307) by @cuisongliu in https://github.com/labring/sealos/pull/1310
* bugfix: fix dashboard css typo by @xiaospider in https://github.com/labring/sealos/pull/1313
* init support of .devcontainer, Impl #1241, Closes #1241. by @zzjin in https://github.com/labring/sealos/pull/1298
* feat: support custom apiserver port by @gitccl in https://github.com/labring/sealos/pull/1316
* doc: add dev container badge and adjust badges order by @SignorMercurio in https://github.com/labring/sealos/pull/1318
* fix(main): port set error by @cuisongliu in https://github.com/labring/sealos/pull/1323
* refactor(desktop): replace panic with errors by @Abingcbc in https://github.com/labring/sealos/pull/1328
* fix: generate .kube dir in home dir by @gitccl in https://github.com/labring/sealos/pull/1324
* ci: enable CGO by @SignorMercurio in https://github.com/labring/sealos/pull/1319
* Unite log system with zap. by @zzjin in https://github.com/labring/sealos/pull/1300
* add infra CRD spec by @fanux in https://github.com/labring/sealos/pull/1331
* update contribute guide by @fanux in https://github.com/labring/sealos/pull/1333
* add aws reconcile instances by @fanux in https://github.com/labring/sealos/pull/1334
* fix add node failed, apiserver port is 0 by @fanux in https://github.com/labring/sealos/pull/1339
* upgrade IsIpv4 function use to system api by @zsyaoo in https://github.com/labring/sealos/pull/1326
* Del applications dir by @zzjin in https://github.com/labring/sealos/pull/1340
* ci: support code and docs syncing by @SignorMercurio in https://github.com/labring/sealos/pull/1332
* ci: fix docs sync error by @SignorMercurio in https://github.com/labring/sealos/pull/1341
* docs: update notes about cross-platform building by @SignorMercurio in https://github.com/labring/sealos/pull/1344
* fix(main): add local ip logger by @cuisongliu in https://github.com/labring/sealos/pull/1346
* Add infra driver interface by @fanux in https://github.com/labring/sealos/pull/1343
* fix(main): rename AddonsImage to PatchImage by @cuisongliu in https://github.com/labring/sealos/pull/1348
* Update go1.18 to support workspace by @zzjin in https://github.com/labring/sealos/pull/1350
* update develop guide about workspace. by @zzjin in https://github.com/labring/sealos/pull/1352
* refactor: clean flag of lvscare by @fengxsong in https://github.com/labring/sealos/pull/1354
* docs: remove badges for lvscare by @SignorMercurio in https://github.com/labring/sealos/pull/1358
* ci: fix sync_code trigger paths by @SignorMercurio in https://github.com/labring/sealos/pull/1360
* fix(main): delete logger for isLocal by @cuisongliu in https://github.com/labring/sealos/pull/1359
* fix(main): sync is exists by @cuisongliu in https://github.com/labring/sealos/pull/1361
* add & init sealos desktop frontend project by @maslow in https://github.com/labring/sealos/pull/1357
* logger support fulltext color by @zzjin in https://github.com/labring/sealos/pull/1362
* Feature: Services-Auth  by @zzjin in https://github.com/labring/sealos/pull/1347
* feature(main): local ip not ping by @cuisongliu in https://github.com/labring/sealos/pull/1363
* feat: auto create dummy link if needed by @fengxsong in https://github.com/labring/sealos/pull/1367
* fix(main): unexpected end of file by @xuehaipeng in https://github.com/labring/sealos/pull/1372
* update pull request template to supress showing by @zzjin in https://github.com/labring/sealos/pull/1371
* perf: singleton just fine by @fengxsong in https://github.com/labring/sealos/pull/1374
* Revert "feature(main): add lvscare docker build" by @cuisongliu in https://github.com/labring/sealos/pull/1375
* ci: skip pr when syncing by @SignorMercurio in https://github.com/labring/sealos/pull/1377
* remove duplicate codes by @fengxsong in https://github.com/labring/sealos/pull/1376
* fix: go.build.verify by @xuehaipeng in https://github.com/labring/sealos/pull/1379
* fix: deprecated grpc dial option by @xuehaipeng in https://github.com/labring/sealos/pull/1380
* refactor ssh client by @fengxsong in https://github.com/labring/sealos/pull/1381
* add driver framework, define driver interface and reconcile controller by @fanux in https://github.com/labring/sealos/pull/1387
* feature(main): add lvscare docker build by @cuisongliu in https://github.com/labring/sealos/pull/1382
* ci: improve ci workflow by @SignorMercurio in https://github.com/labring/sealos/pull/1390
* update readme deadlink by @fanux in https://github.com/labring/sealos/pull/1392
* add controller reconcile, add events recorder. by @fanux in https://github.com/labring/sealos/pull/1394
* feature(main): single module kubernetes cluster by @cuisongliu in https://github.com/labring/sealos/pull/1396
* update auth service by @zzjin in https://github.com/labring/sealos/pull/1370
* add terminal CRD spec by @gitccl in https://github.com/labring/sealos/pull/1398
* remove unused mod use with `go mod tidy` by @zzjin in https://github.com/labring/sealos/pull/1400
* feature(main): add lvscare docker build by @cuisongliu in https://github.com/labring/sealos/pull/1399

## New Contributors

* @shy-Xu made their first contribution in https://github.com/labring/sealos/pull/1239
* @taorzhang made their first contribution in https://github.com/labring/sealos/pull/1234
* @fossabot made their first contribution in https://github.com/labring/sealos/pull/1264
* @xiaospider made their first contribution in https://github.com/labring/sealos/pull/1291
* @zsyaoo made their first contribution in https://github.com/labring/sealos/pull/1326
* @maslow made their first contribution in https://github.com/labring/sealos/pull/1357
* @xuehaipeng made their first contribution in https://github.com/labring/sealos/pull/1372

**Full Changelog**: https://github.com/labring/sealos/compare/v4.0.0...v4.1.0-rc1


