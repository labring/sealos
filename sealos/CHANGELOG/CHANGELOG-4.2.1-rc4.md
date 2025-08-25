# Sealos v4.2.1-rc4 🎉🎉

We are excited to announce the official release of Sealos v4.2.1-rc4 🎉🎉!

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
    curl -sfL  https://raw.githubusercontent.com/labring/sealos/v4.2.1-rc4/scripts/install.sh \
    | sh -s v4.2.1-rc4 labring/sealos
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
* ff4ef1b86cf6dbde55aee3d972758902ac33d29e: feat: add max limit in podline chart (#3140) (@moonrailgun)
* 6f913384a9d856a58ad2e910a95a2daf3daa4a82: feat: add more verbose output while syncing registry (#3181) (@fengxsong)
* 1b97f79ccbb2daf5a35c587e86efb877bf064c67: feat: add registry sync command (#3173) (@fengxsong)
* be1f9864f23532c9e6b694d85c52c8e27227890f: feat: make manifest command visible (#3159) (@fengxsong)
* 138521704d508d793e58be0b36aae621de975148: feat: more apps and hover ball (#3126) (@zjy365)
### Bug fixes
* 96145f888cfbefb08218692847a364e1764126da: fix: can't find variable structuredClone in safari (#3158) (@zjy365)
* f8a17787822714c5fdf21f2a75cc86fadb88adfa: fix: commandline usage output (#3219) (@fengxsong)
* c3744ed64658b7020e531d839f6f81f7874cc2f6: fix: correct descriptions of env settings (#3164) (@fengxsong)
* 2a7380b370f7c1d234ff15b729eb0f8f4714dae0: fix: fix loop call which occur in throw error in onmessage callback (#3150) (@moonrailgun)
* 7ab33208c638b0f062f9b677ce82718cf66d72e3: fix: if a command requires buildah module, call SetRequireBuildahAnnotation explicitly (#3146) (@fengxsong)
* 7bcc3bca5632794a8bec4953a12f6c536c0cfa0a: fix: name of BUILDAH_FORMAT env key (#3145) (@fengxsong)
* c34fbee89d637d2e2aec36fa1f92f0d595551249: fix: window bug & notification field  & modify terminal color (#3147) (@zjy365)
### Other work
* 4d33254a1403af2ff4e8f10c0700798b0d05a640: Added Hyperlink for twitter in  README.md (#3153) (@Harshad112)
* a4e9c1c79139ed0ffb2eba4141a7621598267b3b: Added documentation for quickly deploying a database and wordpress with sealos (#3178) (@ElonMuskkkkkk)
* 07a7f70a408861b3b51efafbe6446f491756b280: Added documentation for quickly deploying a database and wordpress with sealos (#3194) (@ElonMuskkkkkk)
* 58858354d566d81a852639ce689a2a5f51bcf33d: Auto translate Intro.md (#3180) (@zzjin)
* cbfaea21f2dac9251a7708df8ca58a8f3a5c727e: Fix missing intro endpoint. (#3171) (@zzjin)
* 491dd2f48b0a46321cfc8c990eba613fdcef93d0: Fix typo. (#3185) (@zzjin)
* da8afb066e0365b37657d57ebc490be4a9f70e70: Frontend perf (#3225) (@c121914yu)
* 0b86ceb5f84e11c7ee6de2f8805705bdd5207e5f: Manual change position (#3212) (@zzjin)
* 27d6abbc26c7a50aa8e80a06271e2978d5f9413a: Minor updates: (#3148) (@zzjin)
* aa14645b4cfa28ef0ce7f99edc8e0c566d0ce496: Move doc sidebar config into main repo. (#3184) (@zzjin)
* 606bc14acf31b9acedbcd38e1d8280890804763b: Optimize the title (#3214) (@nowinkeyy)
* 71318a4c0a4eca71536458eb2dedf4343f6114ff: Refactor docs dir. (#3170) (@zzjin)
* 1f7ecfe1c62a66d34abcad2ff90c8c17ccaa238e: Restructure the directory structure (#3203) (@ElonMuskkkkkk)
* bd16b9e1b2a5b5e691731ddfd1183c0a77392662: Restructure the directory structure (#3207) (@ElonMuskkkkkk)
* f9ab4172dd345bfd5a8449d0afdab4f8813d9d84: Restructure the directory structure (#3210) (@ElonMuskkkkkk)
* 55bbb66efc1fcde7db0611ce2dec7e69c6ef602d: Update Intro.md (#3142) (@Yvan-code)
* 9d03c72600935fe3cb3cc5a8a4f13e4671e88c5a: Update Intro.md (#3179) (@yangchuansheng)
* 6ebe11b92f221ace41054b0ff79215ece4105c22: Update adminer provider. (#3162) (@zzjin)
* 655196af17c7f87f99e8bb160c9d133bcdb82847: Update app cr displayType (#3152) (@zzjin)
* 96d24582212705d25ed5fa00e17fa51512d82ff7: Update docs, remove `docs/4.0/apis`. (#3163) (@zzjin)
* 0007374f776b70ce02b3279d3b72a10e14ccb8d7: Update icon&fix apply (#3135) (@zzjin)
* 8242d6c808ae970b37750d9afbe9eb6f0f59f4b5: Update sidebar position. (#3215) (@zzjin)
* 3800df71c14c6cd4f55b82829d69171c5b468ce5: [ImgBot] Optimize images (#3200) (@imgbot[bot])
* b71600e300cdfb446526c5775828f14bcc286bed: add additional exemplars: halo && uptime kuma (#3174) (@bxy4543)
* 21d6af7afd3892bfcdf835e8100d8a85ebf83665: add docs for bytebase in both en_US and zh_Hans (#3172) (@dinoallo)
* 5d787233b9a97d98112236b230d9db3cdc3dd1b2: add low-code-platform (#3211) (@nowinkeyy)
* 8299dfcefdde2a6b327f6fa19d2119fb4e3e37c1: correct the title (#3217) (@nowinkeyy)
* 8226a823298dba1250704b7b98ab149a2cc271a5: docs(main): add registry sync docs for build (#3222) (@cuisongliu)
* 576679db8b2bd244e086ea07612d49315fff2248: docs: Add Chinese (Simplified) quick-start documentation with new images and instructions. (#3182) (@yangchuansheng)
* 722acdbafd81fbb0400c24649c924b8d1ac1624d: docs: Add Kubernetes deployment tutorial with terminal (#3198) (@yangchuansheng)
* a204b3ec1450ac60c0bc2bf8495083302d7fa31c: docs: Add new images and update file names in quick-start guide. (#3193) (@yangchuansheng)
* ddab1c56aeb2a86f0dd9f5643f887d46e32f9dcd: docs: Improve Sealos introduction (#3189) (@yangchuansheng)
* 4fb261f3f7faa58f9fda4276bbe405782dae6c18: docs: Refactor YAML conventions and code block language specifiers (#3199) (@yangchuansheng)
* 72ab0eb92554c7dd7365d8e8f2cd683cdcc939bb: docs: Remove `docs/4.0/docs/quick-start/index.md` file (#3197) (@yangchuansheng)
* e4da55fdbe63238c4af9487ffa2d869509f7623d: docs: Remove deprecated features and unused images from README and docs directory. (#3218) (@yangchuansheng)
* 7027fb1a50e085746d9dc1f39a586948f0673f66: docs: add examples pageplug.md (#3176) (@nowinkeyy)
* 49e641decc70bc6b4bddcbaf030ced40ab323671: docs: applaunchpad dbprovider install-fastgpt (#3195) (@c121914yu)
* f943178149517e5a9f42135c04531d4701f05a02: docs: cp docs (#3208) (@c121914yu)
* cb58670e97ad2f204f590a0c41595bf9f3180b90: make bytebase request less resource (#3157) (@dinoallo)
* 833a6affe9bc7ebd18a0f9ab274786752f19580a: mv docs and pics path (#3206) (@nowinkeyy)
* ca838639dd05d684043b296bc66fd647612f1f28: mv docs image path (#3204) (@bxy4543)
* 1aaa0700b1b20c2c3d2f72e875d4a764c8890d4b: mv pics path (#3209) (@nowinkeyy)
* 28f6e5493118cd02c6e73febbc85a63bd002c9a5: optimize docs (#3190) (@bxy4543)
* 43e7e2e058bc55fe029b3c3639743ad836851b4c: optimize the title (#3213) (@nowinkeyy)
* aab8beffe2a8f6b2156af6a8e696638e523aac90: perf: compress default desktop background size. (#3149) (@moonrailgun)
* b37ad2c269dd5aa29f00858a47169e0902becc29: refactor(main): add lifecycle mardown  (#3188) (@cuisongliu)
* 5d27f955d8405031df11d2e3a100b65b80de5bdf: refactor(main): add lifecycle mardown (#3177) (@cuisongliu)
* 88dfd8f91de0e33de1648204d0d73520182e92fa: refactor(main): add lifecycle mardown (#3202) (@cuisongliu)
* 6cc595e830b932566c9cbe35687654526c18bea6: refactor(main): add lifecycle mardown for cri-image-shim docs (#3183) (@cuisongliu)
* ed93ee16ce7b05fe94fd732d26b33effbc0e46f6: refactor(main): fix ci error (#3139) (@cuisongliu)
* 66271244a1eaaf3977412ab10b2f4cfed1c22d1c: refactor(main): remove registry compression (#3166) (@cuisongliu)
* 22289636a79c266ec44e211230084e7a35c75017: refactor(main): using registry mode build save images (#3154) (@cuisongliu)
* efb36bd1ec51a1e723952bc24b244dfc8f6260e4: refactor: add sync mode impl (#3113) (@fengxsong)
* 3818b78064358c83200d17ead2492f47a649dff3: revert: remove easter eggs in diff command (#3186) (@fengxsong)
* ac7e2e0b11be16a8e3630efc4941a220d31bd9d6: style: return error instead of bool type (#3169) (@fengxsong)
* 2b964edf8e6e6b71f606058d4b9adfe93cf75411: update doc. (#3196) (@zzjin)
* 9c20dacb539d0063053d4665116d1f21b42edb44: 🤖 add release changelog using rebot. (#3134) (@sealos-release-rebot)

**Full Changelog**: https://github.com/labring/sealos/compare/v4.2.1-rc3...v4.2.1-rc4

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
