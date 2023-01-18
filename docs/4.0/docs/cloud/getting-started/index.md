---
sidebar_position: 1
---

# Start using sealos Cloud

## Log in

direct login: [sealos cloud](https://cloud.sealos.io), Please do not upload the current trial version to production business

![img.png](img.png)

Currently supports wechat and github login

## Tutorial

It is highly recommended to experience deploying on sealos cloud [hello world](https://www.sealos.io/docs/cloud/apps/terminal/use-sealos-cloud-hello-world) 
This tutorial creates a hello world pod and creates svc and ingress to assign an independent second-level domain name to provide public network access.
Users are required to understand the basic usage and basic concepts of kubernetes.

[cloud terminal](https://www.sealos.io/docs/cloud/apps/terminal/) It is very suitable for developers to use, and it is also the preferred tool to operate sealos cloud through CLI.
You can also debug other pod svc, etc. through the terminal.

If you need a separate database instance，[sealos pgsql](https://www.sealos.io/docs/cloud/apps/postgres/) It is a good choice, you can create a pgsql database in minutes

If you need a separate custom kubernetes cluster, you can use [sealos cloud provider](https://www.sealos.io/docs/cloud/apps/scp/) 
It only takes five minutes to create a highly available kubernetes cluster, and the creation performance is 2 to 3 times that of similar products!