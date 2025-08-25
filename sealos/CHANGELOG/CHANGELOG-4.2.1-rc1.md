# Sealos v4.2.1-rc1 🎉🎉

We are excited to announce the official release of Sealos v4.2.1-rc1 🎉🎉!

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
    curl -sfL  https://raw.githubusercontent.com/labring/sealos/v4.2.1-rc1/scripts/install.sh \
    | sh -s v4.2.1-rc1 labring/sealos
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
* 90b9a163eafe28c185a3e752cacda171872a9d57: feat: Add support for single-node mode without hosts in Clusterfile (#3024) (@LZiHaN)
* 1c6dd12c36754ec4cc75c9889fd852e45fdf0336: feat: open other app by sdk (#3011) (@c121914yu)
### Bug fixes
* 16ab2d2c81a3d1312937aa21538763f9080ea2b6: bugfix: fix duplicate print prompts (#3020) (@nowinkeyy)
### Other work
* 8783311762ac938eb035a5c6ef15baf3aecffd72: Automated Changelog Update: Update directory for v4.2.0 release (#2977) (@sealos-ci-robot)
* 9aa43c8b4f15a14c60153d7752a1141363b86772: Cluster image desktop (#3028) (@lingdie)
* 3cccfbaab4a99b023d28e2b684fec8b65172beb5: Replace all `math/rand` to safer `crypto/rand`. (#3031) (@zzjin)
* ff35c3e6ef8415067dace67c2256dd0750457a12: Stream log (#3018) (@c121914yu)
* 2d39bc86e7249a627ad01a7cdc799ea4a706bb19: Terminal controller support cors. (#2991) (@zzjin)
* 015f9c54c4074ac18e8541fb59c2593fdb823b42: Update README, add the new version UI showcase. (#3040) (@fanux)
* d528d6be713b9b9cf92169e5822d354d29fffb9d: add auth cluster image and update workflow (#2981) (@lingdie)
* df615299d952dac6ad03d59cadf3775088ff86e8: add systemDB design (#2955) (@fanux)
* 6f1bbae0a14f0fe9beb5c0a8b14db6e4f0ab1131: change cert env (#3033) (@lingdie)
* 6f0accc78c98843c171f1c2e6c725731fb8d0175: docs(main): add changelog action (#2990) (@cuisongliu)
* 6406b475674ffc030579e61c17ea71d99fa2281d: docs(main): add default image config.yml to config patch image (#3006) (@cuisongliu)
* c8d475710ab305cc20a272fe2010cfec284dd846: docs(main): add e2e test images (#3013) (@cuisongliu)
* a6e33bc799c2b760cad3ff38ad55afc02212f84b: docs(main): add image guide docs (#2992) (@cuisongliu)
* c552e68b0097c256202ac0566f2a6ec9b3037e9f: docs(main): e2e for core sealos (#3030) (@cuisongliu)
* 9f8189aa7a3131c716ed6a8d2887d1fad347c863: docs(main): e2e for image shim for sealos (#3034) (@cuisongliu)
* bb7e82da0380547aae9c456f3fa0aa1cd2a305bb: docs(main): fix bot config (#3021) (@cuisongliu)
* 453218412cac23039c9cbf74b61924d2dedbad54: docs(main): fix release comment (#2982) (@cuisongliu)
* 0d2588faf32e51c4467c66b106c4018276d73af6: docs(main): replace lookup env to apply (#3039) (@cuisongliu)
* 884dfb0845d00f65f49782c50127e321d85eb1fb: docs(main): save sealos for controllers (#3026) (@cuisongliu)
* e758ed41264cc71d99e366185f7d2d572aa3653c: docs(main): save sealos for controllers,front,service (#3029) (@cuisongliu)
* 4b5f9d794435f9f9835bf43ed74ccb4670ef2c55: docs(main): upgrade bot version (#3022) (@cuisongliu)
* 6e1db7b96a2d7631777677d0f728db3b03ad9b42: feat terminal add env ttyd image (#3012) (@zjy365)
* f8269fb07b215c76eee37ed6d08fd47ee4d14d34: feat terminal cors & decodeURIComponent url command (#2988) (@zjy365)
* 147ed6d372d3281f8a6e666db61572b07a46c5f3: feat web terminal frontend (#2972) (@zjy365)
* 22bdba549f669086556bf06e8080c8da1fa6d535: feat. build frontend cluster image  (#3016) (@lingdie)
* 3a7970cc1b3512517020627bbaf4fdc2e5ab1af4: feature: using promptui replace confirm (#2993) (@nowinkeyy)
* 5feb91b71a25eed7ef534e87963a88bc99c2dddd: fix GetHostArch without use args port (#3042) (@ghostloda)
* e71f980be1d586648b757d6938c8113e7ad1897e: fix sha len not same (#3025) (@lingdie)
* d4f5eb26752a5cdc291bc36b992147715c6feffa: fix sync tag name (#3015) (@lingdie)
* b68437084ba4a3b8de520b258332469c2dfeaa17: fix. cluster image controller (#3017) (@lingdie)
* d57b729566c85aee12065a3d0f0388b4424c021c: new app: launchpad (#2987) (@c121914yu)
* f8774d06b944655a16fbcc1f65f31f1c5d6c4c5e: update controller and service cluster image build (#3001) (@lingdie)

**Full Changelog**: https://github.com/labring/sealos/compare/v4.2.0...v4.2.1-rc1

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
