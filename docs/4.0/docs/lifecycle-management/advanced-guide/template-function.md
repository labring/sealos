---
sidebar_position: 9
---

# 模板引入与函数增强

在 Sealos 的镜像构建过程中，"tmpl" 后缀的文件在 "etc"、"scripts" 和 "manifests" 这三个目录下的文件会被特殊处理。

1. "etc" 目录：这个目录通常用于存放配置文件。在构建过程中，Sealos 会对该目录下的 "tmpl" 后缀的文件进行模板渲染，渲染完成后的文件将被拷贝到集群镜像的相应目录下。

2. "scripts" 目录：这个目录通常用于存放执行脚本。Sealos 会对该目录下的 "tmpl" 后缀的文件进行模板渲染，生成的脚本将在集群镜像构建过程中被执行。

3. "manifests" 目录：这个目录通常用于存放 Kubernetes 资源清单文件。Sealos 会对该目录下的 "tmpl" 后缀的文件进行模板渲染，生成的清单文件将在集群镜像构建过程中被应用到 Kubernetes 集群中。

总的来说，这三个目录下的 "tmpl" 后缀文件在 Sealos 的镜像构建过程中都会被视为模板文件进行处理。这种处理方式提供了更多的灵活性，让我们可以在构建过程中动态生成配置、脚本或者 Kubernetes 资源清单。

在构建镜像时，我们支持 `template` 来让维护者完全控制生成的配置文件（模块渲染）。例如：

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

请参考 Golang 的 [text/template](https://pkg.go.dev/text/template) 了解基础介绍和更多细节。

## 模板函数增强

此外，我们支持 `templateFunc` 来增强模板函数。例如：

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

在这里我们使用 `semverCompare` 来检查用户是否运行在 k8s 版本 v1.26.0 或以上，如果是，生成 `version: v1`，否则生成 `version: v1alpha2`。
有了这个支持，我们可以很轻松地用一个集群镜像文件管理多版本的 Kubernetes 支持。

### 一些最常用的模板函数

* [semverCompare](http://masterminds.github.io/sprig/semver.html) 比较语义版本，而不是字符串比较。
* [default](http://masterminds.github.io/sprig/defaults.html) default 可以在值为空或未定义时提供一个默认值。
* [toYaml](https://github.com/labring/sealos/blob/main/pkg/template/funcmap.go#L66) 将当前值（对象，映射，数组）显示为 yaml 格式的字符串。

完整的支持函数列表，请[点击这里](http://masterminds.github.io/sprig/)。
