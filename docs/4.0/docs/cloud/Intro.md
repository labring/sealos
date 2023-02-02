# sealos Cloud introduction

sealos Cloud is a sealos cluster operated and maintained by labring team to provide public cloud services.
Users can directly use [sealos Cloud](https://cloud.sealos.io),
Users can also run sealos in their own private environment to have the same capabilities as sealos Cloud.

sealos Cloud is an ALL IN cloud-native public cloud service, 
such as database services, function computing services, and object storage services.

The biggest difference from public clouds such as AWS is that the technical architecture is completely implemented using 
cloud-native (built around the technical ecosystem of kubernetes) architecture and 100% opensource.

## why sealos Cloud

* The product is simple and clean, if you have been tortured by the dazzling advertising discount information of other Cloud provider.
* Completely open source, which means unlimited and free to customize.
* The public cloud and private cloud is exactly the same. The public cloud and private cloud of sealos have the same set of codes. 
* Runs everywhere, compatible with various other cloud infrastructures, compatible with bare metal, supports various architectures and mainstream linux operating systems.
* The price is cheap, and privatization can help enterprises save 80% of infrastructure costs, and direct use of public clouds can save 10% to 40% of costs.
* Everything is application, users only need to care about the applications they need to use.
* The architecture is simplified, whether it is on a TV box or a data center with hundreds of thousands of servers, it can run sealos Cloud.

## sealos Cloud capability

* No need to installing a kubernetes cluster, providing the ability for multi-tenants to share a kubernetes in a public network environment.
  * This scenario is suitable for users who deploy business components on kubernetes, not for users who need cluster administrator privileges.
  * The advantage is that it can be used directly without installation, and the resource scheduling is more sufficient, so the cost will be lower. It is more than 40% cheaper than virtual machines of the same specification, and it provides strong isolation capabilities.
  * The disadvantage is that the user does not have administrator privileges.
  * It is very suitable for the scenario where many departments of an enterprise share a cluster, which greatly improves resource utilization.
* [App store](https://www.sealos.io/docs/cloud/apps/appstore/): Compatible with the application warehouse of the sealos cluster mirror, all distributed software can be installed with one click.
* [Cloud Terminal](https://www.sealos.io/docs/cloud/apps/terminal/): Open the terminal and you can use kubernetes directly to deploy your own pod.
* [Sealos cloud provider](https://www.sealos.io/docs/cloud/apps/scp/): Help users build a kubernetes cluster that is completely their own, and can freely define the cluster.
* [Sealos pgsql](https://www.sealos.io/docs/cloud/apps/postgres/): Help users build pgsql database instances in minutes.

In the future sealos will provide more applications.

## Other Links

* Welcome to our main community [discord](https://discord.gg/mzRVdnbw5g).
* Open source project address [github](https://github.com/labring/sealos).
* sealos Function Compute application [laf](https://github.com/labring/laf) Make writing code as easy as blogging.
* sealos Cloud demo address [sealos Cloud](https://cloud.sealos.io).