# Using sealctl to manage registry images

## Save images to local registry directory

### default type

The default mode scans images in the context directory. The logic of scanning images is the logic of build images, and the directories of charts, manifests, and images scan images.

```
registry images manager save to local dir by default type

Usage:
  sealctl registry save default [CONTEXT] [flags]

Flags:
      --arch string          pull images arch (default "arm64")
      --data-dir string      registry data dir path (default "/var/lib/registry")
  -h, --help                 help for default
      --max-pull-procs int   maximum number of goroutines for pulling (default 5)

Global Flags:
      --debug                   enable debug logger
      --root string             storage root dir (default "/var/lib/containers/storage")
      --runroot string          storage state dir (default "/run/containers/storage")
      --show-path               enable show code path
      --storage-driver string   storage-driver (default "overlay")
      --storage-opt strings     storage driver option
```



#### Usage

```shell
sealctl  registry  save default . 
```

### raw type

raw type using images as image list.

```
registry images manager save to local dir by raw type

Usage:
  sealctl registry save raw [flags]

Flags:
      --arch string          pull images arch (default "arm64")
      --data-dir string      registry data dir path (default "/var/lib/registry")
  -h, --help                 help for raw
      --images strings       images list
      --max-pull-procs int   maximum number of goroutines for pulling (default 5)

Global Flags:
      --debug                   enable debug logger
      --root string             storage root dir (default "/var/lib/containers/storage")
      --runroot string          storage state dir (default "/run/containers/storage")
      --show-path               enable show code path
      --storage-driver string   storage-driver (default "overlay")
      --storage-opt strings     storage driver option
```
#### Usage

```shell
sealctl  registry  save raw --images nginx
```

## Check registry status

To use this command, you need to `sealctl login` or `sealos login` first.

```
registry status

Usage:
  sealctl registry status [flags]

Examples:
sealctl registry status

Flags:
  -h, --help   help for status
      --json   output in JSON format

Global Flags:
      --debug                   enable debug logger
      --root string             storage root dir (default "/var/lib/containers/storage")
      --runroot string          storage state dir (default "/run/containers/storage")
      --show-path               enable show code path
      --storage-driver string   storage-driver (default "overlay")
      --storage-opt strings     storage driver option
```

#### Usage
```shell
$ sealctl registry status
+--------------------+---------------------------+----------+----------+---------+
| Name               | URL                       | UserName | Password | Healthy |
+--------------------+---------------------------+----------+----------+---------+
| 192.168.64.63:5000 | http://192.168.64.63:5000 | admin    | passw0rd | ok      |
+--------------------+---------------------------+----------+----------+---------+
```


## List registry image 

```
registry image list

Usage:
  sealctl registry images [flags]

Examples:
Example:
  sealctl registry images --filter name=public*
  sealctl registry images --filter tag=*1.1*
  sealctl registry images --filter tag=*sec
  sealctl registry images --filter name=public,tag=v1.1.1
  sealctl registry images --filter tag=<none>

Flags:
      --filter string   Filter support 'name' and 'tag' , strategy support prefix (eg key*),suffix(eg *key),equals(eg key),empty(eg <none>),like(eg *key*)
  -h, --help            help for images
      --json            output in JSON format
  -n, --name string     registry name (default "sealos.hub:5000")

Global Flags:
      --debug                   enable debug logger
      --root string             storage root dir (default "/var/lib/containers/storage")
      --runroot string          storage state dir (default "/run/containers/storage")
      --show-path               enable show code path
      --storage-driver string   storage-driver (default "overlay")
      --storage-opt strings     storage driver option
```

#### Usage

```shell
$ sealctl  registry  images -n 192.168.64.63:5000 --filter name=kube*,tag=*
+--------------------+-------------------------+---------+-------------------------------------------------------------------------+
| RegistryName       | ImageName               | Tag     | ImageID                                                                 |
+--------------------+-------------------------+---------+-------------------------------------------------------------------------+
| 192.168.64.63:5000 | kube-apiserver          | v1.19.0 | sha256:522d17d35a8994637d27d1232bebd35cfae8e3e21ab359431403f2b8023e332c |
| 192.168.64.63:5000 | kube-controller-manager | v1.19.0 | sha256:6c11a3d4d06385f7547a5ea0c3f0d5e7b12baa558111d01406ac1f778cb3f00b |
| 192.168.64.63:5000 | kube-proxy              | v1.19.0 | sha256:c752ecbd04bc4517168a19323bb60fb45324eee1e480b2b97d3fd6ea0a54f42d |
| 192.168.64.63:5000 | kube-scheduler          | v1.19.0 | sha256:529a1566960a5b3024f2c94128e1cbd882ca1804f222ec5de99b25567858ecb9 |
+--------------------+-------------------------+---------+-------------------------------------------------------------------------+
2023-01-01T12:31:49 info Image count 4
2023-01-01T12:31:49 info Images Version count 4
```

### Filtering

Keys for `--filter`:
- `name`
- `tag`

Expressions:
- `*val`: suffix
- `val*`: prefix
- `value`: equals
- `<none>`: empty
- `*val*`: contains



## Remove registry image 

```
registry rmi image

Usage:
  sealctl registry rmi [flags]

Examples:
sealctl registry  rmi labring/lvscare:v4.1.3

Flags:
  -h, --help          help for rmi
  -n, --name string   registry name (default "sealos.hub:5000")

Global Flags:
      --debug                   enable debug logger
      --root string             storage root dir (default "/var/lib/containers/storage")
      --runroot string          storage state dir (default "/run/containers/storage")
      --show-path               enable show code path
      --storage-driver string   storage-driver (default "overlay")
      --storage-opt strings     storage driver option
```

#### Usage

```shell
$ sealctl  registry  rmi 192.168.64.63:5000/kube-apiserver:v1.19.0 -n 192.168.64.63:5000
```

## Prune registry

This command can only be run on a registry node, which used the binary deploy mode. Does not support nodes using container deploy mode.

```
registry `garbage-collect` deletes layers not referenced by any manifests

Usage:
  sealctl registry prune [flags]

Flags:
  -c, --config string     registry config path (default "/etc/registry/registry_config.yml")
  -u, --delete-untagged   delete manifests that are not currently referenced via tag
  -d, --dry-run           do everything except remove the blobs
  -h, --help              help for prune

Global Flags:
      --debug                   enable debug logger
      --root string             storage root dir (default "/var/lib/containers/storage")
      --runroot string          storage state dir (default "/run/containers/storage")
      --show-path               enable show code path
      --storage-driver string   storage-driver (default "overlay")
      --storage-opt strings     storage driver option
```

#### Usage

```shell
$ sealctl registry prune
```
