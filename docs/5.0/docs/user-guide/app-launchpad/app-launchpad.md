---
sidebar_position: 0
keywords: [App Launchpad, Sealos, application deployment, private images, horizontal pod autoscaling]
description: App Launchpad in Sealos simplifies application deployment with features like private images, HPA, custom domains, and real-time monitoring.
---

# App Launchpad

**App Launchpad** is a feature within Sealos that serves as a single-image deployment tool. Its main goal is to
streamline and expedite the process of deploying applications, allowing you to launch your application in as little as 5
minutes.

The tool currently boasts a range of functionalities:

- Capability to deploy applications using private images.
- Flexibility to tailor CPU and memory resources according to the specific needs of the application.
- Support for deploying multiple replicas.
- Horizontal Pod Autoscaling (HPA) for dynamic scaling.
- Provision of external URLs for easy access from the public network.
- Option to assign custom domain to applications, enhancing both brand visibility and the user experience.
- Utilization of ConfigMap for configuration file management.
- Persistent storage solutions for application data, ensuring both its security and continuity.
- Real-time monitoring features for applications and Pods to facilitate prompt issue detection and resolution.
- Comprehensive logging of application activities, aiding in troubleshooting and performance optimization.
- Analysis of system events (Events) to extract critical insights for enhancing application performance.
- A convenient one-click feature to access the container terminal, simplifying management and debugging tasks.
- Ability to expose several ports of an application to the external network.

## [Quick Start](./use-app-launchpad.md)

For quick and easy installation of commonly utilized applications.

## [Update Application](./update-app.md)

Guidance on modifying application configurations after initial deployment.

## [Add a domain](./add-domain.md)

Instructions for integrating a custom domain with your application.

## [Exposing Multiple Ports](./expose-multi-ports.md)

Details on how to make multiple ports of an application accessible externally.

## [Environment](./environment.md)

Directions for configuring applications through the use of environment variables.

## [ConfigMap](./configmap.md)

Guidelines for setting up application configurations via configuration files.

## [Autoscaling](./autoscale.md)

Strategy for autoscaling the number of application instances in response to varying workloads.

## [Persistent Volume](./persistent-volume.md)

Utilizing persistent storage for the long-term preservation of data.
