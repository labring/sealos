---
slug: sealos-release
title: "Sealos: Revolutionizing Cloud Computing with a User-Friendly Operating System"
description: Explore the journey of Sealos, a grand cloud operating system project, from its inception as a simple Kubernetes installer to a comprehensive platform transforming cloud computing. Dive into the creator's story, the evolution of Sealos, and how it simplifies cloud operations for businesses and individuals alike.
authors: [fanux]
tags: [Kubernetes, Sealos]
keywords: [cloud operating system, Sealos, Kubernetes, cloud native, Cloud computing, cluster image, Sealer, cloud-native technologies]
image: https://cdn.jsdelivr.net/gh/yangchuansheng/imghosting5@main/uPic/2023-08-31-09-52-gLmSek.jpg
date: 2023-06-13T10:00
---

In the ever-evolving landscape of cloud computing, a groundbreaking innovation has emerged, reshaping our understanding of cloud infrastructures. Sealos, transcending its initial scope as a Kubernetes installation tool, has emerged as a pioneering [cloud operating system](https://sealos.io). In this blog, we'll delve into the journey of Sealos, from its inception to becoming a cornerstone in cloud computing, offering unparalleled user experience and efficiency.

<!--truncate-->

## The Inception of Sealos

It all started one quiet night in 2018. A single line of code marked the beginning of something extraordinary. Initially named "kubeinit," the project soon outgrew its initial scope. Recognizing the need for a broader vision, the project was aptly renamed Sealos. It was not merely about installing Kubernetes; it was about piecing together a comprehensive [cloud operating system](https://sealos.io). This pivotal moment set the stage for the evolution of Sealos, a vision that would redefine cloud computing.

![](https://cdn.jsdelivr.net/gh/yangchuansheng/imghosting-test@main/uPic/2023-08-21-15-15-rcAujq.webp)

## The Entrepreneurial Journey and Initial Challenges

The journey of Sealos is a tale of challenges, perseverance, and innovation. When Sealos made its debut on the Alibaba Cloud Marketplace at 15 yuan per copy, the expectation of commercial success was modest. But the first sale, a mere 15 yuan, was a monumental milestone. It was more than just a transaction; it was a validation of potential, a glimpse into a future of endless possibilities. 

However, this initial success came with its own set of challenges. Providing after-sales service proved to be a Herculean task, demanding constant attention and problem-solving, often at the cost of personal time. This phase was crucial, laying the groundwork for understanding user needs and driving Sealos towards excellence.

## Enhancements and Innovations in Sealos

The development journey of Sealos has been marked by constant innovation and improvement. The initial version, while functional, was just the beginning. Recognizing the need for a more robust solution, Sealos evolved into its second iteration, leveraging Ansible for enhanced performance. 

However, the pursuit of perfection never ceased. The third version of Sealos was a breakthrough, simplifying load balancing and eliminating dependencies, making it a pinnacle in installation simplicity. This relentless pursuit of innovation reflects the core ethos of Sealos – to simplify complex cloud operations while enhancing efficiency and reliability.

## Focus on Installation: A Strategic Choice

Installation is often the first encounter users have with any software, and for Sealos, it was crucial to make this experience as smooth as possible. Focusing on installation was a strategic choice, ensuring that users could easily step into the world of cloud-native technologies. This focus also set the stage for users to explore the full spectrum of Sealos' capabilities, fostering a deeper engagement with the platform.

## Sealos at Alibaba: The Birth of Sealer

During its tenure at Alibaba, Sealos underwent a significant transformation with the development of Sealer. This was a pivotal point, as Sealer brought unparalleled flexibility to the installation process. The concept of cluster imaging, akin to a "cloud version Docker image," was introduced, allowing users to define their installation packages. This innovation not only enhanced the abstraction levels but also offered unprecedented flexibility, reinforcing Sealos' position as a frontrunner in [cloud operating system](https://sealos.io)s.

```
dockerfile
FROM kubernetes:v1.25.0
COPY mysql .
CMD helm install mysql .
```

This concept allows the [cloud operating system](https://sealos.io) to have "images" just like a standalone operating system. Another step is completed in this grand vision. 

## Sealos as a [cloud operating system](https://sealos.io)

At its core, Sealos is more than just a set of tools; it's a full-fledged [cloud operating system](https://sealos.io). With the mantra "Everything is an application," Sealos redefines how we perceive data centers and cloud resources. By treating the entire data center as a unified entity rather than isolated servers, Sealos turns it into a virtual supercomputer, offering seamless, distributed application management. This approach not only simplifies the cloud computing process but also maximizes efficiency and scalability.

![](https://cdn.jsdelivr.net/gh/yangchuansheng/imghosting-test@main/uPic/2023-08-21-15-30-Zn4l1W.webp)

## Design Philosophy: Minimalism and User-Centric Approach

In a domain often cluttered with complexity, Sealos stands out with its minimalist design. But don't be fooled by its simplicity; every element of Sealos is designed with powerful functionality in mind. This design philosophy stems from a deep understanding of user needs, especially in the B2B software realm where user experience is often overlooked. Sealos breaks this norm, ensuring that every interaction with the platform is intuitive, efficient, and pleasant.

![](https://cdn.jsdelivr.net/gh/yangchuansheng/imghosting-test@main/uPic/2023-08-21-15-31-jqkByJ.png)

The black, white, and gray design style will make you feel like you're drinking plain water while using the product, rather than a beverage, let alone footwash (as some products make you feel like dying). Developers already suffer enough, and I hope that using Sealos will bring you a pleasant mood.  

Sealos can pinpoint the pain points of applications. For example, the App Launchpad, an application manager, allows you to launch your own application within 30 seconds. This involves numerous details, such as automatically configuring public domain names and resolving HTTPS certificate issues.

## Affordability and Efficiency with Sealos

One of the most compelling aspects of Sealos is its cost-effectiveness. The platform allows for the efficient running of applications, significantly reducing operational costs. This affordability is achieved through innovative approaches like paying only for active containers and automatic scaling during low traffic periods. Such features make Sealos not just a powerful [cloud operating system](https://sealos.io), but also an economically viable solution for businesses of all sizes.

![](https://cdn.jsdelivr.net/gh/yangchuansheng/imghosting-test@main/uPic/2023-08-21-15-34-NmR7oB.png)

For enterprises, this can significantly reduce resource utilization costs. We ourselves run over 7,000 applications on just 10 servers. What does that mean? After deploying a Sealos cluster, as long as the server resource utilization is below 70%, you can continuously add applications to the cluster until it reaches its capacity. 

You might wonder, **why not use Kubernetes directly?** The reason is simple. For enterprises like Xunfei, applications are distributed across various departments, making multi-tenancy, isolation, and collaboration crucial. Using Kubernetes directly could disrupt the cluster, and the worst-case scenario is that a department or user inadvertently causes a security issue that crashes the entire cluster. Sealos perfectly solves this problem!

Sealos can help 80% of enterprises reduce their resource utilization costs by 80%.

## Sealos: Liberating Cloud Management

Sealos champions the principle of "everything is an application," catering to a diverse range of users, from novices to cloud-native experts. This design ensures that users can leverage Sealos without the burden of understanding complex Kubernetes concepts. At the same time, it provides flexibility and power to those who are well-versed in cloud-native technologies. This dual approach democratizes cloud management, making it accessible to a broader audience while retaining the depth and flexibility for experts.

Sealos pays great attention to the coordination between applications. For example, if you're using function compute on Sealos, the default database might be MongoDB. But what if you want to use PostgreSQL? In this case, you can install a PostgreSQL application on Sealos and access it directly within the function compute through service discovery. Since they are in the same cluster, they can directly communicate through internal DNS.

![](https://cdn.jsdelivr.net/gh/yangchuansheng/imghosting-test@main/uPic/2023-08-21-15-37-5VOWuC.png)

Sealos is streamlined yet not simplistic. All components can be uninstalled, allowing the cloud to perfectly meet your needs—more is considered excessive, less is considered insufficient. This also means that whether it's a single server or hundreds of data centers, they can be built into a cloud with just one command.

## Real-World Applications and User Base

- Run an nginx demo on Sealos in just 30 seconds with automatic scaling.
- Start various databases in 30 seconds and connect to them directly within your business system's intranet.  
- Launch your business applications written in various programming languages directly on Sealos.

These three capabilities serve as the foundation, and you can gradually explore and discover new territories. 

When it comes to running your own business, we have made many detailed optimizations for this scenario. For example, automatic allocation of subdomains, horizontal autoscaling, and support for running various stateful services.

You will find that with Sealos, **whether you're deploying a monitoring system or running a low-code platform, it's all within reach. You can easily host your blog on Sealos at a low cost. Using the Sealos terminal, you can run any Kubernetes-compatible application without difficulty in automation.**

Sealos' versatility is demonstrated through its wide array of applications across various sectors. From supporting high-concurrency services during critical times to running large-scale GPU clusters, Sealos proves its mettle in the most demanding scenarios. Its growing community, with over 100,000 users, including large enterprises, is a testament to its reliability and efficiency in real-world applications.

![Sealos Community](https://jsd.onmicrosoft.cn/gh/yangchuansheng/imghosting-test@main/uPic/2023-11-16-19-51-Ve2aWX.png)

## The Future Roadmap of Sealos

Looking ahead, Sealos is poised for even greater achievements. The roadmap envisions a ubiquitous [cloud operating system](https://sealos.io), offering an experience as seamless and user-friendly as a personal computer. With a commitment to continuous innovation, Sealos aims to enable rapid deployment of new businesses, significant cost reductions, and the simplicity of creating a cloud with just a click.

The Sealos [cloud operating system](https://sealos.io) will also incorporate a **Copilot**, acting as a navigator's assistant. It can automatically perform cloud-native transformations, helping developers easily enter the realm of cloud-native. It can also assist in diagnosing cluster issues, identifying security vulnerabilities, and providing professional operational advice like an expert.

## Conclusion

Reflecting on the five-year journey of Sealos, it's evident that the vision conceived at the first line of code has been realized. This journey, marked by milestones, challenges, and triumphs, was made possible by the trust and support of the community, contributors, and partners. As Sealos embarks on its next phase, it stands ready to exceed expectations and redefine the cloud computing experience.

Experience the transformative power of the [Sealos cloud operating system](https://cloud.sealos.io). Join our community and embark on a journey of simplified, efficient, and innovative cloud computing.