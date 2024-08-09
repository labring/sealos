---
sidebar_position: 6
---

# inspect 详细信息

Sealos 的 `inspect` 命令主要用于查看构建容器或已构建镜像的配置信息。该命令支持查看镜像或容器的详细信息，包括其元数据、环境变量、启动命令等。

## 基本用法

使用 `sealos inspect` 命令查看指定容器或镜像的配置信息。例如，查看指定容器的配置：

```bash
sealos inspect containerID
```

或者查看指定镜像的配置：

```bash
sealos inspect --type image imageWithTag
```

## 示例

以下是 `sealos inspect` 命令的一些常见示例：

1. 查看容器配置：

    ```bash
    sealos inspect containerID
    ```

2. 查看镜像配置：

    ```bash
    sealos inspect --type image imageWithTag
    ```
    
3. 查看镜像ID的配置信息：

    ```bash
    sealos inspect --type image @imageID # 或直接输入imageID, '@' 是可选的
    ```

4. 查看远程镜像仓库的配置信息：

    ```bash
    sealos inspect --type image docker://alpine:latest
    ```
    
5. 查看本地OCI归档文件中镜像的配置信息：

    ```bash
    sealos inspect --type image oci-archive:/abs/path/of/oci/tarfile.tar
    ```

6. 查看本地Docker归档文件中镜像的配置信息：

    ```bash
    sealos inspect --type image docker-archive:/abs/path/of/docker/tarfile.tar
    ```

7. 使用 Go 模板格式显示镜像环境变量：

    ```bash
    sealos inspect --format '{{.OCIv1.Config.Env}}' alpine
    ```

## 参数

以下是 `sealos inspect` 命令的一些常用参数：

- `-f, --format`：使用 Go 模板格式显示输出结果。**模板结构代码[InspectOutput](https://github.com/labring/sealos/blob/f8a17787822714c5fdf21f2a75cc86fadb88adfa/pkg/buildah/inspect.go#L189)**

- `-t, --type`：指定查看的类型，可以是容器（`container`）或镜像（`image`）。

根据你的需要，你可以结合使用这些参数，以获取特定的配置信息。例如，使用 `-t` 参数可以指定你想要查看的是容器的配置信息还是镜像的配置信息；使用 `-f` 参数，可以定义特定的输出格式，方便对输出结果进行处理或解析。

以上就是 `sealos inspect` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
