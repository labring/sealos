# 快速安装 FastGpt AI 知识库

FastGpt Git 上推荐使用 docker 部署，因此在 Sealos 上也可以很方便的部署。FastGpt 依赖了 MongoDB 和 PostgreSQL，下面教程仅介绍如何在 Sealos 上部署这两个数据库及 FastGpt 镜像，对于 FastGpt 的环境变量详解及使用说明不详细展开。具体可查阅[FastGpt Git](https://github.com/c121914yu/FastGPT)。

## 1. 创建两个数据库

Sealos 提供了 DB Provider 工具，可以可视化的部署数据库。

### 1.1 从桌面打开 DB Provider 工具。

![1. 打开 DB Provider](./images/open-provider.png)

### 1.2 新建 MongoDB 数据库

![](./images/fast1.png)

可以选择 3 种数据库，这里先创建一个 MongoDB。规格建议选择 0.5C 512Mi 以上。

![](./images/fast2.png)

### 1.3 新建 PostgreSQL 数据库

![](./images/fast3.png)

由于 PostgreSQL 中需要存储向量数据，需要的容量较大，初始容量可以稍微设置高一点。

![](./images/fast4.png)

### 1.4 查看数据库连接参数

可以在进入数据库详情，查看每个数据库的连接参数，包括: host, port, username, password 以及 connectionUrl。
![](./images/fast5.png)
![](./images/fast6.png)

## 2. 初始化 PostgreSQL 数据库

### 2.1 连接 PostgreSQL 数据库

可以在 PostgreSQL 数据库详情里一键连接数据库。

![](./images/fast7.png)

### 2.2 执行 init.sql 内容

复制下面的 sql 粘贴到 terminal 执行。粘贴需使用 ctrl + shift + v。如果一次性复制执行错误，可以每个 sql 分别执行。

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS modelData (
    id BIGSERIAL PRIMARY KEY,
    vector VECTOR(1536) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    kb_id VARCHAR(50) NOT NULL,
    source VARCHAR(100),
    q TEXT NOT NULL,
    a TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS modelData_userId_index ON modelData USING HASH (user_id);
CREATE INDEX IF NOT EXISTS modelData_kbId_index ON modelData USING HASH (kb_id);
CREATE INDEX IF NOT EXISTS idx_model_data_md5_q_a_user_id_kb_id ON modelData (md5(q), md5(a), user_id, kb_id);
CREATE INDEX IF NOT EXISTS vector_index ON modelData USING ivfflat (vector vector_cosine_ops) WITH (lists = 1000);
```

![](./images/fast8.png)

### 2.3 验证初始化

执行 `\d modeldata` 查看表的详请，查看是否符合预期。

![](./images/fast19.png)

## 3. 部署 FastGpt

Sealos 提供了 App Launchpad 工具，可以快速的部署单镜像服务。

### 3.1 从桌面打开 App Launchpad

![](./images/fast9.png)

### 3.2 进入新建应用

![](./images/fast10.png)

### 3.3 填写相关参数

![](./images/fast11.png)
![](./images/fast12.png)

| 关键变量名   | 描述                                                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 应用名称     | 随便填写                                                                                                                                                                |
| 镜像名       | 官网镜像: registry.cn-hangzhou.aliyuncs.com/fastgpt/fastgpt:latest                                                                                                      |
| CPU 和内存   | 按需                                                                                                                                                                    |
| 容器暴露端口 | 必须为 3000                                                                                                                                                             |
| 外网访问     | 打开。App Launchpad 自动分配了域名，可以直接使用，也可以自定义域名。                                                                                                    |
| 环境变量     | 参考[FastGpt docker-compose.yaml](https://github.com/c121914yu/FastGPT/blob/main/docs/deploy/fastgpt/docker-compose.yml)。数据库部分变量，可以直接复制 [1.4] 里的内容。 |

下面是一份去掉注释后的环境变量，可以直接复制修改使用。

```
QA_MAX_PROCESS=20
VECTOR_MAX_PROCESS=20
MY_MAIL=123@qq.com
MAILE_CODE=mailcode
aliAccessKeyId=keyid
aliAccessKeySecret=secret
aliSignName=signname
aliTemplateCode=SMS_111
TOKEN_KEY=tokenkey
ROOT_KEY=rootkey
SENSITIVE_CHECK=1
MONGODB_URI=mongodb://root:8b6zfr4b@fastgpt-mongo-mongodb.ns-hti44k5d.svc:27017
MONGODB_NAME=fastgpt
PG_USER=postgres
PG_PASSWORD=m8tkt57w
PG_HOST=fastgpt-pg-postgresql.ns-hti44k5d.svc
PG_PORT=5432
PG_DB_NAME=postgres
OPENAIKEY=sk-xxx
OPENAI_TRAINING_KEY=sk-xxx
GPT4KEY=sk-xxx
```

![](./images/fast15.png)

### 3.3 访问页面

通过 App Launchpad 提供的外网地址或者自定义域名去访问 FastGpt。

![](./images/fast17.png)
![](./images/fast18.png)
