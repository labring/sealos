The Systemcall design serves two primary objectives:

First: To provide interface capabilities for Skills. This enables various agents that support skills—such as Claude Code, Codex, OpenClaw, and others—to easily invoke Sealos capabilities and run business logic on the Sealos platform.
Second: To facilitate the development of custom APPs on Sealos, allowing users to build applications similar to Devbox, Jotlin, or Fulling.

In the early stages, Systemcall iteration does not need to be exhaustive. Instead, capabilities should be opened based on the requirements of specific scenarios. For application-layer APIs, applications define their own logic; only the authentication component will rely on Systemcall.

## System-Level Capabilities

P0: Kubernetes User-level permission capabilities, specifically allowing users to create various CRDs.
P2: User management.
P2: CostCenter (Billing/Cost management).

## CRD vs. Restful API
Systemcall is provided through two methods: Kubernetes CRDs and Restful APIs. The choice depends on the following criteria:

CRD: Use this if the capability involves creating a "Resource" in the system (e.g., Pod, Service, Deployment) or a logical resource (e.g., Application).

Restful API: Use this if the capability corresponds to data entries in a database, such as querying, adding, deleting, or modifying billing records.

Crucial Note: Avoid wrapping Restful APIs or providing heavy SDKs over CRDs. For AI agents, CRDs are the most standardized and easily understood interfaces. Over-encapsulation forces the AI to learn Sealos-specific design logic unnecessarily.

## Core Capabilities Provided
Container Deployment: Capabilities corresponding to AppLaunchpad.

Database:

Capabilities for Creating/Updating/Retrieving database connection strings are all handled via CRDs. Most of these interfaces already exist in Sealos.

Reference: [Fulling Prompt Examples](https://github.com/FullAgent/fulling/tree/main/yaml)

Authentication & SDKs:

An SDK (or OAuth2 capability) for web applications running inside the Sealos Desktop to retrieve the user's kubeconfig.

While the SDK already exists, official documentation and specific tutorials need to be organized and published.
