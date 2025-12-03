use std::sync::Arc;

use futures::StreamExt;
use k8s_openapi::api::core::v1::Pod;
use kube::{
    api::Api,
    config::{KubeConfigOptions, Kubeconfig},
    runtime::{watcher, watcher::Event, WatchStreamExt},
    Client, Config,
};
use tracing::{debug, error, info, warn};

use crate::{crd::Devbox, error::Result, registry::DevboxRegistry};

/// Label used to identify devbox pods
const DEVBOX_PART_OF_LABEL: &str = "app.kubernetes.io/part-of";
const DEVBOX_PART_OF_VALUE: &str = "devbox";

/// OwnerReference kind for devbox
const DEVBOX_OWNER_KIND: &str = "Devbox";

/// Create a Kubernetes client.
///
/// Priority:
/// 1. KUBECONFIG environment variable (if set)
/// 2. In-cluster config (if running in K8s)
/// 3. Default kubeconfig
pub async fn create_client() -> Result<Client> {
    if let Ok(kubeconfig_path) = std::env::var("KUBECONFIG") {
        info!(path = %kubeconfig_path, "Using KUBECONFIG from environment");
        let kubeconfig = Kubeconfig::read_from(&kubeconfig_path)
            .map_err(|e| crate::error::Error::Config(format!("Failed to read KUBECONFIG: {e}")))?;
        let config = Config::from_custom_kubeconfig(kubeconfig, &KubeConfigOptions::default())
            .await
            .map_err(|e| crate::error::Error::Config(format!("Failed to parse KUBECONFIG: {e}")))?;
        return Ok(Client::try_from(config)?);
    }

    // Try in-cluster config first, then fall back to default kubeconfig
    if let Ok(config) = Config::incluster() {
        info!("Using in-cluster Kubernetes config");
        Ok(Client::try_from(config)?)
    } else {
        info!("Using default kubeconfig");
        Ok(Client::try_default().await?)
    }
}

// ============================================================================
// Devbox CRD Watcher
// ============================================================================

/// Kubernetes watcher for Devbox CRD resources.
///
/// Watches all Devbox CRDs across all namespaces and maintains
/// a registry of uniqueID -> (namespace, devbox_name) mappings.
pub struct DevboxWatcher {
    registry: Arc<DevboxRegistry>,
}

impl DevboxWatcher {
    pub const fn new(registry: Arc<DevboxRegistry>) -> Self {
        Self { registry }
    }

    /// Start watching Devbox resources.
    ///
    /// This function runs indefinitely, processing watch events.
    /// It should be spawned as a background task.
    pub async fn run(&self) -> Result<()> {
        let client = create_client().await?;
        let devboxes: Api<Devbox> = Api::all(client);

        info!("Starting Devbox CRD watcher");

        let watcher_config = watcher::Config::default();
        let mut stream = watcher(devboxes, watcher_config).default_backoff().boxed();

        while let Some(event) = stream.next().await {
            self.handle_event(event);
        }

        warn!("Devbox CRD watcher stream ended unexpectedly");
        Ok(())
    }

    fn handle_event(&self, event: std::result::Result<Event<Devbox>, watcher::Error>) {
        match event {
            Ok(Event::Apply(devbox) | Event::InitApply(devbox)) => {
                self.handle_apply(&devbox);
            }
            Ok(Event::Delete(devbox)) => {
                self.handle_delete(&devbox);
            }
            Ok(Event::Init) => {
                info!("Devbox watcher initializing, clearing devbox registry");
                self.registry.clear_devboxes();
            }
            Ok(Event::InitDone) => {
                info!(
                    count = self.registry.devbox_count(),
                    "Devbox watcher initialization complete"
                );
            }
            Err(e) => {
                error!(error = %e, "Devbox watcher error");
            }
        }
    }

    fn handle_apply(&self, devbox: &Devbox) {
        let Some(unique_id) = devbox.unique_id() else {
            warn!(
                namespace = ?devbox.metadata.namespace,
                name = ?devbox.metadata.name,
                "Devbox has no unique_id, skipping"
            );
            return;
        };

        let Some(namespace) = devbox.metadata.namespace.as_ref() else {
            warn!(
                name = ?devbox.metadata.name,
                "Devbox has no namespace, skipping"
            );
            return;
        };

        let Some(devbox_name) = devbox.metadata.name.as_ref() else {
            warn!(
                namespace = %namespace,
                "Devbox has no name, skipping"
            );
            return;
        };

        let is_new = self.registry.register_devbox(
            unique_id.to_string(),
            namespace.clone(),
            devbox_name.clone(),
        );

        if is_new {
            info!(
                unique_id = %unique_id,
                namespace = %namespace,
                devbox_name = %devbox_name,
                "Devbox registered"
            );
        }
    }

