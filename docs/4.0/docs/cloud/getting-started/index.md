---
sidebar_position: 1
---

# Start using sealos Cloud

## Log in

Login at [sealos cloud](https://cloud.sealos.io). Please do not use current trial version as production environment.

![img.png](img.png)

Currently supports wechat and github login.

## Tutorial

It is highly recommended that users have a try to deploy [hello world](https://www.sealos.io/docs/cloud/apps/terminal/use-sealos-cloud-hello-world) on sealos cloud  
This tutorial creates a hello world pod, as well as the svc and ingress to assign an independent second-level domain name to provide public network access.
Basic usage and basic concepts of kubernetes are required.

[cloud terminal](https://www.sealos.io/docs/cloud/apps/terminal/) It is the recommended tool to operate sealos cloud through CLI.
You can also debug other pod svc, etc, utilizing the terminal.

If you need a separate database instance，[sealos pgsql](https://www.sealos.io/docs/cloud/apps/postgres/) is a good choice, you can create a pgsql database in minutes.

If you need a separate customized kubernetes cluster, you can use [sealos cloud provider](https://www.sealos.io/docs/cloud/apps/scp/).
It only takes five minutes to create a kubernetes cluster with high availability. The creation is 2 to 3 times faster than similar products!