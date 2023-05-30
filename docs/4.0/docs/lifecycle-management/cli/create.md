# Create cluster workdir

Create a mysql cluster with custom cluster name:

```shell
$ sealos create mysql:8.0 -c mysql
```

Creating is similar to dry-run, where only the workdir is created and the command in `CMD` is not actually executed.
