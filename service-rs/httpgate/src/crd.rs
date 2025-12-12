use kube::CustomResource;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// Devbox Custom Resource Definition
///
/// This struct represents the Devbox CRD from sealos.io.
/// We only define the fields we need for routing purposes.
#[derive(CustomResource, Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[kube(
    group = "devbox.sealos.io",
    version = "v1alpha2",
    kind = "Devbox",
    namespaced,
    status = "DevboxStatus"
)]
#[serde(rename_all = "camelCase")]
pub struct DevboxSpec {
    #[serde(default)]
    pub state: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DevboxStatus {
    #[serde(default)]
    pub network: Option<DevboxNetwork>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DevboxNetwork {
    /// Unique identifier for the devbox (e.g., "outdoor-before-78648")
    /// Note: JSON field is "uniqueID" (uppercase ID), not "uniqueId"
    #[serde(default, rename = "uniqueID")]
    pub unique_id: Option<String>,
}

impl Devbox {
    /// Extract the `unique_id` from the devbox status
    pub fn unique_id(&self) -> Option<&str> {
        self.status.as_ref()?.network.as_ref()?.unique_id.as_deref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_devbox_unique_id() {
        let devbox = Devbox {
            metadata: Default::default(),
            spec: DevboxSpec { state: None },
            status: Some(DevboxStatus {
                network: Some(DevboxNetwork {
                    unique_id: Some("outdoor-before-78648".to_string()),
                }),
            }),
        };

        assert_eq!(devbox.unique_id(), Some("outdoor-before-78648"));
    }

    #[test]
    fn test_devbox_unique_id_missing() {
        let devbox = Devbox {
            metadata: Default::default(),
            spec: DevboxSpec { state: None },
            status: None,
        };

        assert_eq!(devbox.unique_id(), None);
    }
}
