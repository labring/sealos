---
sidebar_position: 3
---

# Q&A

Encountering issues during the deployment and use of Sealos Cloud is not uncommon. To assist you effectively, we have compiled a list of frequently encountered problems along with comprehensive solutions.

## Deployment Related Issues

This section details the problems you may face during the deployment phase and their respective solutions. For issues not covered here, please consult with us at the [Sealos Community](https://github.com/labring/sealos/discussions).

### Q1: iptables / ip_forward Concerns

**Problem Overview**: In some operating systems, such as older versions of Centos and RHEL, iptables or IPv4 IP forwarding is not enabled by default. This can hinder the creation of iptables rules or the forwarding of packets, potentially preventing the cluster from starting correctly.

**Resolution Strategy**: To address this, execute the following commands on each node to activate iptables and IP forwarding:

```shell
$ modprobe br_netfilter
$ echo 1 > /proc/sys/net/bridge/bridge-nf-call-iptables
$ echo 1 > /proc/sys/net/ipv4/ip_forward
```

### Q2: Issues with System Kernel

- **Problem Overview**: An outdated system kernel can impede the proper startup of the cluster. Also, certain applications, especially those dependent on MongoDB 5.0, might not function with an older kernel.
- **Resolution Strategy**: Ensure your system's kernel version is at least 5.4 or higher before commencing the deployment.

### Q3: System Resource Constraints

- **Problem Overview**: Limited system resources can lead to deployment delays or even halts. If you encounter prolonged wait times, it's likely due to insufficient system resources.
- **Resolution Strategy**: Check the resource status of your nodes using `kubectl describe nodes`, focusing on CPU, memory, and storage availability.

### Q4: Networking Issues

- **Problem Overview**: Incorrect server configuration can lead to various network issues during deployment. Common areas of concern include:
   1. Misconfiguration of http_proxy / https_proxy environment variables;
   2. Inadequate server firewall settings;
   3. Improper server routing configurations;
- **Resolution Strategy**: Troubleshoot network issues by verifying the correctness of these configurations.

## Certificate and Domain Name Issues

### Certificate Renewal Process

Certificates are crucial for the security of your Sealos cluster. Follow these steps to update your certificates, especially as they approach their expiration date:

1. **Backup Existing Certificate**:

   On the `master0` node, backup your current certificate. This step is crucial to prevent loss of the certificate during the update process. Use this command:

   ```shell
   $ kubectl get secret -n sealos-system wildcard-cert -o yaml > cert-backup.yaml
   ```

   This will save the `wildcard-cert` certificate in YAML format to `cert-backup.yaml`.

2. **Storing the New Certificate**:

   Place your new certificate files (.crt and .key) on the `master0` node.

3. **Updating the Certificate**:

   To update, use the script below, replacing `<path-to-tls.crt>` and `<path-to-tls.key>` with the actual paths of your new certificate and key files.

   ```shell
   #!/bin/bash 
   # Set Variables
   CRT_FILE=<path-to-tls.crt>
   KEY_FILE=<path-to-tls.key>
   
   # Base64 encode the certificate and key files
   CRT_BASE64=$(cat $CRT_FILE | base64 -w 0)
   KEY_BASE64=$(cat $KEY_FILE | base64 -w 0)
   
   # Create JSON for update
   PATCH_JSON='{"data":{"tls.crt":"'$CRT_BASE64'","tls.key":"'$KEY_BASE64'"}}'
   
   # Update the Secret using kubectl patch
   kubectl patch secret wildcard-cert -n sealos-system -p $PATCH_JSON
   ```
   
   This script encodes the new certificate in Base64 and updates the Kubernetes cluster's Secret object using `kubectl patch`.

### Changing the Domain Name

Changing a domain name in a Sealos cluster is complex, often requiring adjustments in multiple components and services. We do not currently provide a comprehensive guide for this process in our documentation. However, future plans include the release of a Sealos Cluster Management Panel for easier domain name and certificate replacement.

It's important to note that domain name changes demand deep knowledge of the cluster's network setup and may involve intricate DNS settings and service discovery. We recommend undertaking such changes only if you have the requisite expertise or with guidance from a professional.

### user registration switch

disabled user register:

```shell
kubectl get cm -n sealos desktop-frontend-config -o yaml | sed 's/signUpEnabled: true/signUpEnabled: false/g' | kubectl apply -f -
kubectl rollout restart deployment desktop-frontend -n sealos
```

enabled user register:

```shell
kubectl get cm -n sealos desktop-frontend-config -o yaml | sed 's/signUpEnabled: false/signUpEnabled: true/g' | kubectl apply -f -
kubectl rollout restart deployment desktop-frontend -n sealos
```
