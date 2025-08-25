Welcome to the v4.2.1 release of Sealos!🎉🎉!



## Changelog
### New Features
* 03e43356c73c5ef07b8e0fc3e6d50fe62ef25fdb: feat: desktop communication app change i18n (#3324) (@zjy365)
* 0a45fe75ecfe5bed0ac1ea74c4261e63fd2db173: feat: js-cookie (#3322) (@zjy365)
* 2de6e52812e87b02b0a65ef012e316f3324992f4: feat: support override platform flags for inspect command (#3304) (@fengxsong)
* 0866fbbe051ee06c8fdf6fa0452878cc520c2706: feat:costcenter (#3326) (@xudaotutou)
### Bug fixes
* 2114a8744b5b262928563ec7a246e838f06dade3: bugfix: fix the wrong unit (#3313) (@nowinkeyy)
* dfa71f933e986473da3461cb8fe8e116fe6e4273: fix: avoid fetching local repos repeatly (#3336) (@fengxsong)
* bc26a4ae7b525c1460f44e3c15f2b127988dee62: fix: i18n and db opsrequest (#3348) (@c121914yu)
* aa9be9451d6f17f53632e4482c47a7b3c618548e: fix: launchapad i18n & update app way (#3321) (@c121914yu)
* 2a0e3e867df8756ff80f6c1ae57538333abf3c70: fix: launchpad i18n init;fix: do not split command (#3329) (@c121914yu)
* 502bee1437d919cbf64b974556cac2fc17990a76: fix: modify cookie policy (#3325) (@zjy365)
* 5eeb554e5b510abedfa168612327b86a2319c2d0: fix: retry when error contains internal server error message (#3347) (@fengxsong)
* 807a736100fba5b20efa7970237d099afec47e0a: fix:fix version comparison issue (#3328) (@overstarry)
### Other work
* a4c62adf98682970049ab98a5ee26719e0f427ca: Add adminer prints. (#3346) (@zzjin)
* e2514f060e60d3dddd1a87dd84f413847b1121ce: Fix desktop login error (#3320) (@xudaotutou)
* 0118f9fe56c6268d6ec2a90fdd0106dd24c27f76: SDK enhances communication, app supports event monitoring (#3311) (@zjy365)
* 261d85cc8cfd465a3cad7b252bef01a772a94ee2: Try using probe to check pod ready. (#3345) (@zzjin)
* fb191f4fbfb97b9692ecfb9b0e150d61dc249704: Update README (#3341) (@yangchuansheng)
* ae21df79204adeecde7eaf913cf8237628d5bd58: Update format linter. (#3317) (@zzjin)
* 8e1ead6a1ea1b3476980401f59bf7a147c628379: Update reflector namespaces. (#3351) (@zzjin)
* 29e86d2971dc4559ca6ad30f207f7600c1985d9d: debt controller implement (#3160) (@bxy4543)
* ff8d2dd74395ee278727df120642d3b03f5c11f4: docs(main): fix link for docs (#3309) (@cuisongliu)
* 475a87bb8d2d047cd387c32f64a687d92b24dd55: docs(main): fix link for docs (#3310) (@cuisongliu)
* 7eae15a8bbdfd03e421b36e9adae99da6718acbb: fix resources controller Kubefile (#3332) (@bxy4543)
* 7185ae7057e62027edbb5c5dc29d8c44caca85b8: fix resources controller Kubefile (#3333) (@bxy4543)
* fe6da0a030e6883f3b4447a66ca771cf8bf4309a: fix(cert sign): not get the correct first svc ip from cidr (#3308) (@yldian)
* 46f3003b8dd21310fab7008be43ef2046ab05655: fix(fronted desktop): Cookies are not set by default (#3301) (@xudaotutou)
* b2bba64c0b3a780b76651fda2721ed44a40ebe58: fix(frontend/costcenter): fix i18n (#3330) (@xudaotutou)
* b0a0461b6cba7215fce272a7eb24b5437c7df242: fix(frontend/costcenter):fix i18n (#3335) (@xudaotutou)
* 86e80ed3690bccee81def11e8a5dd313f3721b05: improve cloud deploy (#3339) (@lingdie)
* 49e9981cdf7410e1e2fa6c36292d249315ee9a57: realize timing monitor resources;add mointor, metering to automatically build container image & cluster-image. (#3240) (@bxy4543)
* 4fda7eaec6e19e8d718f79473218765c5d48baf1: refactor(main): add ednpoint check for adminer (#3300) (@cuisongliu)
* 4e1f1f79fdd29ed2ae83f15a96d7afa1eb4bbfd9: refactor(main): add ednpoint rbac (#3303) (@cuisongliu)
* 456b0991df4044acefe11085c4beba5da1e85b60: refactor(main): add link and report (#3306) (@cuisongliu)
* 837234467679471f730bbe38cdc9e74a939898d8: refactor(main): add pull_request_target for checkout (#3314) (@cuisongliu)
* 9101369cd8b00a115cfa53fd034ce8714c5e1a59: refactor(main): add qa for loggers (#3307) (@cuisongliu)
* 18820d0f6d0b963a3eddb9ed8801f68645ef9ad5: refactor(main): fix ci code error (#3323) (@cuisongliu)
* b6d1417ac0ede86eeb8f112a724384bcc68d7982: refactor(main): update link pr action (#3315) (@cuisongliu)
* 33c69299e7e50f567258f1586c0c9f50e7a495f6: refactor(main): update registry when node is update error (#3312) (@cuisongliu)
* daf455b9dda41f610969d18ac7c4b65628eea64a: refactor: registry command with exampleprefix var explicitly (#3305) (@fengxsong)
* e11903e6bc8ed6937e2e91b664a80346504c92e8: update app crd (#3340) (@lingdie)
* 43d8190ef911b345d35052db840ba3d3cd14690c: update issue num (#3343) (@lingdie)
* 8f868d53a9222ea5e0ab488fd0f6f9f2310c03f6: 🤖 add release changelog using rebot. (#3299) (@sealos-release-rebot)

**Full Changelog**: https://github.com/labring/sealos/compare/v4.2.1-rc6...v4.2.1

See [the CHANGELOG](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md) for more details.

Your patronage towards Sealos is greatly appreciated 🎉🎉.

If you encounter any problems during its usage, please create an issue in the [GitHub repository](https://github.com/labring/sealos), we're committed to resolving your problem as soon as possible.