    fn handle_delete(&self, devbox: &Devbox) {
        if let Some(unique_id) = devbox.unique_id() {
            if self.registry.unregister_devbox(unique_id) {
                info!(unique_id = %unique_id, "Devbox unregistered");
            }
        }
    }
}

// ============================================================================
// Pod Watcher
// ============================================================================

/// Kubernetes watcher for Devbox Pods.
///
/// Watches all Pods with label `app.kubernetes.io/part-of=devbox` across all namespaces
/// and updates the registry with Pod IP information.
pub struct PodWatcher {
    registry: Arc<DevboxRegistry>,
}

impl PodWatcher {
    pub const fn new(registry: Arc<DevboxRegistry>) -> Self {
        Self { registry }
    }

    /// Start watching Devbox Pods.
    ///
    /// This function runs indefinitely, processing watch events.
    /// It should be spawned as a background task.
    pub async fn run(&self) -> Result<()> {
        let client = create_client().await?;
        let pods: Api<Pod> = Api::all(client);

        info!("Starting Pod watcher for devbox pods");

        // Filter pods by label: app.kubernetes.io/part-of=devbox
        let label_selector = format!("{DEVBOX_PART_OF_LABEL}={DEVBOX_PART_OF_VALUE}");
        let watcher_config = watcher::Config::default().labels(&label_selector);

        let mut stream = watcher(pods, watcher_config).default_backoff().boxed();

        while let Some(event) = stream.next().await {
            self.handle_event(event);
        }

        warn!("Pod watcher stream ended unexpectedly");
        Ok(())
    }

    fn handle_event(&self, event: std::result::Result<Event<Pod>, watcher::Error>) {
        match event {
            Ok(Event::Apply(pod) | Event::InitApply(pod)) => {
                self.handle_apply(&pod);
            }
            Ok(Event::Delete(pod)) => {
                self.handle_delete(&pod);
            }
            Ok(Event::Init) => {
                info!("Pod watcher initializing, clearing pod IP registry");
                self.registry.clear_pod_ips();
            }
            Ok(Event::InitDone) => {
                info!(
                    count = self.registry.pod_ip_count(),
                    "Pod watcher initialization complete"
                );
            }
            Err(e) => {
                error!(error = %e, "Pod watcher error");
            }
        }
    }

    fn handle_apply(&self, pod: &Pod) {
        let Some(namespace) = pod.metadata.namespace.as_ref() else {
            warn!(name = ?pod.metadata.name, "Pod has no namespace, skipping");
            return;
        };

        // Get devbox name from OwnerReference
        let Some(devbox_name) = Self::get_devbox_name(pod) else {
            debug!(
                namespace = %namespace,
                pod_name = ?pod.metadata.name,
                "Pod has no Devbox owner, skipping"
            );
            return;
        };

        // Get pod IP from status (may be empty if Pod is not running)
        let pod_ip = pod
            .status
            .as_ref()
            .and_then(|s| s.pod_ip.clone())
            .unwrap_or_default();

        self.registry.update_pod_ip(namespace, &devbox_name, pod_ip);
    }

    fn handle_delete(&self, pod: &Pod) {
        let Some(namespace) = pod.metadata.namespace.as_ref() else {
            return;
        };

        if let Some(devbox_name) = Self::get_devbox_name(pod) {
            self.registry.clear_pod_ip(namespace, &devbox_name);
        }
    }

    /// Extract devbox name from `OwnerReferences`.
    ///
    /// Looks for an `OwnerReference` with kind "Devbox" and returns its name.
    fn get_devbox_name(pod: &Pod) -> Option<String> {
        pod.metadata
            .owner_references
            .as_ref()?
            .iter()
            .find(|r| r.kind == DEVBOX_OWNER_KIND)
            .map(|r| r.name.clone())
    }
}
