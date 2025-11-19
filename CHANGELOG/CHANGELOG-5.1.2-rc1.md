
# Welcome to the v5.1.2-rc1 release of Sealos!🎉🎉!

<a name="v5.1.2-rc1"></a>
## [v5.1.2-rc1](https://github.com/labring/sealos/compare/v5.1.1...v5.1.2-rc1) (2025-11-19)

### Bug Fixes

* **license:** use short requeue duration for license validation and activation errors ([#6220](https://github.com/labring/sealos/issues/6220))
* **license:** streamline license activation error handling and update controller options ([#6218](https://github.com/labring/sealos/issues/6218))
* **deploy:** enhance uninstall process by removing specific resources in entrypoint.sh ([#6213](https://github.com/labring/sealos/issues/6213))
* **license:** update CRD version and add additional printer columns for license status ([#6207](https://github.com/labring/sealos/issues/6207))
* **applaunchpad:** temp check index fix for app restart num breaks details page ([#6208](https://github.com/labring/sealos/issues/6208))
* **costcenter:** payment list not refreshes after submitting ([#6177](https://github.com/labring/sealos/issues/6177))
* **docker:** install uidmap and fuse-overlayfs in Dockerfiles ([#6195](https://github.com/labring/sealos/issues/6195))
* **account-controller:** update overdue cleanup frequency ([#6192](https://github.com/labring/sealos/issues/6192))
* **build:** enable static linking for Go binaries ([#6189](https://github.com/labring/sealos/issues/6189))
* **workflows:** Add repository owner check for some workflows ([#6179](https://github.com/labring/sealos/issues/6179))
* **sync_code:** correct LICENSE file path in workflow configuration ([#6178](https://github.com/labring/sealos/issues/6178))
* **desktop:** add termination check to workspace lock function ([#6174](https://github.com/labring/sealos/issues/6174))
* **costcenter:** correctly handle redirecton messages ([#6173](https://github.com/labring/sealos/issues/6173))
* **dbprovider:** dump import script not up to date ([#6165](https://github.com/labring/sealos/issues/6165))
* **costcenter:** several ui fixes for costcenter/desktop ([#6170](https://github.com/labring/sealos/issues/6170))
* **devbox:** correct v1 devbox API version ([#6160](https://github.com/labring/sealos/issues/6160))
* **template:** allow template fallback to local cache when git fails ([#6155](https://github.com/labring/sealos/issues/6155)) ([#6156](https://github.com/labring/sealos/issues/6156))
* **install:** update commercial prompt message for clarity on licensing and feature limitations ([#6152](https://github.com/labring/sealos/issues/6152))
* **costcenter:** billing list showing incorrect records ([#6153](https://github.com/labring/sealos/issues/6153))
* **applaunchpad:** devbox redirect deploy bug ([#6151](https://github.com/labring/sealos/issues/6151))
* **account:** Manual copy to avoid copy() issues with complex types ([#6146](https://github.com/labring/sealos/issues/6146))
* **costcenter:** fix several gliches ([#6147](https://github.com/labring/sealos/issues/6147))
* **account:** semgrep ci ([#6139](https://github.com/labring/sealos/issues/6139))

### Code Refactoring

* **desktop:** use AuthError class for authentication errors ([#6205](https://github.com/labring/sealos/issues/6205))
* **costcenter:** support workspace subscription and refactor cost center ([#5948](https://github.com/labring/sealos/issues/5948))

### New Features

* **license:** support license records without token field ([#6216](https://github.com/labring/sealos/issues/6216))
* **desktop:** add license check with configurable switch ([#6210](https://github.com/labring/sealos/issues/6210))
* **desktop:** enhance error logging and improve workspace lock error ([#6183](https://github.com/labring/sealos/issues/6183))
* **vlogs:** Remove the decolor query. ([#6202](https://github.com/labring/sealos/issues/6202))
* **dbprovider:** restrict timezone parameter to utc/cst ([#6187](https://github.com/labring/sealos/issues/6187))
* **configmap:** add AI_PROXY_BACKEND for dynamic proxy URL configuration ([#6194](https://github.com/labring/sealos/issues/6194))
* **costcenter:** recharge bonus tags ([#6193](https://github.com/labring/sealos/issues/6193))
* **vlogs:** add vlogs keywords escape. ([#6181](https://github.com/labring/sealos/issues/6181))
* **devbox:** add startup configmap synchronization and volume management ([#6172](https://github.com/labring/sealos/issues/6172))
* **applaunchpad:** add container statuses to pods list ([#6169](https://github.com/labring/sealos/issues/6169))
* **config:** add TRAFFIC_MONGO_URI to account manager configuration ([#6167](https://github.com/labring/sealos/issues/6167))
* **template:** optimize template API with README cache and env control ([#6161](https://github.com/labring/sealos/issues/6161))
* **auth:** unified userType determination based on subscriptionEnabled ([#6145](https://github.com/labring/sealos/issues/6145))
* **account:** add manager workspace subscription api ([#6128](https://github.com/labring/sealos/issues/6128))
* **applaunchpad:** i18n for log table header ([#6140](https://github.com/labring/sealos/issues/6140))

See [the CHANGELOG](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md) for more details.

Your patronage towards Sealos is greatly appreciated 🎉🎉.

If you encounter any problems during its usage, please create an issue in the [GitHub repository](https://github.com/labring/sealos), we're committed to resolving your problem as soon as possible.
