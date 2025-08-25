---
sidebar_position: 1
---

# App Launchpad

**App Launchpad** is a feature within Sealos that serves as a single-image deployment tool. Its main goal is to streamline and expedite the process of deploying applications, allowing you to launch your application in as little as 5 minutes.

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

## [Quick Start](/quick-start/use-app-launchpad.md)

For quick and easy installation of commonly utilized applications.

## [Update Application](/guides/applaunchpad/update-app.md)

Guidance on modifying application configurations after initial deployment.

## [Add a domain](/guides/applaunchpad/add-domain.md)

Instructions for integrating a custom domain with your application.

## [Exposing Multiple Ports](/guides/applaunchpad/expose-multi-ports.md)

Details on how to make multiple ports of an application accessible externally.

## [Environment](/guides/applaunchpad/environment.md)

Directions for configuring applications through the use of environment variables.

## [ConfigMap](/guides/applaunchpad/configmap.md)

Guidelines for setting up application configurations via configuration files.

## [Autoscaling](/guides/applaunchpad/autoscale.md)

Strategy for autoscaling the number of application instances in response to varying workloads.

## [Persistent Volume](/guides/applaunchpad/persistent-volume.md)

Utilizing persistent storage for the long-term preservation of data.
