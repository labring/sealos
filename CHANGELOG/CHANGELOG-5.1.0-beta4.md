
# Welcome to the v5.1.0-beta4 release of Sealos!🎉🎉!

<a name="v5.1.0-beta4"></a>
## [v5.1.0-beta4](https://github.com/labring/sealos/compare/v5.1.0-beta3...v5.1.0-beta4) (2025-09-15)

### Bug Fixes

* **release:** update CI runner to Ubuntu 22.04 ([#5985](https://github.com/labring/sealos/issues/5985))
* **template:** app card title line incorrectly wraps ([#5984](https://github.com/labring/sealos/issues/5984))
* **kubepanel:** fix Monaco Editor SSR and CDN issues ([#5982](https://github.com/labring/sealos/issues/5982))
* **checker:** update time synchronization check and add CockroachDB max offset configuration ([#5981](https://github.com/labring/sealos/issues/5981))
* **config:** use local variable for registry domain normalization ([#5980](https://github.com/labring/sealos/issues/5980))
* **build:** add platform validation for amd64 and arm64 builds in Makefile ([#5976](https://github.com/labring/sealos/issues/5976))
* **changelog:** update installation script reference for release version handling ([#5971](https://github.com/labring/sealos/issues/5971))
* **helm:** update payment secrets handling and add missing certificate files ([#5969](https://github.com/labring/sealos/issues/5969))
* **devbox:** adjust privacy document url en ([#5941](https://github.com/labring/sealos/issues/5941))
* **deploy:** set default value for NODE_TLS_REJECT_UNAUTHORIZED to "1" ([#5966](https://github.com/labring/sealos/issues/5966))
* **cloud:** fix mirror images for base images and cloud script v2 ([#5950](https://github.com/labring/sealos/issues/5950))
* **deploy:** update configMap reference for devbox environment ([#5949](https://github.com/labring/sealos/issues/5949))
* **env:** add loggerfile variable to environment template ([#5947](https://github.com/labring/sealos/issues/5947))
* **images:** improve logging and streamline command execution ([#5946](https://github.com/labring/sealos/issues/5946))
* **init.sh:** wait for desktop-frontend pods to be in Running state ([#5943](https://github.com/labring/sealos/issues/5943))
* **desktop:** guide order incorrect if some apps are not installed ([#5930](https://github.com/labring/sealos/issues/5930))
* **devbox:** remove init container and add migration job for database deployment ([#5934](https://github.com/labring/sealos/issues/5934))
* **release:** update runner version to Ubuntu 20.04 ([#5929](https://github.com/labring/sealos/issues/5929))
* **ci:** exclude deploy/base directory from link checking to prevent third-party dependency issues ([#5928](https://github.com/labring/sealos/issues/5928))

### New Features

* **dbprovider:** applied parameter configuration & added mysql-5.7.42 & added addon api ([#5862](https://github.com/labring/sealos/issues/5862))
* **devbox:** add some ide support ([#5940](https://github.com/labring/sealos/issues/5940))
* **service:** add Hubble service to enhance observability ([#5729](https://github.com/labring/sealos/issues/5729))
* **config:** add allowed origins for cloud domain in configmap ([#5974](https://github.com/labring/sealos/issues/5974))
* **proxy:** add proxy support for image pulling in build-offline-tar.sh ([#5968](https://github.com/labring/sealos/issues/5968))
* **desktop:** join discord prompt ([#5967](https://github.com/labring/sealos/issues/5967))
* **images:** refactor installation process and clean up unused functions for cloud ([#5954](https://github.com/labring/sealos/issues/5954))
* **images:** add cloud v2 image ([#5965](https://github.com/labring/sealos/issues/5965))
* **launchpad:** update log api ([#5964](https://github.com/labring/sealos/issues/5964))
* **devbox:** remove job devbox to init db ([#5963](https://github.com/labring/sealos/issues/5963))
* **deploy:** add NODE_TLS_REJECT_UNAUTHORIZED environment variable to frontend containers ([#5958](https://github.com/labring/sealos/issues/5958))
* **docs:** add README files for Higress, Kubernetes, and OpenEBS with usage instructions ([#5937](https://github.com/labring/sealos/issues/5937))
* **rbac:** add permissions for backup repositories in cluster role ([#5939](https://github.com/labring/sealos/issues/5939))
* **chart:** add cloud base image and remove unused scripts ([#5936](https://github.com/labring/sealos/issues/5936))
* **app:** fix miss config for yaml ([#5932](https://github.com/labring/sealos/issues/5932))
* **applaunchpad:** add configurable log feature toggle ([#5933](https://github.com/labring/sealos/issues/5933))

See [the CHANGELOG](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md) for more details.

Your patronage towards Sealos is greatly appreciated 🎉🎉.

If you encounter any problems during its usage, please create an issue in the [GitHub repository](https://github.com/labring/sealos), we're committed to resolving your problem as soon as possible.
