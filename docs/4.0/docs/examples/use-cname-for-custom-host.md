# Example of using cname for custom host

This document describes how to use sealos cloud to expose a service with custom host name.

## Pre-requirement

1. You have a [sealos cloud](https://cloud.sealos.io) account.
2. You have a running service at sealos cloud. In this tutorial, we will use a hello-world demo service.
3. You have a url that we already provided, pointing to your service above. We'll use `https://example.cloud.sealos.io` as our example.
4. You have a custom domain name, like `sealos.example.com`, as well as the https certificate for it.

## Steps

* Create a **cname record** for your custom domain name `sealos.example.com`, point it to the url above `example.cloud.sealos.io`.
* Create a **secret yaml** for your custom domain name for https certificate.

    ```yaml title="secret.yaml"
    apiVersion: v1
    kind: Secret
    metadata:
      name: sealos-example-com-ca-key-pair
      namespace: ns-1234567890abcdef
    data:
      tls.crt: 1234567890abcdef==
      tls.key: 1234567890abcdef==
    ```
    **Note**: the namespace should be the same as your account. The tls.crt and tls.key should be base64 encoded.

    You can use `cat crt.pem | base64 -w0` to encode your crt and key file.

* Create a **CA issuer** to use your own cert.

    ```yaml title="issuer.yaml"
    apiVersion: cert-manager.io/v1
    kind: Issuer
    metadata:
      name: sealos-example-com-ca-issuer
      namespace: ns-1234567890abcdef
    spec:
      ca:
        secretName: sealos-example-com-ca-key-pair
    ```
* Create a **ingress nginx** to expose your service.

    ```yaml title="ingress.yaml"
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    metadata:
      annotations:
        kubernetes.io/ingress.class: nginx
        cert-manager.io/issuer: sealos-example-com-ca-issuer
      name: sealos-example-com-cname
      namespace: ns-1234567890abcdef
    spec:
      rules:
        - host: sealos.example.com
          http:
            paths:
              - pathType: Prefix
                path: /
                backend:
                  service:
                    name: my-svc 
                    port:
                      number: 8080
      tls:
        - hosts:
            - sealos.example.com
          secretName: sealos-example-com-ca-key-pair
    ```

**Done**