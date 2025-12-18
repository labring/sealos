//! Partial Kubernetes objects for reduced memory footprint.
//!
//! These types only include the fields needed for routing,
//! significantly reducing memory usage compared to full objects.

use k8s_openapi::apimachinery::pkg::apis::meta::v1::ObjectMeta;
use kube::api::Resource;
use serde::{Deserialize, Serialize};

/// Partial Pod object containing only fields needed for routing.
///
/// This reduces memory usage by ~70-80% compared to full Pod objects
/// by excluding spec, containers, volumes, and other unused fields.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct PartialPod {
    pub metadata: ObjectMeta,
    #[serde(default)]
    pub status: Option<PartialPodStatus>,
}

/// Partial Pod status containing only the pod IP.
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct PartialPodStatus {
    /// Pod IP address (JSON field is "podIP" with uppercase IP)
    #[serde(default, rename = "podIP")]
    pub pod_ip: Option<String>,
}

impl Resource for PartialPod {
    type DynamicType = ();
    type Scope = k8s_openapi::NamespaceResourceScope;

    fn kind((): &Self::DynamicType) -> std::borrow::Cow<'_, str> {
        std::borrow::Cow::Borrowed("Pod")
    }

    fn group((): &Self::DynamicType) -> std::borrow::Cow<'_, str> {
        std::borrow::Cow::Borrowed("")
    }

    fn version((): &Self::DynamicType) -> std::borrow::Cow<'_, str> {
        std::borrow::Cow::Borrowed("v1")
    }

    fn plural((): &Self::DynamicType) -> std::borrow::Cow<'_, str> {
        std::borrow::Cow::Borrowed("pods")
    }

    fn meta(&self) -> &ObjectMeta {
        &self.metadata
    }

    fn meta_mut(&mut self) -> &mut ObjectMeta {
        &mut self.metadata
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_partial_pod_deserialize() {
        let json = r#"{
            "metadata": {
                "name": "test-pod",
                "namespace": "default",
                "ownerReferences": [
                    {
                        "apiVersion": "devbox.sealos.io/v1alpha2",
                        "kind": "Devbox",
                        "name": "my-devbox",
                        "uid": "12345"
                    }
                ]
            },
            "status": {
                "podIP": "10.0.0.1"
            }
        }"#;

        let pod: PartialPod = serde_json::from_str(json).unwrap();
        assert_eq!(pod.metadata.name, Some("test-pod".to_string()));
        assert_eq!(pod.metadata.namespace, Some("default".to_string()));
        assert_eq!(
            pod.status.as_ref().unwrap().pod_ip,
            Some("10.0.0.1".to_string())
        );

        // Verify owner references are preserved
        let owner_refs = pod.metadata.owner_references.as_ref().unwrap();
        assert_eq!(owner_refs.len(), 1);
        assert_eq!(owner_refs[0].kind, "Devbox");
        assert_eq!(owner_refs[0].name, "my-devbox");
    }

    #[test]
    fn test_partial_pod_without_status() {
        let json = r#"{
            "metadata": {
                "name": "pending-pod",
                "namespace": "default"
            }
        }"#;

        let pod: PartialPod = serde_json::from_str(json).unwrap();
        assert!(pod.status.is_none());
    }
}
