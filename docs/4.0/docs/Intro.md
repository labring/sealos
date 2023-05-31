# Introduction to Sealos Cloud

The vast and complex nature of the cloud-native ecosystem undoubtedly makes many enterprises feel helpless, and this ecosystem still lacks a user-friendly and ready-to-use distribution. The cloud-native market still urgently needs a cloud operating system to further reduce the threshold and cost of cloud-native.

The advent of Sealos opens a new window for enterprises. It provides enterprises and developers with a brand new choice, which only requires the installation of a cloud operating system in both public and private clouds. It can make various applications run stably and securely on the operating system, and solve all kinds of dependency problems required by the application.

The philosophy that Sealos adheres to is: **Cloud can be as simple as Linux**. You can install it and start using it immediately, just like using Linux, without too much fuss during the use process. The only difference is that Linux is installed on a single server, while Sealos is installed in the entire data center.

In the architecture of Sealos, **there is no essential difference between public and private clouds**. They should be different instances of the same set of code, and the only difference is the difference in configuration and installed applications. Installation on the intranet is a private cloud, and providing services to the outside world on the public network becomes a public cloud.

We firmly believe that with the continuous development and progress of Sealos, the future cloud will be more open and simpler. The beauty of cloud computing will belong to all providers of computing power, and the value of the cloud will be shared by all participants in cloud computing. **They will be able to enjoy the convenience brought by cloud computing in a diversified market environment in a more economical way.**

## Overview

Sealos is a **cloud operating system distribution based on Kubernetes**. It abandons the traditional cloud computing architecture and turns to a new architecture with Kubernetes as the cloud kernel in a cloud-native way, enabling enterprises to use the cloud as easily as using a personal computer.

Users can install any highly available distributed application on Kubernetes with one click, just like using a personal computer, with almost no professional delivery and operation and maintenance costs. At the same time, using the unique cluster image capability, users can package any distributed application into an OCI image, freely combine various distributed applications, and easily customize the required cloud. Through powerful and flexible application store functions, it can meet the diverse needs of various users.

## Applicable Scenarios & Advantages

Sealos is a powerful business operation platform that can perfectly support various applications such as Java, Go, Python, PHP, etc., regardless of programming language limitations. The platform provides a stable operating environment for applications and solves backend dependency issues, such as databases, object storage, and message queues. Furthermore, it can flexibly handle application configuration management, service discovery, public network exposure, and automatic scaling.

### Public Cloud

If your business needs to run in a public cloud environment, then you can directly use [Sealos' public cloud service](https://cloud.sealos.io).

1. **Login to use Kubernetes directly**: No need to install a Kubernetes cluster, Sealos provides the ability for **multi-tenant** to share a Kubernetes in the public network environment. In addition, it provides strong isolation capabilities to ensure the data security of each tenant.
2. **Save resources and reduce costs**: Only need to pay for containers, and the automatic scaling function fundamentally solves the problem of resource waste, which can save 10% to 40% of costs.
3. **Easily achieve public network access**: Automatically assign a second-level domain name for your business to help you easily achieve public network access, and also support custom domain name binding.
4. **Efficient database service**: Provides a service that can create highly available databases in seconds, allowing businesses to directly access databases through service discovery intranet DNS.
5. **User-friendly operation experience**: The built-in terminal directly supports command-line operation of the Kubernetes cluster, and also supports the deployment of the Kubernetes management interface, allowing you to have a good experience on Sealos regardless of whether you are familiar with cloud-native technology.

### Private Cloud

Sealos cloud operating system is **100% open source and free**, and you can find all the source code on [GitHub](https://github.com/labring/sealos). Therefore, all the functions of **Sealos public cloud** can also be deployed in a private cloud environment to meet your more diversified business needs.

### Powerful application delivery capabilities

- Sealos has excellent Kubernetes lifecycle management capabilities and can also customize the Kubernetes environment freely.
- Sealos can package the entire cluster and deliver it to the customer environment with one click. All services and businesses can be delivered as a whole.
- Unlike Docker, which mainly focuses on single-machine images, Sealos can go further and package the **entire cluster** or a certain distributed application.