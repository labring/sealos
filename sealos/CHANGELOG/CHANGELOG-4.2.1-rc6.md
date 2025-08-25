Welcome to the v4.2.1-rc6 release of Sealos!🎉🎉!



## Changelog
### New Features
* b567669d5cc49681c75730901062b28baba9e51a: feat(desktop):login (#3276) (@xudaotutou)
* 134904e55a7b80f2c8eb41574fee3dcf88ee524b: feat: app launchpad i18n (#3235) (@zjy365)
* 0d9ea570595efa7456cc5b5dd05e1125ccce1538: feat: apply limitrange;perf: db min cpu and memory;docs (#3234) (@c121914yu)
* 32572c676bad95f1e29337111b8f66eac24b0924: feat: desktop i18n (#3221) (@zjy365)
* b08fc64e0a0a44359202179dd09c5cdec8d2b099: feat: remove the i18n language prefix (#3274) (@zjy365)
* 49dd20305843b4ecfa40925470b9eeeb6343ce6b: feat: terminal connection stability (#3263) (@zjy365)
### Bug fixes
* 1029bfd50fb7efd93eddd86d0027bf08655d0b4e: fix: add default configs in storage.options.overlay section (#3236) (@fengxsong)
* f4382af21e13b93dd5c47c0c551b64f74eb9b446: fix: name regx (#3254) (@c121914yu)
* f9b4da648b336c375c641a0146d535fe4f9d9b00: fix: return early to avoid calling imagesaver (#3288) (@fengxsong)
* f150ecb9001a1ec587508e6510a64b3b654e052f: fix: router back invalid; perf: database ux (#3241) (@c121914yu)
* 469d6f7c4b9a4799a9b5dfc9da4508610f23dc1d: fix: set default storage config path for root users (#3293) (@fengxsong)
### Other work
* be23cefe06af6c36bbbab3c4e4b2540758759d79: Add ARCH doc. (#3262) (@zzjin)
* a7a1765730ffd0ac808e70750ab290f4651e2317: Add adminer status Check to adminer. (#3295) (@zzjin)
* 0508e4da612aefa3f3562f655cecec9e399f9444: Added an example of how to connect to the database in the WordPress (#3270) (@ElonMuskkkkkk)
* 253cd3200bf7c0dd11f881cd6fbbf5d72765ddcc: Adjust documentation example structure (#3261) (@bxy4543)
* 053fb5eb47cf73e5d8b50e6380c6ab0db7c52f4e: Delete database-launch.png (@sakcer)
* 146b329ad8773fa7e5870761ce453f61e74ba99f: Fix adminer connect driver name. (#3230) (@zzjin)
* 1544a8955647f992063cd1f160151838174d11a2: Fix ass go-lint-ci version. (#3244) (@zzjin)
* 16cdabf7889283613eb38ed9f4b33acd8fd9236e: Fix back (#3253) (@zzjin)
* 484275079b5f542d70c612b3e858ddaea97d8a79: Fix life-circle sidebar (#3290) (@zzjin)
* 7bbba06f54b3e18da48685b3c7b73054a02fc2ca: Remove files with no more needed. (#3285) (@zzjin)
* 99e6accf65e9e6564b7ee04813c72aadf6277cb8: Revoke lint version 1.53 bug. (#3242) (@zzjin)
* ce700f48b40faa9bc6eec2f8470a3d7e505d8890: Update aap cr, support i18n. (#3243) (@zzjin)
* 522aefa768639aa9ca5d6534225a5bab8bee26af: Update doc links. (#3284) (@zzjin)
* 53c788e852ace030b85f260a5b2b4c9efef2d7d2: Update install-db-with-database.md (@sakcer)
* 77ffa22b3f16a65708c4f504507db87c0d582e01: Update install-db-with-database.md (@sakcer)
* 159cd00ef3787dbf4c7de6f8664b3390ce69bbe8: Update install-db-with-database.md (@sakcer)
* d1051809083aed3d25e40d0a3c366e699ac6c13c: add doc install-db-with-database (#3239) (@sakcer)
* ee3c5c651510d9f1f9e120b24eb9909d424efd2a: add some examples in README (#3281) (@fanux)
* ca49ff88ce59a4bec3cb7c356ae71dbc60f074ed: change database-launch to chinese version (@sakcer)
* 1b68ca80b652d4de6011550d488f558053689963: delete how-to-deploy-postgresql-with-kubeblocks-on-sealos-cloud.md (#3282) (@sakcer)
* e8f3d01afb8cb052f859fcc810ace2a4ad31e502: delete the old version of markdown about database (#3249) (@ElonMuskkkkkk)
* 3980d37399a15c977104c525a48ad3e2bb634f98: docs (#3255) (@c121914yu)
* 6c5fb2bcbbf2e711008bd0c6644b890c020b8a47: docs(main):  fix lifecyle-management from intro (#3256) (@cuisongliu)
* 163bcfcce2dc9d9a04ce9d8777bbbaf69f305d0f: docs(main): add docs issue template (#3278) (@cuisongliu)
* 1f42cdbf24abf0a1496602c5fb0a5cdb330b0f8f: docs(main): add tips for sealos buildah rm (#3291) (@cuisongliu)
* 0c8d89aa6646d0fe404ec41ede611f5de7a31c93: docs: Add Desktop image for Intro documentation (#3252) (@yangchuansheng)
* 73b168edb57cc82199645ea240e83106c351b2cb: docs: Add terminal documentation and images for platform components (#3265) (@yangchuansheng)
* 56f2e39cbffc625c20f7f66bbcbd0f218f988352: docs: Update App Launchpad quick start guide (#3248) (@yangchuansheng)
* d73fcb1c550076e87858ffe950c169e9f2a5e3f3: docs: Update README (#3246) (@yangchuansheng)
* 6090210673f3330b54db88b3178911f0ad3cdf02: docs: fix part of the link failure (#3267) (@nowinkeyy)
* 019d321b26024138476eeb59e6579d95af26a46d: docs: fix part of the link failure (#3271) (@nowinkeyy)
* ce99fdfd72fde6f8ef5805e21eeac7013487dd18: docs: modifying docs format (#3268) (@BanTanger)
* 0e21d6085cdc993703cf8b948e3690cc8376a2d6: feature(main): add buildah labeler (#3289) (@cuisongliu)
* 9feb721d17bc79c7f9f276fefc5ff9b6c3e2e46e: feature(main): add docs for sealos run (#3292) (@cuisongliu)
* 6b228fe9d64946b83f3b70ed890919c02a471ca1: feature: recharge extra gift amount (#3296) (@nowinkeyy)
* 5a536fe5a17f8a4197492b90f3e06fe3e187b5ff: fix docs img link (#3286) (@bxy4543)
* 62e25cb1e5f0ad1f7c7e3189cb36aad4747bf19d: fix readme (#3297) (@bxy4543)
* fa97893c8f9b7fc8c2d0dab9c6bb15a6be11e34d: new app: DB Provider (#3232) (@c121914yu)
* 534a5924b6d18ef6a5f906a58f002f40ac3466d3: refactor(main): add docs for  registry sync solution (#3226) (@cuisongliu)
* 8e4dd4a906edebddaf7057755b5f02645b6592a5: refactor(main): add docs for lvscare (#3233) (@cuisongliu)
* d029b711fb6cf6e56da0e5cad9f7bef524a8cef7: refactor(main): add labeler for ci (#3259) (@cuisongliu)
* 78b250996dbe78b10945fdee24d58b0a1e3e8f94: refactor(main): add master to qa (#3283) (@cuisongliu)
* 2e144779753500c3cf3e31bfc9df9eabacfd43dc: refactor(main): add qa for docs (#3250) (@cuisongliu)
* a4661fe54b023088a51328c53e7609eded8e453c: refactor(main): add qa for main docs (#3223) (@cuisongliu)
* f4049753559f4f6f32996539d9fbd4649d759860: refactor(main): add skip error for sync (#3238) (@cuisongliu)
* bfe872050dcc4b842a97df896e7ca1771e64f828: refactor(main): add translator for ci (#3264) (@cuisongliu)
* ef61e0952f1654caa82976d19983f450b0c8537d: refactor(main): release docs (@cuisongliu)
* a5b21e22b9dea74fa18f10652a90933e959e04ee: 🤖 add release changelog using rebot. (#3229) (@sealos-release-rebot)

**Full Changelog**: https://github.com/labring/sealos/compare/v4.2.1-rc5...v4.2.1-rc6

See [the CHANGELOG](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md) for more details.

Your patronage towards Sealos is greatly appreciated 🎉🎉.

If you encounter any problems during its usage, please create an issue in the [GitHub repository](https://github.com/labring/sealos), we're committed to resolving your problem as soon as possible.
