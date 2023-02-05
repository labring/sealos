# Sealos Cloud introduction

Sealos Cloud is the sealos clusters operated and maintained by labring team which provide public cloud services.
Users can directly use [sealos Cloud](https://cloud.sealos.io)
Users can also run sealos in their own environment to have the same capabilities as sealos Cloud.

Sealos Cloud is a public cloud service purely based on cloud-native technology. It provides common service capabilities in public clouds, 
such as database services, function computing services, and object storage services.

The biggest difference from public clouds such as AWS is that the technical architecture is completely implemented using 
cloud-native (built around the technical ecosystem of kubernetes) architecture and 100% opensource.

## Why sealos Cloud

* The product is simple and clean. You won't be tortured by the dazzling advertising discount information published by other Cloud providers.
* Completely open source, which means unlimited usage and freedom to customize.
* The public cloud and private cloud are exactly the same. The public cloud and private cloud of sealos have the same set of codes.
* Runs everywhere, compatible with various cloud infrastructures, compatible with bare metal. Supports various architectures and mainstream Linux operating systems.
* The price is cheap. privatization can help enterprises save 80% of infrastructure costs, and direct use of public clouds can save 10% to 40% of costs.
* Everything is application, users only need to care about the applications they need to use.
* The architecture is simplified. No matter the device is a TV box or a data center with hundreds of thousands of servers, it can run sealos Cloud.

## Sealos Cloud capability

* No need to installing a kubernetes cluster, providing the ability for multi-tenants to share a kubernetes in a public network environment.
  * This scenario is suitable for users who deploy business components on kubernetes, not for users who need cluster administrator privileges.
  * The advantage is that it can be used directly without installation, and the resource scheduling is more sufficient, so the cost will be lower. It is more than 40% cheaper than virtual machines of the same specification, and it provides strong isolation capabilities.
  * The disadvantage is that the user does not have administrator privileges.
  * It is very suitable for the scenario where many departments of an enterprise share a cluster. Our solution can greatly improve resource utilization.
* [App store](https://www.sealos.io/docs/cloud/apps/appstore/): Compatible with the application warehouse of the sealos cluster mirror, all distributed software can be installed with one click.
* [Cloud Terminal](https://www.sealos.io/docs/cloud/apps/terminal/): Open the terminal and you can directly use kubernetes to deploy your own pod.
* [Sealos cloud provider](https://www.sealos.io/docs/cloud/apps/scp/): Help users build kubernetes clusters with complete ownership and control.
* [Sealos pgsql](https://www.sealos.io/docs/cloud/apps/postgres/): Help users build pgsql database instances in minutes.

In the future, sealos will provide more applications.

## Other Links

* Welcome to our main community [discord](https://discord.gg/mzRVdnbw5g).
* Open source project address [github](https://github.com/labring/sealos).
* Sealos Function Compute application [laf](https://github.com/labring/laf) Make writing code as easy as blogging.
* Sealos Cloud demo address [sealos Cloud](https://cloud.sealos.io).