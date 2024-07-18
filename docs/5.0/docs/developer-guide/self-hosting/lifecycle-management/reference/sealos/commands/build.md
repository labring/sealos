---
sidebar_position: 6
---

# build 构建镜像

Sealos 的 `build` 命令用于使用 Sealfiles、Kubefiles、Dockerfiles 或 Containerfiles 中的指令构建 OCI 镜像。这是 Sealos 构建集群镜像的基础命令。

如果没有指定任何参数，Sealos 将使用当前工作目录作为构建上下文，并查找指令文件。如果不存在 Sealfile、Kubefile、Dockerfile 或 Containerfile，则构建失败。

下面是一些主要的 `build` 选项：

1. `--all-platforms`：尝试为所有基础镜像平台构建镜像。
2. `--authfile`：认证文件的路径。
3. `--build-arg`：向构建器提供的 `argument=value`。
4. `--build-context`：向构建器提供额外构建上下文的 `argument=value`。
5. `--creds`：访问 registry 使用的 `[username[:password]]`。
6. `-D, --disable-compression`：默认不压缩图层。
7. `--env`：为镜像设置环境变量。
8. `-f, --file`：Dockerfile 的 `pathname 或 URL`。
9. `--force-rm`：即使构建不成功，也始终在构建后删除中间容器。
10. `--format`：构建的镜像的清单和元数据的 `format`。
11. `--from`：用于替换 Containerfile 中第一条 FROM 指令的值的镜像名称。
12. `--http-proxy`：传递 HTTP Proxy 环境变量。
13. `--isolation`：使用的进程隔离 `type`。可以是 'oci' 或 'chroot'。
14. `--max-pull-procs`：拉取时使用的最大 goroutine 数量。
15. `--platform`：设置镜像的 OS/ARCH/VARIANT 为提供的值，而不是主机的当前操作系统和架构。
16. `--pull`：从 registry 拉取镜像，如果新的或存储中不存在，则拉取，如果 false，只有在不存在时才拉取镜像，如果 always，即使命名的镜像存在于存储中，也拉取镜像，如果 never，只使用存储中可用的镜像。
17. `-q, --quiet`：克制不宣布构建指令和镜像读/写进度。
18. `--retry`：在执行 push/pull 失败时重试的次数。
19. `--retry-delay`：在 push/pull 失败时重试的延迟。
20. `--rm`：在成功构建后删除中间容器。
21. `--save-image`：保存从特定目录解析的镜像，以 registry 格式存储。
22. `--sign-by`：使用指定 `FINGERPRINT` 的 GPG 密钥签名镜像。
23. `-t, --tag`：应用到构建镜像的标签 `name`。

24. `--target`：设置要构建的目标构建阶段。
25. `--timestamp`：将创建的时间戳设置为指定的 epoch 秒，以允许确定性构建，默认为当前时间。

这些选项可以灵活地应对多种构建需求，包括针对特定平台的构建、环境变量设置、构建上下文管理、镜像签名等。使用 `--save-image` 选项，Sealos 可以自动识别镜像列表（包括从镜像列表、Helm charts、manifests 中解析出的镜像）并保存为 registry 格式。

进程隔离模式 `--isolation` 支持 'oci' 和 'chroot' 两个参数。如果本地支持 OCI，可以选择 'oci' 模式；如果不支持 OCI，应该使用 'chroot' 模式。

`--save-image` 是 Sealos 构建命令的一个选项，这个选项的作用是在构建过程中自动查找并保存需要的镜像。在 Sealos 中，构建一个镜像可能涉及到其他依赖镜像。这些依赖镜像可能来自镜像列表、Helm charts 或 集群 manifests。当使用 `--save-image` 选项时，Sealos 将根据构建上下文，自动解析这些依赖并将其保存为 Docker Registry 格式。

例如，以下是一个使用 `--save-image` 选项的示例：

```bash
sealos build -t myapp:v1.0.0 -f Dockerfile .
```

在这个示例中，Sealos 将使用当前目录作为构建上下文，从 Dockerfile 文件中读取构建指令，并尝试构建出一个标记为 `myapp:v1.0.0` 的镜像。同时，Sealos 将解析 Dockerfile 文件中所有 `FROM` 指令引用的基础镜像，并将这些镜像保存下来。这些镜像将以 Docker Registry 的格式保存，可以被直接推送到 Docker Registry 中。

如果你的构建上下文中还包含了 Helm charts 或 集群manifests，Sealos 也会解析这些文件中引用的镜像，并将这些镜像一并保存。

总的来说，`--save-image` 选项为 Sealos 的构建过程提供了一种自动处理依赖镜像的方式，大大提高了构建镜像的便捷性和效率。

下面有一些详细的示例：

- [基于镜像清单构建](/self-hosting/lifecycle-management/operations/build-image/build-image-image_list.md)
- [基于部署清单构建](/self-hosting/lifecycle-management/operations/build-image/build-image-manifests.md)
- [基于helm-charts构建](/self-hosting/lifecycle-management/operations/build-image/build-image-helm_charts.md)
- [基于二进制构建](/self-hosting/lifecycle-management/operations/build-image/build-image-binary.md)
- [基于go-template构建](/self-hosting/lifecycle-management/operations/build-image/build-image-go_template.md)
- [基于exec和scp构建](/self-hosting/lifecycle-management/operations/build-image/build-image-scp_exec.md)

通过 Sealos `build` 命令，可以基于多种指令文件构建 OCI 镜像，为sealos提供所需的镜像。这个过程包括处理 Dockerfile 或其他指令文件中的各种指令，如 `FROM`、`RUN`、`ADD` 等，以及处理镜像层次、镜像标签等。构建过程也包括拉取基础镜像、运行命令、保存结果等步骤。每一个步骤都可以通过上述的选项进行详细的控制和定制，以满足不同的构建需求。

以上就是 `sealos build` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
