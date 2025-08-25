# Sealos v4.2.1-rc3 🎉🎉

We are excited to announce the official release of Sealos v4.2.1-rc3 🎉🎉!

## Sealos Cloud: Powerful Cloud Operating System Distribution

Sealos Cloud is a cloud operating system distribution with Kubernetes at its core. Users can directly use Sealos Cloud or run Sealos in their private environment to have the same capabilities as Sealos Cloud. Sealos Cloud offers a range of advantages, including a sleek product experience, fully open-source architecture, consistent public and private cloud experiences, cross-platform compatibility, and highly competitive pricing.

### Sealos Cloud Usage Guide

Sealos Cloud offers you exceptional public cloud services for cloud-native applications, making it easy to manage cloud-native applications. Sealos Cloud provides two ways to use: cloud access and private access. The online mode is now officially launched, and offline mode will be introduced in future releases.

#### Cloud Access

Cloud access is provided by directly accessing the cloud services provided by Sealos Cloud. Just enter the following link in your browser to start using the powerful features of Sealos Cloud immediately:

```
https://cloud.sealos.io
```

Cloud access allows you to access and manage your cloud-native applications anytime, anywhere, without any additional configuration and deployment. This makes the online mode an ideal choice for quickly getting started with Sealos Cloud.

### Component Introduction

Sealos Cloud's main features are divided into the frontend interface, backend API services, and Kubernetes Operator, working together to provide a complete cloud-native application management experience.

#### Main Components

- **Auth-Service**：Provides authentication services using casdoor, ensuring the security and accuracy of user identities.
- **Image Hub**：Sealos image repository-related services, making it easy for users to manage and use images.
- **Desktop**：Public cloud frontend service, providing a friendly user interface and operation experience.
- **User**：User and user group management services, making it easy for administrators to assign and manage user permissions.
- **Account** & **Metering**：Provides billing and account capabilities, helping users to reasonably control and plan costs.
- **App**：Provides the Sealos Cloud desktop application, making it easier for users to use and manage cloud services.
- **Infra**：Provides basic settings, currently supports AWS and Alibaba Cloud, and may support more cloud service providers in the future.
- **Cluster**：One-click cluster startup on Sealos Cloud, simplifying the cluster deployment and management process.
- **Terminal**：Terminal services on Sealos Cloud, providing convenient access and management of cloud services.

For more detailed documentation about Sealos Cloud, please visit `https://sealos.io/docs/cloud/Intro`.


## Sealos Boot: Professional Cloud-Native Application Management Tool

Sealos Boot is the core component of Sealos, mainly responsible for the lifecycle management of clusters, downloading and deploying OCI-compatible distributed applications, and customizing distributed applications.


### How to Install

#### Binary Installation

```shell
    curl -sfL  https://raw.githubusercontent.com/labring/sealos/v4.2.1-rc3/scripts/install.sh \
    | sh -s v4.2.1-rc3 labring/sealos
```



### Component Introduction

Sealos provides two Docker containers: sealos and lvscare, as well as two binary files: sealctl and image-cri-shim. Below is a brief introduction to these components:

- Sealos Container: This container is the core component of the Sealos project, responsible for deploying and managing Kubernetes clusters and distributed applications. It offers a range of command-line tools to help users quickly build and maintain clusters.
- lvscare Container: This container is used to support load balancing management within Kubernetes clusters. It can monitor node status in real-time, ensuring that the load balancer always routes traffic to available nodes.
- sealctl Binary: This is a command-line tool provided by the Sealos project, used to simplify cluster management tasks such as certificate management, IPVS, hosts, and cluster certificates.
- image-cri-shim Binary: This component is a CRI adapter for the Sealos project, supporting different container runtimes (such as Docker and containerd). It allows Sealos to seamlessly integrate with multiple runtimes, enhancing the project's flexibility and scalability.

### Quick Start

```shell
# Create a cluster
sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
    --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
    --nodes 192.168.64.21,192.168.64.19 \
    --passwd your-own-ssh-passwd
```


## Changelog
### New Features
* 99156c4bc06da2d462feb96eab728df97fb38470: feat: add withcontext functions in ssh interface (#3129) (@fengxsong)
### Other work
* 869eed0baae92a83fd8ae3380bd33e9179b32d82: Add type status hide/show system app. (#3127) (@zzjin)
* f010bc2f707675fa47b9591f4aa66df297242145: Move apps.displayType to spec. (#3133) (@zzjin)
* 8438a3fd3eacc97cca798d310e9e657270448eb7: fix ci error (#3128) (@bxy4543)
* ac62c85585d024d7204a489117da4ad6b1a2d04b: update release error (#3132) (@cuisongliu)

**Full Changelog**: https://github.com/labring/sealos/compare/v4.2.1-rc2...v4.2.1-rc3

See [the CHANGELOG](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md) for more details.

## Roadmap

In the future development plan, Sealos Boot and Sealos Cloud will continue to expand their capabilities to meet the needs of more users. Our Roadmap includes the following key plans:

1. Sealos Cloud Private Deployment: We will introduce a private deployment solution for Sealos Cloud, allowing users to deploy and run Sealos Cloud in their own data centers or private cloud environments, achieving consistency between public and private cloud experiences.
2. Heterogeneous Deployment Support: Sealos Boot will support the deployment of Kubernetes clusters on various hardware platforms and operating systems, achieving broader compatibility and flexibility.
3. K3s and K0s Integration: We plan to integrate the lightweight Kubernetes distributions K3s and K0s into Sealos Boot, allowing users to choose different Kubernetes distributions for deployment according to their needs.

Please look forward to the launch of these new features. We will continue to work hard to provide users with better services and experiences.

We are very proud to introduce the two major functional modules of Sealos Cloud and Sealos Boot, which we believe will bring more convenience and efficiency to your cloud-native application management. We look forward to your feedback and suggestions so that we can continue to improve and provide better products and services.

Thank you for your support of Sealos🎉🎉.

If you encounter any problems during use, please submit an issue in the [GitHub repository](https://github.com/labring/sealos) , and we will solve your problem as soon as possible.
