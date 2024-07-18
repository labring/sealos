---
sidebar_position: 11
---

# 应用集群镜像使用指南

Sealos 提供了一个名为 [cluster-image](https://github.com/labring-actions/cluster-image) 的仓库，该仓库在 GitHub 上用于构建并发布 Kubernetes 集群的应用镜像。这些镜像可以通过提交代码到这个仓库来创建，并可以发布到 `docker.io/labring/` 作为官方的应用镜像。它支持构建 Docker 容器镜像以及应用的集群镜像。

## 镜像的类型

仓库支持三种类型的镜像构建：

- **APP集群镜像**：主要是构建应用镜像，使用 GitHub Action，会同时支持 amd64 和 arm64 架构。
- **配置集群镜像**：主要是构建配置镜像，使用 GitHub Action，没有容器镜像不区分架构，一般是一些脚本相关的配置或者覆盖默认的配置镜像。
- **Docker镜像**：主要是构建容器镜像，使用 GitHub Action，会同时支持 amd64 和 arm64 架构。

## 镜像构建的工作流程

你可以直接在 GitHub 仓库中创建 Issue 来触发镜像的构建。这里提供了几个示例可以参考：

- `/imagebuild_dockerimages helm v3.8.2 Key1=Value1,Key2=Value2`
- `/imagebuild_configs coredns v0.0.1`
- `/imagebuild_apps helm v3.8.2`

每种类型的镜像构建命令的格式为 `/imagebuild_<类型> <应用名称> <版本> [Key=Value,...]`，其中 `<类型>` 是 `dockerimages`、`configs` 或 `apps`， `<应用名称>` 和 `<版本>` 分别代表应用的名称和版本，`[Key=Value,...]` 是可选的buildArg参数，仅用于 `dockerimages` 类型。

## 镜像配置的存放位置

你可以在 `applications/<应用名称>/<版本>/` 目录下放置你的配置文件，包括 Dockerfile、Kubefile 和 init.sh 等。init.sh 脚本通常用于下载一些依赖的二进制文件，如 helm、kubectl-minio 等。你可以选择使用 Dockerfile 或 Kubefile 来编写你的镜像构建逻辑。

## 镜像构建规则

对于每种类型的镜像，构建规则略有不同。通常，你需要在应用的目录下创建不同的子目录并放置不同类型的文件，然后 Sealos 会根据这些文件来构建镜像。具体的规则如下：

1. `charts` 目录：放置一些集群镜像需要的 Helm chart，Kubernetes 会根据扫描的 chart 获取镜像并构建

出 registry 目录放到与 Kubefile 同级的目录。
2. `manifests` 目录：直接放置一些 Kubernetes yaml 配置，Kubernetes 会扫描 manifests 目录所有的镜像并构建出 registry 目录放到与 Kubefile 同级的目录。
3. `images/shim` 目录：主要存储一些额外的镜像列表并构建出 registry 目录放到与 Kubefile 同级的目录。
4. 如果需要模板，在 `etc`、`charts`、`manifests` 放置一些以 `.tmpl` 结尾的文件可以被 `sealos run` 环境变量渲染后去掉 `.tmpl`，比如渲染之前是 `aa.yaml.tmpl`，渲染后为 `aa.yaml`。请注意文件名不要与现有的文件冲突。
5. `registry` 必须放在与 Kubefile 同级的目录，否则无法拷贝到 master0 的私有仓库。制作镜像时也需要注意这一点。不要把 registry 存放到 chart 里，否则 helm 扫描可能会很慢，可能导致 OOM。 
