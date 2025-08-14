---
sidebar_position: 4
---

# Manage Hosts

The `hosts` command is used to manage the hosts file of the operating system. The hosts file is a file used for domain name resolution to IP addresses and is typically used locally to override DNS resolution. By modifying the hosts file, you can assign a custom IP address to a specific domain name without relying on a DNS server.

`sealctl hosts` provides the following three subcommands to manage the hosts file:

1. `list`: List all entries in the current hosts file.
2. `add`: Add a new domain-to-IP mapping to the hosts file.
3. `delete`: Delete a specified domain-to-IP mapping from the hosts file.

With these subcommands, you can conveniently view, add, and delete mappings in the hosts file, allowing you better control over domain name resolution to IP addresses.

1. `sealctl hosts list`: List all entries in the current hosts file.

   Example:

   ```shell
   sealctl hosts list
   ```

2. `sealctl hosts add`: Add a new entry to the hosts file.

   Parameters:

   - `--ip`: IP address (required)
   - `--domain`: Domain name (required)

   Example:

   ```shell
   sealctl hosts add --ip 192.168.1.100 --domain example.com
   ```

3. `sealctl hosts delete`: Delete an entry from the hosts file.

   Parameters:

   - `--domain`: Domain name to delete (required)

   Example:

   ```shell
   sealctl hosts delete --domain example.com
   ```

Note: You can specify the path of the hosts file by adding the `--path` parameter after any `hosts` subcommand. The default path is `/etc/hosts` (Linux systems).

Example:

```shell
sealctl hosts list --path /custom/path/hosts
```
