---
sidebar_position: 2
---

# 数据库

**数据库** 是一个应用的核心组成，Sealos 提供了一个数据库集群部署管理工具，可以帮助你快速部署数据库集群。目前支持 MySQL、PostgreSQL、MongoDB、Redis、Kafka等。目前**数据库** 支持如下特性。

+ 弹性伸缩
+ 支持多版本、多类型 数据库
+ 数据库 连接：一键连接、外网访问
+ 数据库 连接：手动备份、自动备份
+ 数据库 监控：资源、状态、性能监控
+ 数据库 迁移：公网迁移、文件迁移
+ 数据库 高可用：支持多个 数据库 实例
+ 可视化 数据库 管理：新建、删除、更新 、暂停、重启 数据库


## 快速开始

以部署一个 PostgreSQL 数据库为例，体验 **数据库** 的便捷性。

只需 6 步即可完成部署和访问：

1. 在 [Sealos](https://cloud.sealos.io) 桌面进入 **数据库** 应用：

![start_1](./imgs/start_1.png)

2. 点击新建集群：

![start_2](./imgs/start_2.png)

3. 填写数据库名并选择对应的数据库和参数：

![start_3](./imgs/start_3.png)

4. 点击部署：

![start_4](./imgs/start_4.png)

5. 查看数据库详情信息：

![start_5](./imgs/start_5.png)

6. 数据库详情界面：

![start_6](./imgs/start_6.png)

![start_7](./imgs/start_7.png)

![start_8](./imgs/start_8.png)

![start_9](./imgs/start_9.png)

![start_10](./imgs/start_10.png)

![start_11](./imgs/start_11.png)

![start_12](./imgs/start_12.png)


## 数据库连接

### 一键连接

1. 进入 **数据库** ，点击连接：

![connect_1](./imgs/connect_1.png)

2. 在终端操作数据库：

![connect_2](./imgs/connect_2.png)


### 外网访问

1. 进入 **数据库** ，开启外网访问：

![connect_3](./imgs/connect_3.png)

2. 确认开启：

![connect_4](./imgs/connect_4.png)

3. 复制数据库连接信息：

![connect_5](./imgs/connect_5.png)

4. 在数据库连接工具中连接数据库：

![connect_6](./imgs/connect_6.png)

![connect_7](./imgs/connect_7.png)


## 数据库备份

### 手动备份
1. 进入数据库备份界面，点击备份：

![backup_1](./imgs/backup_1.png)

2. 填写备份信息，开始备份：

![backup_2](./imgs/backup_2.png)

3. 查看备份状态：

![backup_3](./imgs/backup_3.png)

![backup_4](./imgs/backup_4.png)


### 自动备份
1. 进入数据库备份界面，点击备份：

![backup_5](./imgs/backup_5.png)

2. 开启自动备份，填写备份信息：

![backup_6](./imgs/backup_6.png)


## 数据库迁移

以 MySQL 数据库为例，介绍 数据库迁移 的过程。

### 公网迁移

公网迁移涉及两个数据库：源数据库、目标数据库。源数据库是迁移的数据来源，目标数据库是迁移的数据目的地。以下介绍中以本地数据库做为源数据库进行演示。

1. 进入目标数据库，连接目标数据库：

![migration_1](./imgs/migration_1.png)

2. 在终端界面中创建对应的database（如果已经存在对应的database，则跳过这一步）：

![migration_2](./imgs/migration_2.png)
```bash
# 创建数据库sql语句，示例：
$ create database testmysql;
```

3. 进入目标数据库公网迁移界面，点击迁移按钮：

![migration_3](./imgs/migration_3.png)

4. 查看迁移配置信息：

![migration_4](./imgs/migration_4.png)

复制迁移配置信息，如下：
```bash
# 设置配置信息sql语句，示例：
$ set global binlog_format=ROW;
$ set binlog_row_image ='FULL';
```

5. 在源数据库中执行设置配置信息（MySQL、Postgres需要手动配置信息，Mongo不需要进行配置）：
```bash
# 设置配置信息sql语句，示例：
$ set global binlog_format=ROW;
$ set binlog_row_image ='FULL';
```
![migration_5](./imgs/migration_5.png)

6. 进入目标数据库，填写源数据库的迁移信息，要迁移哪些表，并填写要迁移到目标数据库中哪个database：

![migration_6](./imgs/migration_6.png)

如果需要持续从源数据库迁移数据，可开启高级配置中的持续迁移，如下：

![migration_7](./imgs/migration_7.png)

7. 查看迁移任务信息：

![migration_8](./imgs/migration_8.png)

8. 进入目标数据库，连接目标数据库，检查迁移数据是否完整：

![migration_9](./imgs/migration_9.png)

### 文件迁移

1. 进入目标数据库，连接目标数据库：

![migration_10](./imgs/migration_10.png)

2. 在终端界面中创建对应的database（如果已经存在对应的database，则跳过这一步）：
```bash
# 创建数据库sql语句，示例：
$ create database testmysql;
```
![migration_11](./imgs/migration_11.png)

3. 上传迁移文件、填写数据库名，开始迁移：

![migration_12](./imgs/migration_12.png)

4. 文件迁移中，等待迁移结果：

![migration_13](./imgs/migration_13.png)

![migration_14](./imgs/migration_14.png)

5. 连接数据库，检查迁移数据是否完整：

![migration_15](./imgs/migration_15.png)