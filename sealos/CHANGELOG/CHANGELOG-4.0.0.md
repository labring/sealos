- [v4.0.0](#v400httpsgithubcomlabringsealosreleasestagv400)
  - [Downloads for v4.0.0](#downloads-for-v400)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v4.0.0-alpha.1](#changelog-since-v400-alpha1)
  - [NewContributors](#new-contributors)


# [v4.0.0](https://github.com/labring/sealos/releases/tag/v4.0.0)

## Downloads for v4.0.0


### Source Code

filename |  
-------- | 
[v4.0.0.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v4.0.0.tar.gz) | 

### Client Binaries

filename |  
-------- | 
[sealos_4.0.0_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v4.0.0/sealos_4.0.0_linux_amd64.tar.gz) |
[sealos_4.0.0_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v4.0.0/sealos_4.0.0_linux_arm64.tar.gz) | 

## Usage

amd64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.0.0/sealos_4.0.0_linux_amd64.tar.gz  && \
    tar -zxvf sealos_4.0.0_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```

arm64:

```shell
wget  https://github.com/labring/sealos/releases/download/v4.0.0/sealos_4.0.0_linux_arm64.tar.gz  && \
    tar -zxvf sealos_4.0.0_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
```


## Changelog since v4.0.0-alpha.1

* refactor(master): support  docs for sealos 4.0 by @cuisongliu in https://github.com/labring/sealos/pull/921
* refactor(master): support  docs for sealos 4.0 by @cuisongliu in https://github.com/labring/sealos/pull/922
* refactor(master): add multi image module by @cuisongliu in https://github.com/labring/sealos/pull/923
* refactor(master): add multi image and go func by @cuisongliu in https://github.com/labring/sealos/pull/924
* refactor(master): add note by @cuisongliu in https://github.com/labring/sealos/pull/925
* feature(main): add cmd feature for main branch by @cuisongliu in https://github.com/labring/sealos/pull/934
* feature(main): fix release config by @cuisongliu in https://github.com/labring/sealos/pull/935
* feature(main): fix release config by @cuisongliu in https://github.com/labring/sealos/pull/936
* feature(main): add build cmd by @cuisongliu in https://github.com/labring/sealos/pull/937
* feature(main):  support skip error process by @cuisongliu in https://github.com/labring/sealos/pull/940
* feature(main):  cmd \n and process in pull images by @cuisongliu in https://github.com/labring/sealos/pull/944
* feature(main):  fix images build by @cuisongliu in https://github.com/labring/sealos/pull/945
* feature(main): add patch package in run func by @cuisongliu in https://github.com/labring/sealos/pull/949
* feature(main): add auths data by @cuisongliu in https://github.com/labring/sealos/pull/950
* feature(main): sealos run repeat exec by @cuisongliu in https://github.com/labring/sealos/pull/952
* feature(main): support auth build by @cuisongliu in https://github.com/labring/sealos/pull/954
* feature(main): guest run in host cmd for bash by @cuisongliu in https://github.com/labring/sealos/pull/957
* feature(main): no change images by @cuisongliu in https://github.com/labring/sealos/pull/956
* bugfix  by @cuisongliu in https://github.com/labring/sealos/pull/959
* feature(main): fix #960 for controller and schedule bind 0.0.0.0 by @cuisongliu in https://github.com/labring/sealos/pull/961
* feature(main): fix add feature and delete node feature by @cuisongliu in https://github.com/labring/sealos/pull/962
* feature(main): kubeproxy bind by @cuisongliu in https://github.com/labring/sealos/pull/964
* feature(main): 4.0 docs fix by @cuisongliu in https://github.com/labring/sealos/pull/965
* feature(main): fix tag images by @cuisongliu in https://github.com/labring/sealos/pull/967
* update readme by @fanux in https://github.com/labring/sealos/pull/968
* add roadmap by @fanux in https://github.com/labring/sealos/pull/969
* feature(main): fix vendor for sealos by @cuisongliu in https://github.com/labring/sealos/pull/970
* feature(main): fix goinstall by @cuisongliu in https://github.com/labring/sealos/pull/971
* feature(main): fix go release by @cuisongliu in https://github.com/labring/sealos/pull/972
* feature(main): fix rename go mod by @cuisongliu in https://github.com/labring/sealos/pull/973
* feature(main): fix images mount to status by @cuisongliu in https://github.com/labring/sealos/pull/974
* add example for building cloudimage from helm by @fanux in https://github.com/labring/sealos/pull/978
* feature(main): add ssh exec/copy feature by @cuisongliu in https://github.com/labring/sealos/pull/980
* feature(main): rename sealyun to sealos.io by @cuisongliu in https://github.com/labring/sealos/pull/979
* feature(main): fix install config by @cuisongliu in https://github.com/labring/sealos/pull/977
* feature(main): fix scale check logic by @cuisongliu in https://github.com/labring/sealos/pull/981
* feature: add list images using buildah by @whybeyoung in https://github.com/labring/sealos/pull/988
* Fix #997 support arm64 using buildx by @whybeyoung in https://github.com/labring/sealos/pull/1003
* feature: add pull commands using buildah #986 by @yyf1986 in https://github.com/labring/sealos/pull/1002
* feature(main): fix buildah config sync problem by @cuisongliu in https://github.com/labring/sealos/pull/1006
* feature: add pull commands using buildah #986 by @yyf1986 in https://github.com/labring/sealos/pull/1011
* feature(main): http push registry by @cuisongliu in https://github.com/labring/sealos/pull/1009
* feature(main): fix confirm bug by @cuisongliu in https://github.com/labring/sealos/pull/1008
* feature(main): fix create check bug by @cuisongliu in https://github.com/labring/sealos/pull/1010
* fix release workflows for arm64 by @whybeyoung in https://github.com/labring/sealos/pull/1014
* feature: add push commands using buildah #986 by @yyf1986 in https://github.com/labring/sealos/pull/1015
* modify pkg/guest/guest.go by @gebilxs in https://github.com/labring/sealos/pull/1020
* feature: add login/logout commands using buildah #986 by @yyf1986 in https://github.com/labring/sealos/pull/1021
* hotfix: port not default 22 by @cuisongliu in https://github.com/labring/sealos/pull/1026
* fix: when operator the registry,defautl is tls_verify=false #986 by @yyf1986 in https://github.com/labring/sealos/pull/1029
* feature(main): fix delete add node and skip error by @cuisongliu in https://github.com/labring/sealos/pull/1027
* Fix: Release GIT AUTH TOKEN missing error fixed by @whybeyoung in https://github.com/labring/sealos/pull/1030
* add create/delete/list/inspect commands using buildah #986 by @yyf1986 in https://github.com/labring/sealos/pull/1041
* feature(main): fix add error send app images by @cuisongliu in https://github.com/labring/sealos/pull/1042
* fix cross build arm ,using statically build by @whybeyoung in https://github.com/labring/sealos/pull/1045
* add 4.0 readme by @fanux in https://github.com/labring/sealos/pull/1049
* fix: arm64 cross netgo panic by @whybeyoung in https://github.com/labring/sealos/pull/1051
* Fix: set default logurs log-level to warn by @whybeyoung in https://github.com/labring/sealos/pull/1046
* fix build images tag not work by @whybeyoung in https://github.com/labring/sealos/pull/1054
* fix release using wrong token by @whybeyoung in https://github.com/labring/sealos/pull/1057
* feature(main): fix actions token by @cuisongliu in https://github.com/labring/sealos/pull/1058
* update v4.0 README, add quickstart by @fanux in https://github.com/labring/sealos/pull/1053
* Add v4.0 README in English by @SignorMercurio in https://github.com/labring/sealos/pull/1059
* Using English readme instread Chinese by @fanux in https://github.com/labring/sealos/pull/1060
* Update README.md by @yangchuansheng in https://github.com/labring/sealos/pull/1061
* feature: add users and MAINTAINERS.md by @whybeyoung in https://github.com/labring/sealos/pull/1062
* Update README.md by @yangchuansheng in https://github.com/labring/sealos/pull/1063
* feature(main): fix check image type after image pull by @cuisongliu in https://github.com/labring/sealos/pull/1066
* Add default registry mirror by @SignorMercurio in https://github.com/labring/sealos/pull/1069
* add rust registry by @fanux in https://github.com/labring/sealos/pull/1072
* feat: make cluster root dir customizable with root cmd flags (#995) by @SignorMercurio in https://github.com/labring/sealos/pull/1073
* refactor: split ssh cmd into exec and scp (#996) by @SignorMercurio in https://github.com/labring/sealos/pull/1075
* feature(main): rename image using default domain and namespace by @cuisongliu in https://github.com/labring/sealos/pull/1076
* feat: support config override by @SignorMercurio in https://github.com/labring/sealos/pull/1080
* feat: customize maximum goroutines for pulling by @SignorMercurio in https://github.com/labring/sealos/pull/1081
* fix: remove max-pull-procs flag in BuildOptions.String() by @SignorMercurio in https://github.com/labring/sealos/pull/1082
* fix: panic when building offline and syntax error in registry config by @SignorMercurio in https://github.com/labring/sealos/pull/1086
* feat: CRI defaults to containerd by @SignorMercurio in https://github.com/labring/sealos/pull/1090
* feature(main): refactor: split ssh cmd into exec and scp(#996) by @cuisongliu in https://github.com/labring/sealos/pull/1079
* Modify characters in README.md by @Ficus-f in https://github.com/labring/sealos/pull/1093
* feat: include .tmpl files when searching for images by @SignorMercurio in https://github.com/labring/sealos/pull/1096
* fix sealos pull images default domain localhost to docker.io #1097 by @yyf1986 in https://github.com/labring/sealos/pull/1102
* modify help by @gebilxs in https://github.com/labring/sealos/pull/1105
* fix doc,add prefix labring by @yyf1986 in https://github.com/labring/sealos/pull/1103
* Indicate fork the source code of sealer by @fanux in https://github.com/labring/sealos/pull/1112
* add en-help by @gebilxs in https://github.com/labring/sealos/pull/1111
* feature(main): fix build not running .yaml by @cuisongliu in https://github.com/labring/sealos/pull/1114
* feature(main): support cache http registry #1022 by @cuisongliu in https://github.com/labring/sealos/pull/1116
* update release note by @fanux in https://github.com/labring/sealos/pull/1118
* add contributors by @gitccl in https://github.com/labring/sealos/pull/1120
* add develop and contribute guide by @fanux in https://github.com/labring/sealos/pull/1124
* feature(main): reset cluster fixd masters and nodes by @cuisongliu in https://github.com/labring/sealos/pull/1125
* update readme arch link by @fanux in https://github.com/labring/sealos/pull/1127
* fix: validate vip before initialization by @fengxsong in https://github.com/labring/sealos/pull/1130
* docs(main): add oscs by @cuisongliu in https://github.com/labring/sealos/pull/1131
* remove unuseful code by @gitccl in https://github.com/labring/sealos/pull/1134
* docs: add more description for delete command by @gitccl in https://github.com/labring/sealos/pull/1135
* feat: add create feature by @SignorMercurio in https://github.com/labring/sealos/pull/1138
* docs: update issue templates to English by @gitccl in https://github.com/labring/sealos/pull/1139
* Add rpm & deb build script with nfpm by @Vonng in https://github.com/labring/sealos/pull/1136
* refactor: change "contants" to "constants" by @SignorMercurio in https://github.com/labring/sealos/pull/1142
* ci: improve Makefile design by @SignorMercurio in https://github.com/labring/sealos/pull/1147
* parse images in helm charts #1004 by @yyf1986 in https://github.com/labring/sealos/pull/1146
* fix: build error in makefile by @SignorMercurio in https://github.com/labring/sealos/pull/1152
* feature(main): sealos run not save clusterfile when init failed by @cuisongliu in https://github.com/labring/sealos/pull/1148
* feat: support entrypoint in Dockerfile by @gitccl in https://github.com/labring/sealos/pull/1151
* Update cmd typos to match unified code format. by @zzjin in https://github.com/labring/sealos/pull/1149
* typo: fix typo clonne in develop guide by @th2zz in https://github.com/labring/sealos/pull/1164
* docs: update go version by @Abingcbc in https://github.com/labring/sealos/pull/1174
* Feat typo by @zzjin in https://github.com/labring/sealos/pull/1170
* copy linux_amd64.yml&&linux_arm64.yml to scripts by @gebilxs in https://github.com/labring/sealos/pull/1167
* update user design by @fanux in https://github.com/labring/sealos/pull/1117
* Using module to simpler vsc source tree. Closes #1771 by @zzjin in https://github.com/labring/sealos/pull/1172
* fix: fix bug in gen.clean and use local binaries for tools by @SignorMercurio in https://github.com/labring/sealos/pull/1181
* feature(main): seactl - sealctl by @cuisongliu in https://github.com/labring/sealos/pull/1183
* feature: sealos gen by @gitccl in https://github.com/labring/sealos/pull/1201
* feature(main): generator code  deepcopy by @cuisongliu in https://github.com/labring/sealos/pull/1200
* fix: can't specify dockerfile  by @whybeyoung in https://github.com/labring/sealos/pull/1213
* ci: adjust makefile release targets by @SignorMercurio in https://github.com/labring/sealos/pull/1216
* modify run cmd tips  by @runzhliu in https://github.com/labring/sealos/pull/1217
* Add support for command override by @SignorMercurio in https://github.com/labring/sealos/pull/1218
* feature(main): update lvscare sdk multiple network by @cuisongliu in https://github.com/labring/sealos/pull/1212

## New Contributors
* @yangchuansheng made their first contribution in https://github.com/labring/sealos/pull/1061
* @Vonng made their first contribution in https://github.com/labring/sealos/pull/1136
* @th2zz made their first contribution in https://github.com/labring/sealos/pull/1164
* @runzhliu made their first contribution in https://github.com/labring/sealos/pull/1217

**Full Changelog**: https://github.com/labring/sealos/compare/v4.0.0-alpha.1...v4.0.0







