---
sidebar_position: 8
---

# Set a Custom Domain Certificate

Successfully set up a custom domain in "App Launchpad" but cannot access the domain, and it shows the certificate is not
secure. This is because cert-manager did not successfully issue the certificate. To resolve this issue, we can manually
set up the certificate.

First, make sure you have successfully set up CNAME in your cloud provider and have downloaded the certificate
corresponding to your domain.

Open "App Launchpad", set a custom domain.

![](./images/set-cert1.png)

Open the "Terminal", and execute the following commands in sequence.

```bash
# Create tls.crt using the certificate file information (replace xxxx with the actual certificate file information).
cat > tls.crt <<EOF
-----BEGIN CERTIFICATE-----
xxxx
-----END CERTIFICATE-----
EOF

# Create tls.key using the certificate private key information (replace xxxx with the actual private key information).
cat > tls.key <<EOF
-----BEGIN RSA PRIVATE KEY-----
xxxx
-----END RSA PRIVATE KEY-----
EOF

# Create a secret using tls.crt and tls.key.
kubectl create secret tls network-test --cert tls.crt --key tls.key

# Check the ingress for the corresponding application.
kubectl get ingress 
```

![](./images/set-cert2.png)

Modify the ingress (replace xzy-dev.sealos.run with your own custom domain).

```bash
kubectl patch ingress network-twvuqmjzckur -p '{"spec":{"tls":[{"hosts":["xzy-dev.sealos.run"],"secretName":"network-test"}]}}'
```

![](./images/set-cert3.png)

Test the effect.

![](./images/set-cert4.png)