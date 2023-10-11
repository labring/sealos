---
sidebar_position: 1
---

# Install Sealos Cluster

## Before You Begin

### Hardware

+ Opt for an odd number of Master servers and a bunch of Node servers.
+ OS: Stick with Ubuntu 22.04 LTS.
+ Make sure your Kernel's at least 5.4.
+ Recommended Configuration: 4-core CPU, 8GB RAM, and over 100GB storage.
+ Minimum Configuration: 2-core CPU, 4GB RAM, and 60GB storage.

### Networking

+ All servers should be interconnected. 
+ master0 (that runs the sealos cli) should have SSH access to the others without needing a password. 
+ All servers should be able to communicate with each other.



### Domain

You’ll need a domain to access Sealos and any other services you launch. If you don't own one, just pick up a freebie from nip.io.

### Certificates

Sealos prioritizes security using certificates. If you don't provide your own, the system defaults to [cert-manager](https://cert-manager.io/docs/) to handle it for you. If you’ve got your own certificate, ensure it recognizes:

- `*.cloud.example.io`
- `cloud.example.io`

## Installation

Just run this command and follow the prompts:

```bash
curl -sfL https://raw.githubusercontent.com/labring/sealos/main/scripts/cloud/install.sh -o /tmp/install.sh && bash /tmp/install.sh
```

Your default login details are:

+ Username: `admin`
+ Password: `sealos2023`