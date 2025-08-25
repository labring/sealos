## Quick Start

```shell
# 需要传入完整的包含username passwd的mongo uri来创建secret：
sealos run ghcr.io/labring/sealos-cloud-resources-controller:latest --env MONGO_URI="mongodb://username:passwd@ip:port/sealos-resources?authSource=admin"
```

> 目前默认使用mongodb作为存储: sealos-resources 为数据库名
