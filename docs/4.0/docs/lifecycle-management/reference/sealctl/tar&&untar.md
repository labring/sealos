---
sidebar_position: 9
---

# tar 与 untar 详解

Sealos 提供了 `sealctl tar` 和 `sealctl untar` 命令以便于用户进行文件或文件夹的压缩和解压。本文将详细介绍这两个命令的使用方法。

## sealctl tar 命令

`sealctl tar` 命令的主要作用是将指定路径的目录压缩成归档文件。注意，这将剥离父目录。

**命令参数：**

- `--clear`：是否在压缩完成后删除源文件，默认为 false。
- `--compression`：压缩算法，可用选项有 tar/gzip/zstd/disable，默认为 disable。
- `-o, --output`：归档文件的路径。

**基本用法：**

```bash
sealctl tar [flags] [options]
```

## sealctl untar 命令

`sealctl untar` 命令的主要作用是在指定路径 `src` 查找匹配 glob 模式的归档文件，并在 `dst` 路径进行解压。

**命令参数：**

- `--clear`：是否在解压完成后删除源文件，默认为 false。
- `-o, --output`：解压归档文件的路径。

**基本用法：**

```bash
sealctl untar [flags] [options]
```

## 使用示例

以下是一些 `sealctl tar` 和 `sealctl untar` 命令的使用示例：

**创建一个压缩文件：**

```bash
sealctl tar --output=/path/to/archive.tar /path/to/source
```

以上命令将 `source` 目录压缩为 `archive.tar` 文件。

**解压一个压缩文件：**

```bash
sealctl untar --output=/path/to/destination /path/to/archive.tar
```

以上命令将 `archive.tar` 文件解压到 `destination` 目录。

通过 `sealctl tar` 和 `sealctl untar` 命令，用户可以轻松地进行文件或文件夹的压缩和解压操作。这两个命令在文件管理中，尤其是在备份和迁移文件时，都是非常有用的工具。
