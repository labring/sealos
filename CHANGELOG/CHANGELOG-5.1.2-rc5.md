
# Welcome to the v5.1.2-rc5 release of Sealos!🎉🎉!

<a name="v5.1.2-rc5"></a>
## [v5.1.2-rc5](https://github.com/labring/sealos/compare/v5.1.2-rc4...v5.1.2-rc5) (2026-03-26)

### Bug Fixes

* **lifecycle:** fallback registry sync for oci media type ([#6842](https://github.com/labring/sealos/issues/6842))
* **account:** helm install name ([#6844](https://github.com/labring/sealos/issues/6844))
* **deploy:** change command to execute install script instead of kube… ([#6839](https://github.com/labring/sealos/issues/6839))
* **account-service:** add ingress resource adoption and create instal… ([#6833](https://github.com/labring/sealos/issues/6833))
* **user:** Fix the concurrent creation restriction exception for user controller ([#6829](https://github.com/labring/sealos/issues/6829))
* **account-webhook:** remove cache ([#6828](https://github.com/labring/sealos/issues/6828))
* **applaunchpad:** fix command text overflow in app detail advanced info ([#6825](https://github.com/labring/sealos/issues/6825))
* **devbox:** some little bug ([#6823](https://github.com/labring/sealos/issues/6823))
* **devbox:** some quota bug ([#6820](https://github.com/labring/sealos/issues/6820))
* **template:** [backport] pvc not get deleted in the new deletion flow ([#6821](https://github.com/labring/sealos/issues/6821))
* **applaunchpad:** floor storage maxValue ([#6813](https://github.com/labring/sealos/issues/6813))
* **desktop:** i18n login form validation messages ([#6812](https://github.com/labring/sealos/issues/6812))
* **lifecycle:** clear stale registry auth when saving public images ([#6810](https://github.com/labring/sealos/issues/6810))
* **account:** skip the validate webhook for admin account ([#6806](https://github.com/labring/sealos/issues/6806))
* **user-controller:** update namespace condition to exclude 'ns-admin' ([#6800](https://github.com/labring/sealos/issues/6800))
* **devbox:** date picker cause bug ([#6798](https://github.com/labring/sealos/issues/6798))
* **license:** license limit prompt translation ([#6797](https://github.com/labring/sealos/issues/6797))
* **devbox:** refresh bug and nfs mount path bug ([#6793](https://github.com/labring/sealos/issues/6793))

### New Features

* **desktop:** support auto-register and auto-init in password auth API ([#6840](https://github.com/labring/sealos/issues/6840))
* **template:** add NodePort two-phase deploy API ([#6824](https://github.com/labring/sealos/issues/6824))
* **applaunchpad:** add network storage (networkStoreList) support ([#6811](https://github.com/labring/sealos/issues/6811))
* **desktop:** [backport] support overriding icon size style in app cr ([#6817](https://github.com/labring/sealos/issues/6817))
* **lifecycle:** sealos registry support image filter and --all flags to image save ([#6805](https://github.com/labring/sealos/issues/6805))
* **desktop:** validate kubeconfig on desktop load ([#6791](https://github.com/labring/sealos/issues/6791))
* **desktop:** add PKCE (S256) support for OAuth2 authentication ([#6790](https://github.com/labring/sealos/issues/6790))

See [the CHANGELOG](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md) for more details.

Your patronage towards Sealos is greatly appreciated 🎉🎉.

If you encounter any problems during its usage, please create an issue in the [GitHub repository](https://github.com/labring/sealos), we're committed to resolving your problem as soon as possible.
