# How to use env

Kubefile (Sealfile):
```shell
FROM scratch
CMD ["echo $(KEY)"]
```

```shell
sealos built -t env:latest .
```

```shell
sealos run --env KEY=value env:latest
```

The terminal will output `value`.