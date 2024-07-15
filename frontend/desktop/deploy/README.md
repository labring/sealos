### How to build image

```shell
sealos build -t docker.io/labring/sealos-cloud-desktop:latest -f Kubefile .
```

### Env

| Name                       | Description                 | Default            |
|----------------------------|-----------------------------|--------------------|
| `cloudDomain`              | sealos cloud domain         | `127.0.0.1.nip.io` |
| `wildcardCertSecretName`   | wildcard cert secret name   | `wildcard-cert`    |

### Config

Here is a config file example:
```yaml
# desktop-config.yaml
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: configMap
spec:
  path: manifests/configmap.yaml
  strategy: override
  data: |
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: desktop-frontend-config
      namespace: sealos
    data:
      config.yaml : |
        cloud:
          domain: "127.0.0.1.nip.io"
          port: ""
          regionUID: "thisiaregionuid"
          certSecretName: "wildcard-cert"
        common:
          guideEnabled: "false"
          apiEnabled: "false"
          rechargeEnabled: "false"
          cfSiteKey: ""
        database:
          mongodbUri: "thisismongodburi"
          globalCockroachdbURI: "thisisglobalcockroachdburi"
          regionalCockroachdbURI: "thisisregionalcockroachdburi"
        desktop:
          layout:
            title: "Sealos Cloud"
            logo: "/logo.png"
            backgroundImage: "/images/bg-blue.svg"
            meta:
              title: "Sealos Cloud"
              description: "Sealos Cloud"
              keywords: "Sealos Cloud"
              scripts: []
            common:
              githubStarEnabled: false
              workorderEnabled: false
              accountSettingEnabled: true
              docsUrl: "https://sealos.run/docs/Intro/"
              aiAssistantEnabled: false
          auth:
            proxyAddress: ""
            callbackURL: "https://127.0.0.1.nip.io/callback"
            signUpEnabled: "true"
            baiduToken: ""
            invite:
              enabled: "false"
            jwt:
              internal: "thisisinternaljwt"
              regional: "thisisregionaljwt"
              global: "thisisglobaljwt"
            idp:
              password:
                enabled: "true"
                salt: "thisispasswordsalt"
    
```

### How to run

```shell
sealos run \
    --env cloudDomain="127.0.0.1.nip.io" \
    --env wildcardCertSecretName="wildcard-cert" \
    docker.io/labring/sealos-cloud-desktop:latest \
    --config-file desktop-config.yaml 
```
