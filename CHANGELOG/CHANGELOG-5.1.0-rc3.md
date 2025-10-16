
# Welcome to the v5.1.0-rc3 release of Sealos!🎉🎉!

<a name="v5.1.0-rc3"></a>
## [v5.1.0-rc3](https://github.com/labring/sealos/compare/v5.1.0-rc2...v5.1.0-rc3) (2025-10-16)

### Bug Fixes

* **devbox:** some 403 error text adjust ([#6099](https://github.com/labring/sealos/issues/6099))
* **alerts:** update ns alert ([#6098](https://github.com/labring/sealos/issues/6098))
* **applaunchpad:** add null check for appName in domain verification handler ([#6094](https://github.com/labring/sealos/issues/6094))
* **aiproxy:** correct internal backend URL in values.yaml ([#6081](https://github.com/labring/sealos/issues/6081))
* **ci:** enhance tagpr workflow with version input validation and retry logic for image pulling ([#6086](https://github.com/labring/sealos/issues/6086))
* **desktop:** prevent pod crash on SMS/email failures ([#6072](https://github.com/labring/sealos/issues/6072))
* **costcenter:** billing detail display ([#6070](https://github.com/labring/sealos/issues/6070))
* **devbox:** claude-code template shortcut bug ([#6069](https://github.com/labring/sealos/issues/6069))
* **proxy:** update image registry to use dockerproxy.net ([#6065](https://github.com/labring/sealos/issues/6065))

### Code Refactoring

* **image-cri-shim:** remove registry.d support ([#6089](https://github.com/labring/sealos/issues/6089))
* **kubepanel:** try remove kubepanel's metadata.managedFields. ([#6076](https://github.com/labring/sealos/issues/6076))

### New Features

* **image-cri-shim:** implement synchronization of image-cri-shim config from ConfigMap ([#6091](https://github.com/labring/sealos/issues/6091))
* **release:** update release workflow to trigger on tag pushes ([#6093](https://github.com/labring/sealos/issues/6093))
* **aiproxy-froent:** add swagger doc ([#6084](https://github.com/labring/sealos/issues/6084))
* **check:** refactor kernel version check into separate script ([#6079](https://github.com/labring/sealos/issues/6079))
* **image-cri-shim:** sync inline registries to registry.d ([#6075](https://github.com/labring/sealos/issues/6075))
* **aiproxy:** add aiproxy chart build ([#6073](https://github.com/labring/sealos/issues/6073))
* **applaunchpad:** optimize domain binding interaction ([#6071](https://github.com/labring/sealos/issues/6071))
* **image-cri-shim:** Dynamic Configuration Reloading ([#6067](https://github.com/labring/sealos/issues/6067))
* **launchpad:** add PVC monitor support and fix unified time axis rendering issue ([#6068](https://github.com/labring/sealos/issues/6068))
* **service:** Add launchpad PVC query function and bug fix ([#6063](https://github.com/labring/sealos/issues/6063))

See [the CHANGELOG](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md) for more details.

Your patronage towards Sealos is greatly appreciated 🎉🎉.

If you encounter any problems during its usage, please create an issue in the [GitHub repository](https://github.com/labring/sealos), we're committed to resolving your problem as soon as possible.
