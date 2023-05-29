# Sealos v4.2.0-alpha3 🎉🎉

We are excited to announce the official release of Sealos v4.2.0-alpha3 🎉🎉!

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
    curl -sfL  https://raw.githubusercontent.com/labring/sealos/v4.2.0-alpha3/scripts/install.sh \
    | sh -s v4.2.0-alpha3 labring/sealos
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
* 4131325b32ce4ba7445b1ca2202d02961406612a: feat(debt): Debt-controller should delete user resources over 7 days in arrears  (#2899) (@xiao-jay)
* 6c0a2163da5c3b73c04c1e3656ef23090d5f7910: feat: add resource group (#2905) (@xiaohan1202)
* 6ef4df2f9048cee482235840f0df077552f7286f: feat: grouping subcommands (#2920) (@fengxsong)
### Bug fixes
* 5bb06f4e82b1facc0e4d58358f586ed1690686a4: bugfix: the failure to add master after updating the certificate (#2942) (@bxy4543)
* f7bb82c36605e341d9a74bd1734e2a5a162a4ffe: fix(ci): fix metering e2e install account error (#2901) (@xiao-jay)
* 0c4a3cf71228a1a304019019126bdd8dfc154590: fix: check sg & vswitch existence (#2937) (@xiaohan1202)
* 3de1dc66a4b6cfbd5a9f200ab071fabce5787eac: fix: fix always return the insecure registry (#2927) (@fengxsong)
* 472d25c59ef7bab4bbd3acedbcae0d8895183d0a: fix: make pre-deploy error (#2904) (@xiao-jay)
* 884f1d9d0ff23d96e17a43980dc37f107afc7fd4: fix: return image name if oci archive file has names instead of id (#2887) (@fengxsong)
* 09aa95f0c36e11ade2851c2b328e70e704fa501c: fix: rm master taint in single model (#2860) (@mixinkexue)
* ddabe65678f86343b40687d1059d9b87136a3d1c: fix: use assertion, avoid patching external interface (#2891) (@fengxsong)
### Other work
* 89a519b55ecf9c266f55953d5a84ed0270d1fda3: E2e/apply test workflow  (#2952) (@bxy4543)
* 31e40627dc8db35dfa2681804b2b895c653bcc1e: Fix login ingress deploy (#2909) (@zzjin)
* 9b7fd80b7659f57e87b2b9f09e8e103e575a2e14: Move deploy doc. (#2951) (@zzjin)
* cdacf36cb0918462e6c517a342b00d40bd61295a: Reduce terminal limits a little. (#2915) (@zzjin)
* 5efa4b1c2d6748b8542ff3c6f958f7527350496b: Title: Update auto-release logic to skip deb and rpm packages for non-production releases (#2882) (@cuisongliu)
* 9725dedb5dde50e8bb6b04f975d17a1a97bce54d: add bytebase controller (#2841) (@dinoallo)
* 7ce51bb3074fbb8b2f4d9b8bd9c1ec20306c3f90: add e2e apply test (#2936) (@bxy4543)
* fba6b37728e840b15e41b5713d19d7438bcae479: add fetch Kubeadm Config: (#2943) (@bxy4543)
* b2ed4c7b9754091a4bf31311e8bda970101e8263: add image-cri-image test (#2849) (@bxy4543)
* 21cdb8bc7a3b9648e97a9ce006d47b3754af5541: add local deplopment docs. (#2945) (@lingdie)
* 8a67f568a58287dbe2d0108fbb0c9d20598cb00d: ci，docs: add account e2e test and docs (#2935) (@xiao-jay)
* 2d8d793e7eaa338aa8261075d6b16596cb06f1cd: docs(main): Refactor Changelog generation script and update usage guide (#2884) (@cuisongliu)
* 72a58a94031eb8ceadcd35aca3c67df43bbf8cea: docs(main): add changelog full to shell (#2885) (@cuisongliu)
* 53974f5e7498593af7384c0a77062f551311711a: docs(main): add debug for merge logger (#2886) (@cuisongliu)
* a100d1a5d4136369b49dfefb02e1dda58203ceba: docs(main): add docs for sealctl (#2922) (@cuisongliu)
* c781a29e50c45a57254c66eb7a09c25013d9ffd9: docs(main): add docs for user (#2929) (@cuisongliu)
* e5a204154f236622aebcccc51ba10df5f32d84b0: docs(main): add image-cri-shim docs (#2880) (@cuisongliu)
* de11f2b790efa907a4c62c4e934ba16a60e594a0: docs(main): add robot for sealos (#2959) (@cuisongliu)
* 42e06f9ea34e7db1edee1277f2050601ffd5940b: docs(main): support v1.27 docs (#2939) (@cuisongliu)
* 60b038828da1ac2b0e915789b311104e05149d6c: docs(main): support v1.27 k8s (#2938) (@cuisongliu)
* 8c4a998bb45d48396878a28ff690c286a95720d2: docs(main): sync code user and email (#2900) (@cuisongliu)
* 18b344744a4df5c387c7323818b3c655ad805bd8: docs(main): update gorelease config for new release (#2953) (@cuisongliu)
* a929e01b639a409d03c9db06694f9a01e0fcb936: docs(main): upgrade gomod (#2894) (@cuisongliu)
* 696c7415e2f196dd40722fb8ee4bfc53df5924e7: docs: how to write reousrce-controller (#2941) (@xiao-jay)
* e43c77cbf38e1d6fb4bd591621323a40e0e6a51e: docs: translate metering design from CN to EN (#2746) (@xiao-jay)
* b49983dc993b0ffe0ac33b7f84a3589ec9c9afd4: feat add bytebase application (#2925) (@zjy365)
* c93c368967bf38061d3ff7bf8b5371554a75414e: feature: support checking cluster's no-odd number of master node (#2842) (@pixeldin)
* 9ca8b5e54d592c69aa33676f1540d575ee055c5a: feature: support pulling multiple images at the same time (#2931) (@dhanusaputra)
* 9256d27ef8f0d840f44f02526f64e46437b74695: fix len(deleteInstancesByOption.instanceIds) always gt 0 (#2934) (@bxy4543)
* 3018f694ebfdb918f1a577d9dffe59afd03cc578: fix multi infra apply (#2960) (@bxy4543)
* 7fd1373459b7e1172f1f6f6fe2281271b79c914f: fix notification (#2895) (@zjy365)
* 2fc130bec22217eb015b777ab48f971f97838834: fix pgsql status null (#2924) (@zjy365)
* a26403fc794a015d97f89996e0431b3f7219388f: fix stop kube-apiserver pod cause `DeadlineExceeded` when update cert. (#2918) (@bxy4543)
* 86e8983b62d5296c3908ad3e4b8bc252cd620716: fix sync docs error (#2944) (@xiao-jay)
* be282f8d12d25570ea8bb4171300889ee240cf80: format(account): format webhook name (#2928) (@xiao-jay)
* 168319f56bfecffbbf819b32c97d5fa487eaf691: optimize reset node `ip link delete` command. (#2947) (@bxy4543)
* 7c66fd20cf6c424c4cc492bf119c38115d72c141: refactor: add back auto build and auto save abilities in `diff` command (#2906) (@fengxsong)
* 187be92fc0d62898683db58725a6a9a79cf7bb76: refactor: diff command (#2879) (@fengxsong)

**Full Changelog**: https://github.com/labring/sealos/compare/v4.2.0-alpha2...v4.2.0-alpha3

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
