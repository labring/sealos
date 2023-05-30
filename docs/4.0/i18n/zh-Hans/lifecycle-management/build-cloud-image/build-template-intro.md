# 构建模版介绍

构建集群镜像时候可以使用模版来最大化的控制生成的集群文件. 
例如:

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
更多详细信息与基本使用方法可以参阅Golang官方文档 [text/template](https://pkg.go.dev/text/template).

## 函数模版增强

同时支持更多的模版函数来加强使用便捷性. 
例如:

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

这里我们使用了 `semverCompare` 来检查当前执行的用户环境,是否是 k8s 版本 v1.26.0 及以上,如果是,则渲染 `version: v1`, 其他情况都渲染 `version: v1alpha2`.  
有了这些函数的帮助,我们可以在一个集群文件里面同时支持多个kubernetes的版本的兼容性.

### 几个最常用的模版函数

* [semverCompare](http://masterminds.github.io/sprig/semver.html) 比较 Semantic Versioning, 而不是字符串匹配版本.
* [default](http://masterminds.github.io/sprig/defaults.html) 不管变量值是否为空或者未定义,都能给一个默认值.
* [toYaml](https://github.com/labring/sealos/blob/main/pkg/template/funcmap.go#L66) 把变量编码成yaml格式的字符串输出.

完整支持的函数列表: [lick here](http://masterminds.github.io/sprig/)