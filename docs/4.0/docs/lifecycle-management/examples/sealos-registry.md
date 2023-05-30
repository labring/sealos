# Using sealctl to manage registry images

## Save images to local registry directory

### default type

The default mode scans images in the context directory. The logic of scanning images is the logic of build images, and the directories of charts, manifests, and images scan images.

```
registry images manager save to local dir by default type

Usage:
  sealos registry save default [CONTEXT] [flags]

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
sealos  registry  save default . 
```

### raw type

raw type using images as image list.

```
registry images manager save to local dir by raw type

Usage:
  sealos registry save raw [flags]

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
sealos  registry  save raw --images nginx
```
