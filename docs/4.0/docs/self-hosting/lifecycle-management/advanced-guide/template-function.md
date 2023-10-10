---
sidebar_position: 9
---

# Template Inclusion and Function Enhancement

In the image building process of Sealos, files with the "tmpl" extension under the "etc", "scripts", and "manifests" directories are specially treated.

1. "etc" directory: This directory is usually used to store configuration files. During the build process, Sealos will render the files with the "tmpl" extension in this directory. The files, once rendered, are copied to the corresponding directory of the cluster image.

2. "scripts" directory: This directory is usually used to store execution scripts. Sealos will render the files with the "tmpl" extension in this directory. The generated scripts will be executed during the cluster image build process.

3. "manifests" directory: This directory is usually used to store Kubernetes resource manifest files. Sealos will render the files with the "tmpl" extension in this directory. The generated manifest files will be applied to the Kubernetes cluster during the cluster image build process.

In summary, files with the "tmpl" extension in these three directories are treated as template files during the image build process of Sealos. This approach provides more flexibility, allowing us to dynamically generate configurations, scripts, or Kubernetes resource manifests during the build process.

When building an image, we support `template` to allow maintainers to fully control the generated configuration files (module rendering). For example:

```yaml
service:
  name: {{ .serviceName }}
  port:
    {{- if typeIs "string" .servicePort }}
    name: {{ .servicePort }}
    {{- else if or (typeIs "int" .servicePort) (typeIs "float64" .servicePort) }}
    number: {{ .servicePort | int }}
    {{- end }}
```

Please refer to Golang's [text/template](https://pkg.go.dev/text/template) for a basic introduction and more details.

## Template Function Enhancement

In addition, we support `templateFunc` to enhance template functions. For example:

```yaml
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: http://{{ .registryDomain }}:{{ .registryPort }}
force: true
debug: false
image: /var/lib/image-cri-shim
{{ if and (ne .SEALOS_SYS_KUBE_VERSION "") (semverCompare "^1.26.0" .SEALOS_SYS_KUBE_VERSION) }}version: v1{{ else }}version: v1alpha2{{ end }}
timeout: 15m
auth: {{ .registryUsername }}:{{ .registryPassword }}
```

Here we use `semverCompare` to check whether the user is running on k8s version v1.26.0 or above. If so, generate `version: v1`, otherwise generate `version: v1alpha2`. With this support, we can easily manage multiple versions of Kubernetes support with a single cluster image file.

### Some Most Commonly Used Template Functions

* [semverCompare](http://masterminds.github.io/sprig/semver.html) compares semantic versions, not string comparisons.
* [default](http://masterminds.github.io/sprig/defaults.html) default can provide a default value when a value is empty or undefined.
* [toYaml](https://github.com/labring/sealos/blob/main/pkg/template/funcmap.go#L66) displays the current value (object, map, array) as a yaml formatted string.

For a complete list of supported functions, [click here](http://masterminds.github.io/sprig/).
