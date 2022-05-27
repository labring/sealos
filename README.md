<a href="https://trackgit.com">
  <img src="https://us-central1-trackgit-analytics.cloudfunctions.net/token/ping/kexrkhvqjlzkdiap4zke" alt="trackgit-views" />
</a>

![](https://socialify.git.ci/labring/sealos/image?description=1&descriptionEditable=Cloud%20OS%20distribution%20with%20Kubernetes%20as%20kernel.%20Practise%20cloud%20native%20like%20using%20macOS!&font=Source%20Code%20Pro&forks=1&language=1&pattern=Charlie%20Brown&stargazers=1&theme=Light)

<div align="center">
  <p>
    <b>Popularize cloud native technologies with ease</b>
  </p>
  <p>

[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/labring/sealos)
[![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealyun.com)
[![Go Report Card](https://goreportcard.com/badge/github.com/labring/sealos)](https://goreportcard.com/report/github.com/labring/sealos)
[![Chat on Telegram](https://img.shields.io/badge/chat-Telegram-blueviolet?logo=Telegram)](https://t.me/cloudnativer)

  </p>
</div>

---

> English | [中文](docs/4.0/README.md)

**Documentation: _[Website](https://www.sealyun.com), [Blog](https://icloudnative.io)_**

**Join us: DingTalk(35371178), [Telegram](https://t.me/cloudnativer), QQ Group(98488045), Wechat：fangnux**

## What is sealos

**sealos is a cloud operating system distribution with Kubernetes as its kernel.**

In the early stages, operatings systems have adopted a layered architecture， which later evolved into kernel architecture like Linux and Windows. With the emergence of container technologies, cloud OS will migrate to a "cloud kernel" architecture with strong cohesion in the future.

![](https://user-images.githubusercontent.com/8912557/170530230-16ad5607-700c-436a-930c-663e800cbf6e.png)

- From now on, think of all your machines as an abstract supercomputer whose operating system is sealos, where Kubernetes serves as the OS kernel.
- Instead of IaaS, PaaS and SaaS, there will only be cloud OS drivers(CSI,CNI and CRI implementations), cloud OS kernel(Kubernetes) and distributed applications.

> Core Capabilities

- Cluster image - The entire cluster will be able to build, ship and run. Semantics of docker will be extended to clusters so that any distributed applications can be defined and run smoothly.
- hub.sealos - A cluster image repository where you can retrieve pre-built distributed applications such as basic Kubernetes cluster image, high availability pgsql cluster image, high availability minio cluster image, etc.
- desktop.sealos - A desktop for cloud OS, not to be confused with traditional cloud desktop. It is similar to macOS, but manages cluster and distributed applications instead of personal computers.
- Distributed application matrix - Anything you need including storage / network / HA database / message queue / monitoring can be retrieved with a click of the mouse, or simply `sealos run`.

## Vision of sealos

- Any organization can use the cloud OS based on Kubernetes as easily as using macOS
- Anyone can build complex cloud services with a click of the mouse or a single command
- Any organization can maintain the entire cloud system with an intern
- Any organization can have a more open AWS, and public cloud and private cloud can provide the same experience
- Any distributed software can run in the system with a single click and self-operate.

## What can sealos do

- Manage clusters lifecycle, quickly install HA Kubernetes clusters, add / remove nodes, clean the cluster, auto recovering, etc.
- Download and use OCI-compatible distributed software like openebs, minio, ingress, pgsql, mysql, redis, etc. from sealos hub.
- Manage an entire cluster and the distributed applications running on it just like using macOS with sealos desktop.
- sealos can manage Kubernetes, but is not only a Kubernetes manager. It is an abstract cloud OS that can manage Kubernetes through downloading an managing application.
- sealos can install Kubernetes, but is not only a Kubernetes installer. Installing Kubernetes is only a basic capability of sealos.

## Who should use sealos

- Beginners - Even beginners that know nothing about Kubernetes can use sealos painlessly through command line or GUI to obtain the software needed, like establishing a HA database with a single mouse click.
- SaaS application developer - Use a single command to retrieve the service you need, like a database, an HA message queue or a developing environment, without any knowledge of low-level details.
- Cluster manager - sealos marketplace offers a wide range of managing applications like lens official dashboard, web terminal, and cloud native monitoring systems.
- Cloud OS developer - You may develop sealos applications and submit them to sealos hub for others to use.
- Private cloud delivery operator - sealos cluster image ensures high consistency in offline environment and great encapsulation for SaaS applications, significantly easing the private cloud delivery process.
- Organizations - You may use sealos public cloud directly, or start an identical private cloud in your own data center. You can even run sealos on the IaaS of public cloud vendor and no longer suffer from vendor lock-in.

## Why is sealos different

> Kubernetes is a means, not an end

For general users, the most important thing is what's running on Kubernetes, rather than Kubernetes itself. With sealos, users do not need to care about Kubernetes.

Meanwhile, for those who are familiar with Kubernetes, sealos also provides smooth experience.

> Different forms for different applications

The simplest version of sealos barely contains anything beyond capabilities related to cluster image. It only has a Kubernetes inside and other capabilities come from the applications installed, which makes sealos simple and powerful both for personal use and for serving public cloud under large-scale multi-tenant scenarios.

> Compatibility

Any preferences can be fulfilled on sealos. Take CI/CD as an example, some may like drone while others prefer argo, and they just need to install different applications. No CI/CD tools will be deeply integrated with sealos and users choose to install/uninstall them freely.

sealos will not pursue styles consistency of distributed applications, just like styles of Office and email client won't be the same. Otherwise, great effort need to be put into making them consistent and replacing an application will be very costly.

Also, sealos will not require the account information for different applications to be the same, as account management is usually specifically tuned to the application.

> Different usage for different users

In macOS, general users use GUI, developers type in commands in the terminal, and system application developers call system APIs. Similarly, in sealos, general users use GUI, cloud native practitioners use kubectl and interact with dashboard and apiserver, and developers develop Kubernetes operator directly.

> Simple and powerful

sealos provides the most basic framework and the capabilities all come from higher-level applications. The duty of sealos is to manage these applications, so the complexity of the system will not increase with more features.

## sealos in practise

Boss: "We need to keep up with the pace and build a cloud platform based on Kubernetes, with support for storage, PaaS, CI/CD, cloud developing, database, ... What's the estimated cost?"

CTO: "3 for Kubernetes, 1 storage expert, 1 developer, 3 for PaaS, 3 for CI/CD, 5 for cloud developing, 3 for operation and maintenance... I think 15 people and half a year is sufficient."

Everyone is talking, and a voice comes from the corner:

"I know an open-source software that can handle this with a single command:"

```shell script
$ sealos run kubernetes:v1.24.0 openebs:v1.9.0 mysql:v8.0 minio:v4.4.16 ingress:v4.1.0 laf:v0.8.0
       -m 192.168.0.2 -n 192.168.0.3 -p 123456
```

And the task is completed before the meeting ends.

## Quickstart

> Installing an HA kubernetes cluster with calico as CNI

Here `kubernetes:1.24.0` and `calico:v3.22.1` are the cluster images in the registry which are fully compatible with OCI standard. Wonder if we can use flannel instead? Of course!

```shell script
# Download and install sealos. sealos is a golang binary so you can just download and copy to bin. You may also download it from release page.
$ wget -c https://sealyun-home.oss-cn-beijing.aliyuncs.com/sealos-4.0/latest/sealos-amd64 -O sealos && \
    chmod +x sealos && mv sealos /usr/bin
# Create a cluster
$ sealos run kubernetes:1.24.0 calico:v3.22.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

> Building a custom cluster image

See [Building an ingress cluster image](https://github.com/labring/sealos/blob/main/docs/4.0/build-example-ingress-helm.md).

> Storage, message queue, database, etc.

Don't be shocked by the following:

```shell script
$ sealos run fanux/helm:v3.8.1 # install helm
$ sealos run fanux/openebs:v1.9.0 # install openebs
$ sealos run fanux/minio-operator:v4.4.16 fanux/ingress-nginx:4.1.0-daemonset \
   fanux/mysql-operator:v8.0.23-14.1 fanux/redis-operator:5.0 # oneliner
```

And now everything is ready.

## Links

- [sealos 3.0(older version)](https://github.com/labring/sealos/tree/release-v3.3.9#readme) For older version users. Note that sealos 4.0 includes significant improvements, so please upgrade ASAP.
- [buildah](https://github.com/containers/buildah) Capabilities of buildah is widely used in sealos 4.0 to make cluster images compatible with container images and docker registry.
