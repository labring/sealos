# Build Template Intro

When building an image, we support `template` to give maintainers full control of generated ClusterFile. 
For example:

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
Goto Golang's [text/template](https://pkg.go.dev/text/template) for base intro and more details.

## Enhance template function

Futhermore, we support `templateFunc` to enhance template function. 
For example:

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

Here we use `semverCompare` to check users are running at k8s version above v1.26.0 or not, if true, generate `version: v1`, else false to generate `version: v1alpha2`.  
With this support, we can easily manage multi-version kubernetes support with one cluster image file.

### Some most frequently used template functions

* [semverCompare](http://masterminds.github.io/sprig/semver.html) compare Semantic Versioning, not string compare.
* [default](http://masterminds.github.io/sprig/defaults.html) default can give a default value if the value is empty or not defined.
* [toYaml](https://github.com/labring/sealos/blob/main/pkg/template/funcmap.go#L66) display current value(object,map,array) to yaml format string.

For full supported function list: [lick here](http://masterminds.github.io/sprig/)