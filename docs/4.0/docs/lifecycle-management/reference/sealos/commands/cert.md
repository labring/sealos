---
sidebar_position: 3
---

# Updating Cluster Certificates with `sealos cert`

The `cert` command in Sealos is used to update the API server certificates in a cluster. This guide provides detailed instructions on how to use this command and its options.

## Basic Usage

To add domain names or IP addresses to the certificate, you can use the `--alt-names` option:

```bash
sealos cert --alt-names sealos.io,10.103.97.2,127.0.0.1,localhost
```

In the above command, replace `sealos.io,10.103.97.2,127.0.0.1,localhost` with the domain names and IP addresses you want to add.

**Note**: It is recommended to back up the old certificates before performing this operation.

After executing the `sealos cert` command, the API server certificates in the cluster will be updated. You don't need to manually restart the API server as Sealos will automatically handle the restart.

## Options

The `cert` command provides the following options:

- `--alt-names='`': Adds domain names or IP addresses to the certificate, e.g., `sealos.io` or `10.103.97.2`.

- `-c, --cluster='default'`: Specifies the name of the cluster on which to perform the exec operation. Default is `default`.

Each option can be followed by an argument.

## Certificate Verification

After updating the certificates, you can use the following commands for verification:

```bash
kubectl -n kube-system get cm kubeadm-config -o yaml
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text
```

The above commands retrieve the kubeadm-config ConfigMap in the kube-system namespace and display detailed information about the apiserver.crt certificate.

That concludes the usage guide for the `sealos cert` command. We hope this helps you. If you have any questions or encounter any issues during the process, feel free to ask us.
