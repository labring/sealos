---
slug: what-is-sealos
title: "Sealos vs Traditional Cloud Platforms: A Comparative Analysis of Efficiency and Cost"
description: "Explore the innovative Sealos cloud operating system: a Kubernetes-based platform revolutionizing cloud computing. Dive into its design, unique features, and competitive advantages over traditional cloud services. Learn how Sealos optimizes user experience, reduces costs, and simplifies cloud resource management for businesses and developers."
authors: [fanux]
tags: [Kubernetes, Sealos]
keywords: [Cloud Operating System, Sealos, K8s, Cloud Native, Cloud Computing, Cloud OS, PaaS, Rancher, KubeSphere, Cloud Service]
image: https://cdn.jsdelivr.net/gh/yangchuansheng/imghosting5@main/uPic/2023-08-31-09-52-gLmSek.jpg
date: 2023-07-10T10:00
---

With the rapid development and widespread application of cloud computing, businesses and developers are increasingly seeking flexible and efficient ways to manage and deploy cloud resources. In this context, Sealos emerges as not only a [cloud operating system](https://sealos.io) with Kubernetes at its core, but also as an innovative solution aimed at simplifying and optimizing the cloud computing experience.

This article delves into the core functions, technical features, design philosophy of Sealos, and how it revolutionizes the [cloud operating system](https://sealos.io) domain. We will also explore Sealos' applications in various usage scenarios and compare it with other cloud service platforms in the market to demonstrate its unique competitive advantages and potential.

<!--truncate-->

## What is Sealos?

Conceptually, Sealos is similar to operating systems like Windows, but with two key differences. First, Sealos does not operate on a single server; its core concept is to **treat the entire data center or resources across multiple servers as a unified whole**. This approach breaks the limitation of traditional operating systems that operate on a single machine, extending resource and application management to a larger scale, **enabling the operation and management of applications across the entire data center**, significantly enhancing the utilization efficiency of cloud resources and operational capabilities.

![](https://cdn.jsdelivr.net/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-17-13-46-9Nel1a.png)

Unlike ordinary operating systems that support daily applications like QQ and WeChat, Sealos focuses on providing developers with the environment they need for distributed applications. In the world of Sealos, **complex cloud computing tasks become as simple and intuitive as using a personal computer**. Whether running common web services like Nginx or deploying and managing distributed applications written in various programming languages, Sealos can do it all with one click, greatly reducing the complexity of configuration and management. Its design philosophy emphasizes user-friendliness and simplicity, striving to eliminate technical barriers in using cloud services, making cloud computing's powerful capabilities easily accessible to every user.

## Core Problems Solved by Sealos

Sealos primarily addresses the following core issues:

### Optimizing Cloud Experience

#### User Interface

The significance of the User Interface (UI) is self-evident. Traditional standalone operating systems have provided us with a standardized user experience paradigm. However, many of today’s cloud platforms have evolved into vast and complex systems, causing users to lose their way in the product. This has even led to the creation of specialized training positions for cloud services, reflecting a failure in product design to some extent. For example, few people need training to use an iPhone, as its product design is already excellent and very easy to understand and operate.

In product design philosophy, we first need to recognize that different user roles have varying focal points. The user base of cloud services includes developers, database administrators (DBAs), operations personnel, Kubernetes (k8s) experts, technical novices, and industry experts. Trying to satisfy all these roles with one product is nearly impossible. For instance, even with the same CI/CD (Continuous Integration/Continuous Deployment) tool, some prefer Jenkins, while others favor Drone.

Many PaaS platforms take CI/CD as an example and often integrate specific tools like Jenkins, leading to a need to rebuild core functions when the tool becomes less popular or better alternatives emerge. Also, this design fails to meet the preferences of different users.

The approach of standalone operating systems is worth learning from. The operating system itself does not interfere too much but is responsible for managing applications well. This allows users to freely choose their preferred applications, such as office software DingTalk or Feishu, which are independent of the Windows operating system. This method grants users a great degree of freedom. Although many PaaS platforms also offer app markets, they do not consider applications as the primary element. Instead, most platforms focus on Kubernetes as the core, which is not wrong per se, but **this approach only targets the cloud-native user group and fails to achieve a high level of abstraction**.

The Sealos platform fully follows the operating system philosophy. It focuses on the specific functions users need. For example, a DBA creating a database does not need to worry about the details of Kubernetes; users of Function Compute services do not need to be concerned about whether they run in containers; and Kubernetes experts can operate through the Lens application or command-line tools. This design philosophy allows various types of users to find suitable tools and services on its platform, thereby optimizing the overall user experience.

#### API > CLI > GUI

Many people's understanding of a product is limited to its GUI, but in reality, a cloud service product without an API is almost useless to businesses. To improve efficiency, businesses need to connect and integrate various systems, highlighting the importance of APIs. Cloud services are often designed not just for human users but also for other programs or systems, to achieve a high degree of automation in enterprise operations.

![](https://cdn.jsdelivr.net/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-17-14-36-qnQmDa.jpg)

Sealos provides APIs that are fully compatible with Kubernetes' CRD (Custom Resource Definitions) design. Users can manage and control their cloud resources through Sealos' APIs in the same way as operating in a Kubernetes environment. For security, Sealos assigns a permission-limited kubeconfig authentication file to each tenant. These files allow tenants to flexibly connect, manage, and secure different systems and resources.

This design not only makes Sealos' cloud services more powerful and flexible but also provides enterprises with an efficient, automated way to manage their cloud infrastructure. With the extensive application of APIs, businesses can easily integrate Sealos cloud services into their existing workflows, thus enhancing operational efficiency and flexibility.

#### Fast and Efficient Operation Experience

Our goal is to ensure that most operations can be completed within 30 seconds, and at most not exceed 3 minutes. If the operation time of a feature exceeds this standard, there must be a problem, necessitating reevaluation and redesign.

#### Catering to All Users

Although Sealos is primarily aimed at developers, in the process of functional design, we also pay attention to the experience of non-technical background users. For this purpose, we specifically invite administrative staff without technical backgrounds to experience our services firsthand. This helps us validate the ease of use of our product. If they can smoothly complete the operation process, it proves that our product is easy to operate and user-friendly. The ease of use of the product is our core pursuit. If users need guidance from others to use the service, it indicates that our design still has room for improvement.

#### Focus on High-Quality Applications

In the field of application development, Sealos always prioritizes quality over quantity. For the vast majority of applications, a stable operating environment and backend database support are indispensable. We focus on refining these basic applications first, and then expand to other application fields, integrating cutting-edge applications from various directions and domains, to provide users with comprehensive and efficient solutions.

#### Ensuring Scalability and Security

Sealos does not set standards on its own but strictly follows mature systems and de facto standards, ensuring high compatibility with the entire cloud-native ecosystem. All cloud-native applications can run safely on Sealos, and even some non-productized applications can be run through Sealos' terminal. Our compatibility is built on full support for Kubernetes, with enhanced security measures.

![](https://cdn.jsdelivr.net/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-17-14-48-vbJezM.png)

In Sealos, to prevent improper operations or inappropriate image downloads from causing catastrophic effects on the entire system, each user's permissions are restricted within their own namespace. This permission management mechanism strengthens the security and stability of enterprise-level [cloud operating system](https://sealos.io)s.

### Reducing Cloud Costs

Our goal is not just to help you cut costs by 30%—such a target lacks challenge and is too mundane. We aim to minimize the marginal cost of cloud services, ideally to one-tenth of the original cost. How to achieve this? This is the direction we are pursuing. So, how can we achieve this goal?

#### Redefining Cloud Architecture: Abandoning Traditional Models

**First, we must abandon the traditional three-tier architecture model of IaaS, PaaS, and SaaS.**

Why give up this classic architecture? The reason is that the traditional layered model no longer meets the current technological developments and market demands. Take IaaS as an example; it simulates hardware like routers, switches, and virtual machines in data centers through software. While this improves scheduling flexibility, it also leads to a sharp increase in software costs. For instance, OpenStack requires a team of dozens of people to maintain its stability, directly resulting in high software costs. In the past, this approach seemed necessary to improve resource utilization, but now, from an application perspective, many applications don't care if they run in a separate VPC during operation.

![](https://jsd.onmicrosoft.cn/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-17-15-00-2jC2C8.png)

The above is a diagram I drew five years ago, which is gradually becoming a reality. This is similar to the development history of single-machine operating systems: initially layered, later evolving into a more efficient kernel architecture. The layered architecture of cloud computing also carries historical baggage. Once enterprises abandon IaaS, they can save substantial costs and enjoy higher performance.

From this new perspective, we find that IaaS is actually unnecessary. Technically speaking, PaaS and SaaS are essentially the same; they are both application-level services and thus do not need to be overly differentiated. In the new cloud kernel architecture, we only need to effectively implement isolation between tenants. This does not require complex and heavyweight solutions. For example, Sealos offers a way to share a Kubernetes cluster among multiple tenants in an untrusted public network environment. We achieve this goal using strong isolation containers (like Firecracker), network policies (like Cilium), and block device isolation for storage (like OpenEBS), not only reducing costs but also achieving better results.

![](https://jsd.onmicrosoft.cn/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-17-15-02-6N4ygp.png)

#### Increasing Application Density and Scheduling Efficiency

Unless it's a very heavy compute-intensive application, it's almost embarrassing to not run over 100 applications on a server. On Sealos, we run 800 applications on one server while ensuring application stability.

This is very important for enterprises, as it significantly reduces the need for hardware resources. If you are a corporate executive, you might want to re-examine your company's overall resource utilization rate, which is often below 20%. Through our method, there is much more room for improvement.

With Sealos, enterprises can save up to half the cost in a simpler way.

#### Full Elasticity

Inactive applications at night should rest and leave resources for offline computing or training tasks. This is actually more advantageous with public clouds, as resources can be directly released, saving a lot of costs.

Sealos directly incorporates this key feature. If all enterprise applications operate in this way, huge cost savings can be achieved.

#### Eliminating Zombie Applications and Servers

There are many development and testing programs in enterprises. How do you know which ones are not being used? There are also many zombie "servers." Some companies can only maintain who used what with an Excel sheet, asking around periodically to retire servers that no one claims. Slightly more advanced ones might use an outdated CMDB.

The radical solution to this problem is: charging money. Yes, internal enterprise applications should also be charged, and those that owe fees should be shut down directly.

This way, each department can apply for a budget, and developers apply for a budget. Once the budget is used up, the application is shut down, ensuring no zombie applications in the long term. Sealos brings all servers under unified management, turning the entire cluster into a large resource pool, eliminating the possibility of zombie servers. It also saves enterprises a lot of operational manpower.

To eliminate resource waste, such fine-tuned operations are needed, and Sealos achieves this purpose at a very low cost. The only thing enterprise managers need to do is allocate money to each sub-account.

![](https://jsd.onmicrosoft.cn/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-17-16-18-ijXZ4y.png)

This way, you can precisely control how much each department and each person spends, further analyzing ROI.

#### Operating the Entire Cloud with Half a Person

A team of operators? An operations team for each business unit? Have you ever seen Microsoft sell a PC and then provide you with an operator? Therefore, it's still about inadequate software. If the software is sufficiently excellent and stable, there's no need for the role of an operator. Or this role will change, like writing orchestration files or operators.

The developers of Sealos spent less than half the effort to maintain the entire cloud. Whether it's 8,000, 80,000, 800,000, or 8 million applications, it only requires half a person. This is the [cloud operating system](https://sealos.io), which doesn't increase operational complexity as the scale grows.

I am a neutral person, but I have an extreme view: in a sufficiently mature cloud, there should be no role for operations. If your enterprise has more than 3 operators (excluding those who move servers), you should seriously reflect on this.

Here's a clear path for current operations staff: develop [cloud operating system](https://sealos.io)s.

#### Research and Development Human Resource Costs

I am a developer, and I spend at least 50% of my effort on things other than development. Those miscellaneous tasks may account for 20%, but their impact is 80%. They interrupt what I'm doing, like when you finish writing code and think about selling servers, configuring certificates, packaging, and going live. I bet no developer likes doing these things unless they're masochistic. Developers are lazy, and to be lazy, they develop a bunch of tools. This is the victory of the lazy, and Sealos is also created by the lazy. So if something can be automated, never do it manually; if AI can do it, never do it manually.

![](https://jsd.onmicrosoft.cn/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-17-16-18-as6HSI.png)

Analyzing issues yourself is tiring; AI is more professional than humans.

The function computing capability of Laf on Sealos makes writing code as simple as writing a blog post. Just click save, shut down, and leave. To leave work early, use Laf efficiently.

All backend dependencies, like databases, can be resolved in under 30 seconds. In the future, AI will automatically package, deploy, code, and debug.

This intangible increase in development efficiency can save unimaginable costs. In our customer examples, there are many cases of two people doing the work of five.

### One-Click Private Cloud Construction, Consistent Experience Between Public and Private Clouds

Sealos has a profound understanding of cloud computing:

**Public and private clouds are the same thing, the same abstraction, the same set of codes, and the same experience, just with different applications installed.**

You will find that Linux, whether running in your own data center or in a public cloud, is the same product form. This is the characteristic of excellent software: achieving a high degree of abstraction.

Sealos was designed with this in mind. In fact, public and private clouds are essentially the same; they both link computing resources. Many people might think they are different, but public clouds also have recharge and billing. These functions just need to be placed in a separate application, which can be left uninstalled in scenarios where they are not needed.

![](https://jsd.onmicrosoft.cn/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-17-16-18-vMGZyu.png)

However, even if a larger enterprise builds a private cloud, it should be similar to a public cloud in form. Metering and billing are very important features. Enterprises with more than 10 people need to finely operate cloud resources, let alone enterprises with thousands of employees using private clouds. The cost allocation among departments is essential.

Some minor differences, like WeChat payment or third-party login, may indeed be unnecessary, which are just small configurations.

## An In-Depth Look into Sealos Technology

Sealos takes on a challenging scenario: allowing multiple tenants to share a Kubernetes cluster in an untrustworthy public network environment.

The benefits of this approach are significant:
- Users can start directly without building a cluster and only pay for containers, significantly reducing costs.
- As the scale increases, a flywheel effect occurs, drastically reducing marginal costs. (Sealos's Moore's Law: Every doubling of the Sealos cluster size reduces cloud costs for users by 30%)

However, this approach also presents a significant technical challenge: ensuring isolation, security, and scalability.

By overcoming these technical challenges, we not only provide great value to customers in the public cloud but also easily handle private cloud scenarios.

![Sealos Technology Analysis](https://jsd.onmicrosoft.cn/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-17-16-19-sJYA9X.png)

Decomposing Sealos's technology system:

### Ubiquitous Operation
A well-known open-source project in this area might be Terraform. Unfortunately, it's slow to start when interfacing with certain clouds (due to poorly written drivers; not Terraform's fault) and can easily hit API call limits of cloud providers (also due to erratic driver requests), failing to meet our needs.

Moreover, we prefer Kubernetes CRD standards over Terraform. Consequently, we developed our own infrastructure controller. What normally took 10 minutes to launch, we optimized to 30 seconds, which is nearly the limit barring faster server startups by cloud providers. The optimization mainly involved parallel processing and algorithmic adjustments, rather than simple 10-second delays. Additionally, launching a Sealos cluster on these VMs takes only 3 minutes, already outperforming many similar products (which generally take 15 minutes).

Running on bare metal also requires considering extensive compatibility issues. Thus, Sealos almost entirely abandons RPM, Apt, and other OS-tied installation tools, achieving compatibility with all major Linux distributions. We don't support Windows, simply because we don't prefer it.

Our cluster imaging capability also effectively supports mainstream hardware architectures like ARM and x86.

### Cloud Driver Layer
This component faces massive challenges. Without considering isolation and security, installing containerd, Calico, and OpenEBS might suffice. However, in a public, untrusted environment, such weak isolation is unacceptable. Therefore, we've innovated with new technologies, such as Firecracker, for strong container isolation. The challenges of running VMs within VMs in cloud providers' infrastructure will be addressed in a separate article.

Our network needs require high measurement and isolation standards. Traditional solutions like Calico rely heavily on iptables rules, becoming unusable at scale. We tested and found a 30% failure rate under stress with just 5000 rules. For networking, we introduced Cilium, using eBPF to address these issues and multi-tenant network metering.

![Cloud Driver Layer](https://jsd.onmicrosoft.cn/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-17-16-19-REW9Fy.png)

For storage, we use OpenEBS plus LVM, mounting isolated volumes for each user, allowing them to enjoy local disk performance. File storage, however, becomes a significant issue. NFS and similar solutions are nearly toys, unsuitable for production. Thus, we developed Sealfs, a high-performance filesystem, from scratch in Rust, emphasizing simplicity and support for RDMA.

### Lifecycle Management and Cluster Imaging
For cluster installation and scaling, Sealos users know the process is nearly perfected, with complex clusters managed with a single command!

Cluster imaging capability, likely unmatched globally, is supported by Sealos and Sealer, both of which I led in development. This capability is king in delivery! Entire clusters can be packaged in a fully Docker-compatible format, enabling one-click deployment in customer environments.

In the face of our cluster imaging capability, other delivery tools pale in comparison.

### Tenant Management
Multi-tenancy is a critical need for any enterprise-level user. Designing tenant permissions requires flexibility without complexity, ensuring isolation and collaboration among departments or developers. Native Kubernetes doesn't address these needs, offering only rudimentary namespace management.

Sealos assigns each user an independent kubeconfig, limiting their permissions to their namespace. Users can share their namespaces but are prohibited from risky actions like piercing through to the host, using privileges, or sharing host filesystem ports.

### Application Management
Applications are first-class citizens in Sealos, with everything above the cloud kernel being an application. The challenge here is finding a unified application management approach in a multi-tenant environment.

- Some applications need admin rights to run a controller.
- Others need to run a separate instance.
- Some, like a ChatGPT API, are shared by multiple users.
- Certain applications, like terminal apps, auto-release when unused.

The system also needs to control and meter these applications, further complicating matters.

Sealos abstracts these capabilities into applications, similar to running apps on macOS.

### Proprietary Function Compute Application Laf

Laf revolutionizes code writing, akin to blogging.

- Cloud-based development with immediate results.
- Efficient use of Laf means early finishes.
- Even administrative staff can easily use cloud development.
- Function computes come in two types: those that deploy in 30 seconds, and those that discourage use in 30 seconds.

Laf's millisecond-level publishing outperforms others, where a typical deployment takes 3 to 5 seconds. Laf achieves faster than blogging speeds.

Laf integrates GPT-4, reducing the need for manual coding. We trained thousands of Laf codes, enhancing AI writing capabilities.

Databases and object storage are built-in. Except for some AI coding, almost no other concerns are needed.

It uniquely supports WebSocket, outmatching others (where function compute charges by duration).

Unlike other function computes that are not persistent, Laf utilizes always-on, auto-scaling containers.

### Proprietary AI Knowledge Base Application FastGPT

Laf's AI codes, Sealos's automatic fault diagnosis, AI auto-deployment of applications, and Docker image building rely on FastGPT for knowledge base construction.

![FastGPT Application](https://jsd.onmicrosoft.cn/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-17-16-19-cCinq3.png)

### Databases/Message Queues Applications
We focus on the operating system and some built-in apps. For highly specialized areas like databases and message queues, we collaborate with top teams. For databases, we partner with Kubeblocks, led by PolarDB founder Cao Wei (conveniently next door, with great coffee and reliable databases). Kubeblocks orchestrates MySQL, PostgreSQL, MongoDB, Redis, etc., ensuring data security and recovery.

For message queues, we collaborate with RocketMQ founder Wang Xiaorui, addressing RocketMQ and Kafka services.

In DevOps, we work with Gitea, 90% compatible with GitHub Actions, led by the Gitea creator. The near-perfect compatibility with GitHub Actions is a wise choice.

### Metering and Billing

Metering is complex, requiring a monitoring-like collection mechanism. Beyond measuring container CPU, memory, and disk usage, it must associate data with namespaces and ultimately accounts. More challenging measurements include database access counts in function computes and storage used by each tenant. The most difficult is measuring network bandwidth without impacting performance.

The metering system's challenge is its sensitivity. Any error affects customer billing, necessitating a reconciliation system to verify measurements and ensure billing accuracy.

With this capability, enterprises can finely operate internal departments and developers, automatically shutting down applications with overdue payments, virtually eliminating idle processes.

We've also unified the abstraction for metering in both public and private cloud modes.

## Sealos Design Philosophy and Principles

The essence of remarkable technology is its simplicity from the user's perspective, similar to the Apple iPhone and the Android operating system. Cloud computing can achieve this too, but simplicity without powerful functionality is merely rudimentary. A brilliant architecture doesn't sacrifice complexity for functionality.

If Sealos deviates from these principles, it becomes cumbersome and heads towards obsolescence.

### The Principle of Simplicity

Sealos embodies simplicity in two aspects: product design and system architecture.

In terms of product design, we are committed to not burdening users. We want users to use the cloud as easily as they use personal computers, focusing on applications relevant to their roles without being disturbed by unnecessary features. This does not imply weak functionalities; Sealos can enhance system capabilities by extending any application and provides native APIs for flexible expansion.

At the system architecture level, abandoning the traditional IaaS, PaaS, SaaS three-tier architecture is wise. From an application perspective, there's no need for such complex support structures. With cloud kernel and cloud drivers, **everything above the system is an application.**

### Fragmentation

Sealos can be simplified to just a bare Kubernetes, or expand to thousands of applications. It can run on a TV box or in data centers with tens of thousands of servers. Think of Linux, which can operate on embedded devices and in the largest data centers. This represents a fragmented architecture, meeting your exact needs without overwhelming you with unnecessary capabilities.

Only this architecture can achieve limitless expansion.

### Modular Assembly

A cohesive and streamlined architecture allows for customization according to individual needs. Your cloud should be just right – neither too much nor too little. This is possible thanks to a high level of abstraction. Specific functionalities are implemented by applications themselves, while the cloud OS only needs to pool resources and manage applications. Thus, even if there are tens of thousands of applications in the ecosystem, the complexity of your cloud doesn't increase. Think about how you use a smartphone; the cloud can be used in the same way.

## Use Cases

### Using Sealos Cloud Services Directly

- Any business component that can be built into a Docker image can easily run on Sealos (with future AI assistance for image building). This includes projects written in various programming languages within a company.
- One-click launch for highly available clusters of the four major databases: pgsql, mysql, mongo, and redis. Complete with backup, recovery, monitoring, and control.
- Various well-known open-source projects can run on Sealos.

Thus, Sealos effectively supports your business systems, addressing runtime issues and all backend dependencies.

### Building a Complete Private Cloud

It's increasingly apparent that bare metal not only performs better than virtual machines but is also more cost-effective. However, many companies are hesitant to opt for hardware hosting due to the complexity of managing software – be it OpenStack or Kubernetes.

The cloud service version of Sealos can be cloned exactly into your own data center. Sealos already serves tens of thousands of online users, supporting scenarios and complexities that surpass most companies. After all, companies with tens of thousands of developers are rare.

So, with bare metal and Sealos, both hardware and software are set, and building a private cloud becomes feasible.

The cost of self-building?

- Purchase servers.
- Launch clusters with a single command – so simple anyone can do it, regardless of the number of servers.
- Minimal maintenance, about 0.5 person. We've nearly achieved self-maintenance. The current online cluster serves tens of thousands of applications with approximately 0.1 person's effort in maintenance.

## Comparison with Other Platforms

### Comparing with Other Cloud-Native PaaS Platforms

One of the most frequently asked questions is about the biggest difference in design philosophy. Sealos does not aim to be an all-encompassing PaaS platform. The [cloud operating system](https://sealos.io) itself is highly abstracted, essentially 'nothing'. On Sealos, applications are the prime focus, meeting users' needs through various applications. For instance, when using the Database application on Sealos, you need not worry about any other concepts, not even knowing how to spell 'Kubernetes'.

Sealos, differing from traditional PaaS platforms that aim for all-inclusiveness, regards the [cloud operating system](https://sealos.io) as a highly abstract 'nothing', emphasizing the importance of applications. On the Sealos platform, **applications are considered the top priority**, catering to a diverse range of user needs. For example, when using the database application on Sealos, users don’t need to concern themselves with any other concepts, **not even how to spell “Kubernetes”**.

Rancher and KubeSphere are excellent PaaS platforms. However, Sealos does not consider Kubernetes as its core purpose. It focuses more on the applications running on Kubernetes than Kubernetes itself. Hence, Sealos targets a wide range of developers, intending to create a versatile operating system, not confined to serving only the cloud-native sector. Sealos even prefers not to emphasize the yet-to-be-defined concept of 'cloud-native'.

Therefore, the core idea of Sealos is not “a better Kubernetes” but rather “**providing the applications users need through Kubernetes**”.

> What do users really need?
>

In the operating system domain, user needs define the system’s functionalities. The flexibility of an operating system means it does not impose extra burdens on users. For example, Windows is a gaming platform for gamers, a programming tool for programmers, and a graphic processing software for graphic artists. The identity of an operating system is determined by its users, depending on which applications are loaded. Sealos also embraces this philosophy, hence different users will have distinctly different experiences.

### Comparing Various K8s Installation Tools

Installation is merely a boot function of the entire operating system, but Sealos also has unique features in cluster lifecycle management and application packaging and delivery.

Firstly, Sealos can complete installation with a single command. Secondly, using cluster images, the entire cluster can be packaged and delivered anywhere. Lastly, Sealos allows users to flexibly customize their required cluster like writing a Dockerfile, freely assembling and replacing components in the image, offering hundreds of components for user selection.

## Conclusion

The Sealos community now has a vast user base, developed over many years, battle-tested, with stability proven in various extreme scenarios, steady as an old dog.

Our cloud service has seen exaggerated growth in registered users and application numbers, exceeding 6k online developers and nearly ten thousand applications within two weeks of launch.

We will provide users with a [cloud operating system](https://sealos.io) that is consistent in both public and private cloud experiences, simple, affordable, open, and powerful.