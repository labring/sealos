
# Welcome to the v5.1.2 release of Sealos!🎉🎉!

<a name="v5.1.2"></a>
## [v5.1.2](https://github.com/labring/sealos/compare/v5.1.2-rc6...v5.1.2) (2026-11-18)

### Bug Fixes

* **account:** bound the debt-suspend pod recreate wait and strip tena… ([#7429](https://github.com/labring/sealos/issues/7429))
* **user:** reserved names ([#7430](https://github.com/labring/sealos/issues/7430))
* **cloud:** wait for deployment resources correctly ([#7428](https://github.com/labring/sealos/issues/7428))
* **lifecycle:** run patch image commands on standalone control-plane hosts ([#7419](https://github.com/labring/sealos/issues/7419))
* **cloud:** defer component readiness checks ([#7415](https://github.com/labring/sealos/issues/7415))
* **webhooks:** remove Helm deployment timeouts ([#7413](https://github.com/labring/sealos/issues/7413))
* **cloud:** configure deployment wait timeouts ([#7411](https://github.com/labring/sealos/issues/7411))
* **costcenter:** aggregate quota across selected workspaces ([#7404](https://github.com/labring/sealos/issues/7404))
* **account:** use CERT_MODE to send the schema for the "refresh the status of pending resources" request. ([#7406](https://github.com/labring/sealos/issues/7406))
* **desktop:** refresh and hide read notifications ([#7401](https://github.com/labring/sealos/issues/7401))
* **desktop:** add native client workspace quota endpoint ([#7402](https://github.com/labring/sealos/issues/7402))
* **desktop:** backport OAuth consent localization to release-v5.1 ([#7400](https://github.com/labring/sealos/issues/7400))
* **user:** add user-controller default values ([#7399](https://github.com/labring/sealos/issues/7399))
* **desktop:** initialize workspace registry credentials ([#7389](https://github.com/labring/sealos/issues/7389))
* **costcenter:** standardize Feishu app config key ([#7386](https://github.com/labring/sealos/issues/7386))
* **upgrade:** run cordon through the bootstrap master's kubeconfig ([#7370](https://github.com/labring/sealos/issues/7370))
* **admission:** allow ns-admin to correct resource creators ([#7350](https://github.com/labring/sealos/issues/7350))
* **Kubefile:** disable resource creator webhook by default ([#7348](https://github.com/labring/sealos/issues/7348))
* **lifecycle:** stop distributing admin kubeconfigs to nodes ([#7343](https://github.com/labring/sealos/issues/7343))
* **values:** disable Kafka integration in frontend configuration ([#7342](https://github.com/labring/sealos/issues/7342))
* **license:** clear stale expiration alerts after renewal ([#7339](https://github.com/labring/sealos/issues/7339))
* **costcenter:** add Workspace ID filtering ([#7336](https://github.com/labring/sealos/issues/7336))
* **applaunchpad:** skip unchanged configuration saves ([#7332](https://github.com/labring/sealos/issues/7332))
* **applaunchpad:** preserve storage updates and restart prompts ([#7331](https://github.com/labring/sealos/issues/7331))
* **template:** show paused app status ([#7323](https://github.com/labring/sealos/issues/7323))
* **applaunchpad:** preserve ClusterIP service names ([#7329](https://github.com/labring/sealos/issues/7329))
* **account:** monitor admin workspace objectstorage ([#7325](https://github.com/labring/sealos/issues/7325))
* **applaunchpad:** accept resolved public route responses ([#7322](https://github.com/labring/sealos/issues/7322))
* **applaunchpad:** localize pod log time option ([#7321](https://github.com/labring/sealos/issues/7321))
* **applaunchpad:** guard pod file writes by exec access ([#7312](https://github.com/labring/sealos/issues/7312))
* **resources:** bind monitor lifecycle to manager leadership ([#7320](https://github.com/labring/sealos/issues/7320))
* **account:** run workspace tasks only on the elected leader ([#7319](https://github.com/labring/sealos/issues/7319))
* **account:** close payment watches and await worker shutdown ([#7310](https://github.com/labring/sealos/issues/7310))
* **resources:** handle completed pods without a start time ([#7309](https://github.com/labring/sealos/issues/7309))
* **account:** prevent consumption amount double counting ([#7307](https://github.com/labring/sealos/issues/7307))
* **dbprovider:** resolve direct connection pod ([#7239](https://github.com/labring/sealos/issues/7239))
* **account:** expose startup and readiness probes ([#7300](https://github.com/labring/sealos/issues/7300))
* **account:** prevent stale webhook balance cache from being renewed ([#7298](https://github.com/labring/sealos/issues/7298))
* **desktop:** persist user language preference ([#7285](https://github.com/labring/sealos/issues/7285))
* **logs:** normalize VLogs query timestamps ([#7286](https://github.com/labring/sealos/issues/7286))
* **account:** load admin JWT secret in legacy deployment ([#7295](https://github.com/labring/sealos/issues/7295))
* **template:** localize application status labels ([#7283](https://github.com/labring/sealos/issues/7283))
* **frontend:** narrow GiB labels to reported surfaces ([#7249](https://github.com/labring/sealos/issues/7249))
* **account:** allow patching user annotations ([#7277](https://github.com/labring/sealos/issues/7277))
* **account:** enforce suspended namespace webhook ([#7274](https://github.com/labring/sealos/issues/7274))
* **clusterrole:** expand permissions for kube-system namespace ([#7265](https://github.com/labring/sealos/issues/7265))
* **clusterrole:** expand permissions for kube-system namespace ([#7262](https://github.com/labring/sealos/issues/7262))
* **user:** avoid full User objects in webhook validation ([#7251](https://github.com/labring/sealos/issues/7251))
* **account:** cherry-pick main ([#7235](https://github.com/labring/sealos/issues/7235))
* **dbprovider:** flatten reconfigure history parameters ([#7246](https://github.com/labring/sealos/issues/7246))

### Code Refactoring

* **lifecycle:** make the Clusterfile authoritative for standalone operations ([#7427](https://github.com/labring/sealos/issues/7427))
* **service:** remove launchpad and database monitors ([#7394](https://github.com/labring/sealos/issues/7394))
* **applaunchpad:** remove extracted frontend ([#7355](https://github.com/labring/sealos/issues/7355))
* **dbprovider:** remove extracted provider ([#7353](https://github.com/labring/sealos/issues/7353))
* **template:** extract app store frontend ([#7316](https://github.com/labring/sealos/issues/7316))
* **user:** reduce controller memory and harden namespace security ([#7281](https://github.com/labring/sealos/issues/7281))

### New Features

* **desktop:** make header balance label configurable ([#7439](https://github.com/labring/sealos/issues/7439))
* **desktop:** add runtime toggle for kubeconfig menu ([#7420](https://github.com/labring/sealos/issues/7420))
* **lifecycle:** standalone control plane lifecycle ([#7416](https://github.com/labring/sealos/issues/7416))
* **cloud:** add component cluster image deployment ([#7390](https://github.com/labring/sealos/issues/7390))
* **desktop:** register built-in Sealox OAuth client ([#7392](https://github.com/labring/sealos/issues/7392))
* **webhooks:** add Helm deployment for admission and stargz ([#7372](https://github.com/labring/sealos/issues/7372))
* **desktop:** add oauth2 workspaces resource endpoint ([#7371](https://github.com/labring/sealos/issues/7371))
* **desktop:** backport OAuth device and PKCE flows to release-v5.1 ([#7368](https://github.com/labring/sealos/issues/7368))
* **desktop:** expose host currency symbol on release-v5.1 ([#7364](https://github.com/labring/sealos/issues/7364))
* **account:** expose initial balance policy endpoint ([#7341](https://github.com/labring/sealos/issues/7341))
* **account:** record and protect resource creator annotations ([#7337](https://github.com/labring/sealos/issues/7337))
* **account:** add admin notification recipients API ([#7290](https://github.com/labring/sealos/issues/7290))
* **app:** support version field in App CRD ([#7279](https://github.com/labring/sealos/issues/7279))
* **account:** expose admin account read APIs ([#7220](https://github.com/labring/sealos/issues/7220)) , cherry-pick [#7220](https://github.com/labring/sealos/issues/7220) ([#7252](https://github.com/labring/sealos/issues/7252))

### Performance Improvements

* **account:** add startup stage timing logs ([#7308](https://github.com/labring/sealos/issues/7308))
* **account:** optimize consumption amount aggregation ([#7297](https://github.com/labring/sealos/issues/7297))
* **account:** optimize workspace consumption aggregation ([#7291](https://github.com/labring/sealos/issues/7291))
* **account:** reduce controller cache memory usage ([#7272](https://github.com/labring/sealos/issues/7272))
* **user:** reduce controller cache memory usage ([#7271](https://github.com/labring/sealos/issues/7271))
* **resources:** reduce controller cache memory ([#7270](https://github.com/labring/sealos/issues/7270))
* **license:** reduce controller cache memory ([#7269](https://github.com/labring/sealos/issues/7269))

See [the CHANGELOG](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md) for more details.

Your patronage towards Sealos is greatly appreciated 🎉🎉.

If you encounter any problems during its usage, please create an issue in the [GitHub repository](https://github.com/labring/sealos), we're committed to resolving your problem as soon as possible.
