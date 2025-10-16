---
sidebar_position: 6
---

# Manage IPVS

The `ipvs` command is used to create and manage local IPVS (IP Virtual Server) load balancing. IPVS is a module in the Linux kernel that allows high-performance load balancing to be implemented in the kernel space. The `ipvs` command achieves load balancing of services by managing the mapping between virtual servers and real servers.

`sealctl ipvs` supports the following features:

1. Creation and management of mappings between virtual servers and real servers.
2. Health-check functionality to periodically check the health status of real servers and perform necessary online/offline operations.
3. Support for two proxy modes: `route` and `link`.
4. Support for configuring proxy scheduling algorithms (e.g., round-robin, weighted round-robin, etc.).
5. Support for one-time creation of proxy rules (`--run-once` flag) or continuous operation and management of proxy rules.
6. Support for cleanup: Existing IPVS rules can be cleared and the command will exit using the `-C` or `--clean` flag.

With the `sealctl ipvs` command, users can easily create and manage high-performance load balancing services locally.

**Usage**

```shell
sealctl ipvs [flags]
```

**Options**

- `-C`, `--clean`: Clear existing rules and then exit.
- `--health-insecure-skip-verify`: Skip verification of insecure requests (default is true).
- `--health-path string`: URL path for probing (default is "/healthz").
- `--health-req-body string`: Request body sent by the health checker.
- `--health-req-headers stringToString`: HTTP request headers (default is []).
- `--health-req-method string`: HTTP request method (default is "GET").
- `--health-schem string`: HTTP scheme for the probe (default is "https").
- `--health-status ints`: Valid status codes.
- `-h`, `--help`: Help for ipvs.
- `-i`, `--iface string`: Name of the virtual interface to create, behaving the same as kube-proxy (default is "lvscare"). Enabled only in mode=link.
- `--interval durationOrSecond`: Health check interval (default is 0s).
- `--ip ip`: Target IP as the routing gateway, used together with mode=route.
- `--logger string`: Log level: DEBG/INFO (default is "INFO").
- `--masqueradebit int`: IPTables masquerade bit. Enabled only in mode=link.
- `--mode string`: Proxy mode: route/link (default is "route").
- `--rs strings`: Real server addresses, e.g., 192.168.0.2:6443.
- `--run-once`: Create proxy rules and then exit.
- `--scheduler string`: Proxy scheduler (default is "rr").
- `--vs string`: Virtual server address, e.g., 169.254.0.1:6443.

**Global Options**

- `--debug`: Enable debug logging.
- `--show-path`: Enable displaying code path.

**Documentation**

To use the `sealctl ipvs` command, follow these steps:

1. Provide the necessary options and parameters for the command.
2. Execute the command, which will create or manage local IPVS load balancing.

**Examples**

Create proxy rules and then exit:

```shell
sealctl ipvs --vs 169.254.0.1:6443 --rs 192.168.0.2:6443 --run-once
```

Clear existing IPVS rules:

```shell
sealctl ipvs --clean
