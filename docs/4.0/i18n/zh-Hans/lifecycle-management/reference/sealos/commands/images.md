---
sidebar_position: 6
---

# image 镜像列表

Sealos 的 `images` 命令主要用于查看本地存储的镜像。用户可以通过它来查看本地所有的镜像，或者筛选查看特定的镜像。该命令支持多种参数，可以帮助用户更方便的查看和管理镜像。

## 基本用法

基本的 `sealos images` 命令将显示所有非中间阶段的本地镜像，例如：

```bash
sealos images
```

这将显示本地存储的所有最终阶段镜像。

## 示例

以下是 `sealos images` 命令的一些常见示例：

1. 显示所有镜像，包括构建的中间镜像：

    ```bash
    sealos images --all
    ```

2. 显示特定镜像：

    ```bash
    sealos images [imageName]
    ```

3. 以指定的 Go 模板格式显示镜像：

    ```bash
    sealos images --format '{{.ID}} {{.Name}} {{.Size}} {{.CreatedAtRaw}}'
    ```

## 参数

以下是 `sealos images` 命令的一些常用参数：

- `-a, --all`：显示所有镜像，包括构建过程中的中间镜像。

- `--digests`：显示镜像的摘要。

- `-f, --filter`：根据提供的条件过滤输出结果。

- `--format`：使用 Go 模板对镜像进行美化打印。

- `--history`：显示镜像的命名历史。

- `--json`：以 JSON 格式输出。

- `--no-trunc`：不截断输出。

- `-n, --noheading`：不打印列标题。

- `-q, --quiet`：只显示镜像 ID。

通过组合使用这些参数，用户可以轻松地获取和管理本地存储的镜像。例如，使用 `--all` 参数可以查看所有镜像，包括中间镜像；使用 `--filter` 参数可以根据特定条件过滤镜像；使用 `--json` 参数可以以 JSON 格式输出镜像信息，方便进行程序化处理等。

以上就是 `sealos images` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
