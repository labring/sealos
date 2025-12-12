use dashmap::DashMap;
use tracing::{debug, info};

/// Information about a registered devbox (from Devbox CRD)
#[derive(Debug, Clone)]
pub struct DevboxInfo {
    pub namespace: String,
    pub devbox_name: String,
}

/// Thread-safe registry for devbox routing information.
///
/// Maintains two independent indices:
/// - `uniqueID -> DevboxInfo` (managed by Devbox watcher)
/// - `namespace/devbox_name -> pod_ip` (managed by Pod watcher)
///
/// The two watchers are completely isolated and can operate independently.
pub struct DevboxRegistry {
    /// Devbox index: uniqueID -> `DevboxInfo` (namespace, devbox_name)
    by_unique_id: DashMap<String, DevboxInfo>,
    /// Pod index: `namespace/devbox_name` -> pod_ip
    pod_ips: DashMap<String, String>,
}

impl DevboxRegistry {
    pub fn new() -> Self {
        Self {
            by_unique_id: DashMap::new(),
            pod_ips: DashMap::new(),
        }
    }

    // ========================================================================
    // Devbox CRD operations (used by DevboxWatcher)
    // ========================================================================

    /// Register a devbox from Devbox CRD.
    ///
    /// Called by Devbox CRD watcher when a Devbox is created/updated.
    /// Returns `true` if this is a new entry.
    pub fn register_devbox(
        &self,
        unique_id: String,
        namespace: String,
        devbox_name: String,
    ) -> bool {
        let is_new = !self.by_unique_id.contains_key(&unique_id);

        self.by_unique_id.insert(
            unique_id,
            DevboxInfo {
                namespace,
                devbox_name,
            },
        );

        is_new
    }

    /// Unregister a devbox by its `unique_id`.
    ///
    /// Called by Devbox CRD watcher when a Devbox is deleted.
    pub fn unregister_devbox(&self, unique_id: &str) -> bool {
        self.by_unique_id.remove(unique_id).is_some()
    }

    /// Clear all devbox entries (used during Devbox watcher re-initialization).
    pub fn clear_devboxes(&self) {
        self.by_unique_id.clear();
        debug!("Devbox registry cleared");
    }

    /// Look up a devbox by `unique_id`.
    ///
    /// Returns a clone of the `DevboxInfo` to avoid holding any locks.
    pub fn get_devbox(&self, unique_id: &str) -> Option<DevboxInfo> {
        self.by_unique_id.get(unique_id).map(|r| r.value().clone())
    }

    /// Get the current number of registered devboxes.
    pub fn devbox_count(&self) -> usize {
        self.by_unique_id.len()
    }

    // ========================================================================
    // Pod operations (used by PodWatcher)
    // ========================================================================

    /// Update Pod IP for a devbox.
    ///
    /// Called by Pod watcher when a Pod is created/updated.
    /// If `pod_ip` is empty, the entry is removed.
    pub fn update_pod_ip(&self, namespace: &str, devbox_name: &str, pod_ip: String) {
        if pod_ip.is_empty() {
            self.clear_pod_ip(namespace, devbox_name);
            return;
        }

        let devbox_key = format!("{namespace}/{devbox_name}");
        let old_ip = self.pod_ips.insert(devbox_key, pod_ip.clone());

        if old_ip.as_ref() != Some(&pod_ip) {
            info!(
                namespace = %namespace,
                devbox_name = %devbox_name,
                pod_ip = %pod_ip,
                "Pod IP updated"
            );
        }
    }

    /// Clear Pod IP for a devbox.
    ///
    /// Called by Pod watcher when a Pod is deleted.
    pub fn clear_pod_ip(&self, namespace: &str, devbox_name: &str) {
        let devbox_key = format!("{namespace}/{devbox_name}");
        if self.pod_ips.remove(&devbox_key).is_some() {
            info!(
                namespace = %namespace,
                devbox_name = %devbox_name,
                "Pod IP cleared"
            );
        }
    }

    /// Clear all pod IP entries (used during Pod watcher re-initialization).
    pub fn clear_pod_ips(&self) {
        self.pod_ips.clear();
        debug!("Pod IP registry cleared");
    }

    /// Get Pod IP for a devbox.
    pub fn get_pod_ip(&self, namespace: &str, devbox_name: &str) -> Option<String> {
        let devbox_key = format!("{namespace}/{devbox_name}");
        self.pod_ips.get(&devbox_key).map(|r| r.value().clone())
    }

    /// Get the current number of registered pod IPs.
    pub fn pod_ip_count(&self) -> usize {
        self.pod_ips.len()
    }
}

impl Default for DevboxRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn test_register_and_get_devbox() {
        let registry = DevboxRegistry::new();
        registry.register_devbox(
            "unique-123".to_string(),
            "ns-test".to_string(),
            "devbox1".to_string(),
        );

