---
sidebar_position: 9
---

# Tar and Untar in Sealos

Sealos provides the `sealctl tar` and `sealctl untar` commands for compressing and decompressing files or directories. This guide explains how to use these two commands in detail.

## The `sealctl tar` Command

The `sealctl tar` command is used to compress a specified directory path into an archive file. Note that it will strip the parent directory.

**Command Options:**

- `--clear`: Whether to delete the source files after compression, default is false.
- `--compression`: Compression algorithm, available options are tar/gzip/zstd/disable, default is disable.
- `-o, --output`: Path of the archive file.

**Basic Usage:**

```bash
sealctl tar [flags] [options]
```

## The `sealctl untar` Command

The `sealctl untar` command is used to search for archive files that match a glob pattern in the specified source path (`src`) and extract them to the destination path (`dst`).

**Command Options:**

- `--clear`: Whether to delete the source files after extraction, default is false.
- `-o, --output`: Path to extract the archive file.

**Basic Usage:**

```bash
sealctl untar [flags] [options]
```

## Usage Examples

Here are some examples of using the `sealctl tar` and `sealctl untar` commands:

**Create a compressed file:**

```bash
sealctl tar --output=/path/to/archive.tar /path/to/source
```

The above command compresses the `source` directory into the `archive.tar` file.

**Extract a compressed file:**

```bash
sealctl untar --output=/path/to/destination /path/to/archive.tar
```

The above command extracts the `archive.tar` file to the `destination` directory.

With the `sealctl tar` and `sealctl untar` commands, users can easily compress and decompress files or directories. These commands are useful tools for file management, particularly in backup and file migration scenarios.
