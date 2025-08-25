---
sidebar_position: 4
---

# hosts 管理

`hosts` 命令是用于管理操作系统的 hosts 文件。hosts 文件是一个用于解析域名到 IP 地址的文件，通常在本地系统中用于覆盖 DNS 解析。通过修改 hosts 文件，您可以为一个特定的域名分配一个自定义的 IP 地址，而不必依赖 DNS 服务器。

`sealctl hosts` 提供了以下三个子命令来实现 hosts 文件的管理：

1. `list`：列出当前 hosts 文件中的所有条目。
2. `add`：向 hosts 文件中添加一个新的域名与 IP 地址映射。
3. `delete`：从 hosts 文件中删除一个指定的域名与 IP 地址映射。

通过这些子命令，您可以方便地查看、添加和删除 hosts 文件中的映射，从而更好地控制域名到 IP 地址的解析。

1. `sealctl hosts list`：列出当前 hosts 文件中的条目。

   示例：

   ```shell
   sealctl hosts list
   ```



2. `sealctl hosts add`：向 hosts 文件中添加一个新条目。

   参数：

    - `--ip`：IP 地址（必填）
    - `--domain`：域名（必填）

   示例：

   ```shell
   sealctl hosts add --ip 192.168.1.100 --domain example.com
   ```

3. `sealctl hosts delete`：从 hosts 文件中删除一个条目。

   参数：

    - `--domain`：要删除的域名（必填）

   示例：

   ```shell
   sealctl hosts delete --domain example.com
   ```

注意：您可以在任何 `hosts` 子命令后面添加 `--path` 参数来指定 hosts 文件的路径。默认路径为 `/etc/hosts`（Linux 系统）。

示例：

```shell
sealctl hosts list --path /custom/path/hosts
```