        let info = registry.get_devbox("unique-123").unwrap();
        assert_eq!(info.namespace, "ns-test");
        assert_eq!(info.devbox_name, "devbox1");
    }

    #[test]
    fn test_update_pod_ip() {
        let registry = DevboxRegistry::new();

        // Pod IP can be set independently of devbox registration
        registry.update_pod_ip("ns-test", "devbox1", "10.0.0.1".to_string());

        let pod_ip = registry.get_pod_ip("ns-test", "devbox1");
        assert_eq!(pod_ip, Some("10.0.0.1".to_string()));
    }

    #[test]
    fn test_clear_pod_ip() {
        let registry = DevboxRegistry::new();
        registry.update_pod_ip("ns-test", "devbox1", "10.0.0.1".to_string());

        // Clear pod IP
        registry.clear_pod_ip("ns-test", "devbox1");

        let pod_ip = registry.get_pod_ip("ns-test", "devbox1");
        assert!(pod_ip.is_none());
    }

    #[test]
    fn test_unregister_devbox() {
        let registry = DevboxRegistry::new();
        registry.register_devbox(
            "unique-123".to_string(),
            "ns-test".to_string(),
            "devbox1".to_string(),
        );

        assert!(registry.unregister_devbox("unique-123"));
        assert!(registry.get_devbox("unique-123").is_none());
        assert!(!registry.unregister_devbox("unique-123")); // Already removed
    }

    #[test]
    fn test_indices_are_independent() {
        let registry = DevboxRegistry::new();

        // Register devbox
        registry.register_devbox(
            "unique-123".to_string(),
            "ns-test".to_string(),
            "devbox1".to_string(),
        );

        // Update pod IP (independent operation)
        registry.update_pod_ip("ns-test", "devbox1", "10.0.0.1".to_string());

        // Both should exist
        assert!(registry.get_devbox("unique-123").is_some());
        assert_eq!(
            registry.get_pod_ip("ns-test", "devbox1"),
            Some("10.0.0.1".to_string())
        );

        // Unregister devbox - pod IP should still exist
        registry.unregister_devbox("unique-123");
        assert!(registry.get_devbox("unique-123").is_none());
        assert_eq!(
            registry.get_pod_ip("ns-test", "devbox1"),
            Some("10.0.0.1".to_string())
        );

        // Clear pod IP - devbox should still not exist
        registry.clear_pod_ip("ns-test", "devbox1");
        assert!(registry.get_pod_ip("ns-test", "devbox1").is_none());
    }

    #[test]
    fn test_clear_devboxes() {
        let registry = DevboxRegistry::new();
        registry.register_devbox(
            "id-1".to_string(),
            "ns-1".to_string(),
            "devbox1".to_string(),
        );
        registry.register_devbox(
            "id-2".to_string(),
            "ns-2".to_string(),
            "devbox2".to_string(),
        );
        registry.update_pod_ip("ns-1", "devbox1", "10.0.0.1".to_string());

        assert_eq!(registry.devbox_count(), 2);
        registry.clear_devboxes();
        assert_eq!(registry.devbox_count(), 0);

        // Pod IPs should be unaffected
        assert_eq!(
            registry.get_pod_ip("ns-1", "devbox1"),
            Some("10.0.0.1".to_string())
        );
    }

    #[test]
    fn test_clear_pod_ips() {
        let registry = DevboxRegistry::new();
        registry.register_devbox(
            "id-1".to_string(),
            "ns-1".to_string(),
            "devbox1".to_string(),
        );
        registry.update_pod_ip("ns-1", "devbox1", "10.0.0.1".to_string());
        registry.update_pod_ip("ns-2", "devbox2", "10.0.0.2".to_string());

        assert_eq!(registry.pod_ip_count(), 2);
        registry.clear_pod_ips();
        assert_eq!(registry.pod_ip_count(), 0);

        // Devboxes should be unaffected
        assert!(registry.get_devbox("id-1").is_some());
    }

    #[test]
    fn test_concurrent_devbox_writes() {
        let registry = Arc::new(DevboxRegistry::new());
        let mut handles = vec![];

        // Spawn 100 threads, each registering a unique entry
        for i in 0..100 {
            let reg = Arc::clone(&registry);
            handles.push(thread::spawn(move || {
                reg.register_devbox(format!("id-{i}"), format!("ns-{i}"), format!("devbox-{i}"));
            }));
        }

        for h in handles {
            h.join().unwrap();
        }

        // All 100 entries should be present
        assert_eq!(registry.devbox_count(), 100);

        for i in 0..100 {
            let info = registry.get_devbox(&format!("id-{i}")).unwrap();
            assert_eq!(info.namespace, format!("ns-{i}"));
        }
    }

    #[test]
    fn test_concurrent_pod_ip_writes() {
        let registry = Arc::new(DevboxRegistry::new());
        let mut handles = vec![];

        // Spawn 100 threads, each updating a pod IP
        for i in 0..100 {
            let reg = Arc::clone(&registry);
            handles.push(thread::spawn(move || {
                reg.update_pod_ip(
                    &format!("ns-{i}"),
                    &format!("devbox-{i}"),
                    format!("10.0.0.{i}"),
                );
            }));
        }

        for h in handles {
            h.join().unwrap();
        }

        // All 100 pod IPs should be present
        assert_eq!(registry.pod_ip_count(), 100);
    }

    #[test]
    fn test_concurrent_mixed_operations() {
        let registry = Arc::new(DevboxRegistry::new());

        // Pre-populate devboxes
        for i in 0..50 {
            registry.register_devbox(format!("id-{i}"), format!("ns-{i}"), format!("devbox-{i}"));
        }

        let mut handles = vec![];

        // Devbox writers
        for i in 50..100 {
            let reg = Arc::clone(&registry);
            handles.push(thread::spawn(move || {
                reg.register_devbox(format!("id-{i}"), format!("ns-{i}"), format!("devbox-{i}"));
            }));
        }

        // Pod IP writers
        for i in 0..100 {
            let reg = Arc::clone(&registry);
            handles.push(thread::spawn(move || {
                reg.update_pod_ip(
                    &format!("ns-{i}"),
                    &format!("devbox-{i}"),
                    format!("10.0.0.{i}"),
                );
            }));
        }

        // Readers
        for i in 0..50 {
            let reg = Arc::clone(&registry);
            handles.push(thread::spawn(move || {
                // Should always find pre-populated devbox entries
                assert!(reg.get_devbox(&format!("id-{i}")).is_some());
            }));
        }

        for h in handles {
            h.join().unwrap();
        }

        assert_eq!(registry.devbox_count(), 100);
        assert_eq!(registry.pod_ip_count(), 100);
    }
}
