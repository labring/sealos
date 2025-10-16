---
sidebar_position: 2
---

# 快速安装 Halo

在 Sealos 上快速部署 Halo 博客平台

![](../images/halo_img-1.png)

[Halo](https://github.com/halo-dev/halo) 是一款强大易用的开源建站工具，本文将介绍如何在 Sealos 上部署 Halo，同时在 [Sealos 上部署 PostgreSQL](../../quick-start/install-db-with-database.md) 可以帮助你轻松地管理和维护数据库，以满足不同的业务需求。

## 步骤 1：准备 PostgreSQL

### 使用 Sealos 数据库安装 PostgreSQL

参考 [Sealos 上部署 PostgreSQL](../../quick-start/install-db-with-database.md) ，一分钟即可成功安装和使用 PostgreSQL。

### 查看数据库配置：

保存这里生成的配置中包含数据库的用户名密码以及数据库连接方式，用于下文 Halo 中配置：

![](../images/halo_img-6.png)

> 图中可以看到 PostgreSQL 连接配置为：
>
> Username: postgres
>
> Password: rcx7f47m
>
> Connection: postgresql://postgres:rcx7f47m@dbname-postgresql.ns-sy32q9p9.svc:5432

## 步骤 2: 在 Sealos 中部署 Halo应用

### 打开 应用管理

![](../images/halo_img-7.png)

![](../images/halo_img-8.png)

### 填写配置

- 自定义应用名称

- 镜像名称设置为 `halohub/halo:2.5`

- CPU 和存储应根据实际情况进行配置，memory 需要 `500Mi` 的内存才能启动 Halo，这里可以参考官方 prepare：https://docs.halo.run/getting-started/prepare

- 暴露端口应为 `8090`。同时，设置为外网访问将自动为应用配置一个出口域名用于外网访问，同时需要在 Halo 中进行配置该地址

- 环境变量包括数据库配置和其他相关配置。需要注意的是，你需要根据你在 [步骤 1](查看数据库配置：) 中设置的用户名、密码和 DNS 来配置数据库连接信息。同时，你还需要为 Halo 配置超级管理员的用户名和密码。

配置 Halo 环境变量

```Bash
spring.sql.init.platform=postgresql
spring.r2dbc.url=r2dbc:pool:postgresql://postgres:rcx7f47m@dbname-postgresql.ns-sy32q9p9.svc:5432/halo
spring.r2dbc.username=postgres
spring.r2dbc.password=rcx7f47m
halo.external-url=tmtdvfjiyyfh.cloud.sealos.io
halo.security.initializer.superadminusername=root
halo.security.initializer.superadminpassword=sealos
```

环境变量配置详解：

| 参数名                                       | 描述                                                     |
| -------------------------------------------- | -------------------------------------------------------- |
| spring.r2dbc.url                             | 数据库连接地址，详细可查阅下方的 数据库链接格式          |
| spring.r2dbc.username                        | 数据库用户名                                             |
| spring.r2dbc.password                        | 数据库密码                                               |
| spring.sql.init.platform                     | 数据库平台名称，支持 postgresql、mysql、h2               |
| halo.external-url                            | 外部访问链接，如果需要在公网访问，需要配置为实际访问地址 |
| halo.security.initializer.superadminusername | 初始超级管理员用户名                                     |
| halo.security.initializer.superadminpassword | 初始超级管理员密码                                       |

数据库的链接格式（这里我们使用 postgresql 的格式）：

| 链接方式    | 链接地址格式                                                                       | spring.sql.init.platform |
| ----------- | ---------------------------------------------------------------------------------- | ------------------------ |
| PostgreSQL  | r2dbc:pool:postgresql://`{HOST}`:`{PORT}`/`{DATABASE}`                             | postgresql               |
| MySQL       | r2dbc:pool:mysql://`{HOST}`:`{PORT}`/`{DATABASE}`                                  | mysql                    |
| MariaDB     | r2dbc:pool:mariadb://`{HOST}`:`{PORT}`/`{DATABASE}`                                | mysql                    |
| H2 Database | r2dbc:h2:file:///`${halo.work-dir}`/db/halo-next?MODE=MySQL&DB_CLOSE_ON_EXIT=FALSE | h2                       |

### 网络配置

![](../images/halo_img-9.png)

### 环境变量配置

![](../images/halo_img-10.png)

### 配置持久化存储卷

挂载 `/root/.halo2` 目录来持久化 halo 数据 :

![](../images/halo_img-11.png)

## 步骤 3: 使用外网访问 Halo

成功启动应用后，即可通过外网访问地址访问 Halo 进行配置：

![](../images/halo_img-12.png)

![](../images/halo_img-13.png)

### 初始化 Halo

![](../images/halo_img-14.png)

![](../images/halo_img-15.png)

### First Halo

![](../images/halo_img-16.png)

![](../images/halo_img-17.png)

![](../images/halo_img-18.png)

## FAQ

### 忘记密码

#### 进入 「应用管理」，点击日志查看

![](../images/halo_img-19.png)

![](../images/halo_img-20.png)

可以看到这里的日志中：用户名：`admin`    密码：`QTu2J2xgUQ3ngqUo`

#### 或终端执行如下命令查看日志

![](../images/halo_img-21.png)

```
root@td3q8uc46:~# kubectl logs halo-0 | grep 'Generated random password:' | tail -1
2023-05-30T13:32:16.942+08:00  INFO 7 --- [-controller-t-1] r.h.app.security.SuperAdminInitializer   : === Generated random password: QTu2J2xgUQ3ngqUo for super administrator: admin ===
```

![](../images/halo_img-22.png)