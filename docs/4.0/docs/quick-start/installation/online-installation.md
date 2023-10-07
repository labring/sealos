---
sidebar_position: 1
---

# Sealos Cluster Online Installation Guide

## Preparations

### Servers
An odd number of master servers and any number of node servers. It is recommended to use the Ubuntu 22.04 LTS Linux distribution with a kernel version of 5.4 or higher.

The recommended configuration is 4c8g, with storage over 100g. I.e., the minimum server configuration is as follows:

|           | cpu | memory | disk |
|-----------|-----|--------|------|
| recommend | 4   | 8G     | 100G |
| minimum   | 2   | 4G     | 60G  |

### Network
Interconnection between servers. `master0` (the master node running the sealos CLI) should be able to SSH into other nodes without a password. All nodes should be able to communicate with each other.

### Domain
You need a domain to access Sealos and the various services you will deploy. If you don't have a domain, you can use the free domain service provided by [nip.io](https://nip.io).

### Certificate
Sealos requires certificates to ensure secure communication. By default, if you don't provide a certificate, we will use [cert-manager](https://cert-manager.io/docs/) to automatically issue one.

If you can provide a certificate, it needs to resolve the following domains (assuming the domain you provide is: cloud.example.io):
- `*.cloud.example.io`
- `cloud.example.io`

## Installation Steps

Execute the command and enter the parameters as prompted:

```bash 
curl -sfL https://raw.githubusercontent.com/labring/sealos/main/scripts/cloud/install.sh -o /tmp/install.sh && bash /tmp/install.sh 
```