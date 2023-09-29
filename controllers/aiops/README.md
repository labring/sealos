# AIops

为应用部署提供大模型服务。（仅包含后端 API）

## API 调用方式

前端点击“AI 生成”按钮后，对 https://${aiops_service_addr}/gen 发起 POST 请求。POST 请求包括四个字段：

1. user_input (必填): 用户请求
2. openai_token (必填): openai_token
3. params (必填): 由前端传入当前页面的应用配置信息
4. parent_message_id (选填): 上一轮对话的 message_id, 带上该参数后可连续对话；前端可设计“重置”按钮，重置后将 parent_message_id 置空(或不带上该字段)，则视为新的一轮对话

### params ( 前端应传入的配置信息 )

![image-20230929161204136](images/README/image-20230929161204136.png)

如上图，则对应的 params 参数应为：

```json
  "params": {
    "app_name": "hello-world",
    "image_name": "nginx",
    "instance": 1,
    "cpu": 1,
    "memory": "64M", 
    "container_port": 80,
    "public_access": false
  }
```

或：

```json
  "params": {
    "app_name": "hello-world",
    "image_name": "nginx",
    "instance": 1,
    "cpu": 1,
    "memory": "64M", 
    "container_port": 80,
    "public_access": false,
    "environment": [],
    "configmap": [],
    "storage": [],
  }
```

每次点击“AI 生成”按钮时，都应捕捉当前页面上的应用配置信息，传入 params 参数。

## Example

### 简单部署

用户请求：请帮我部署一个mysql

```sh
 curl -X POST -H "Content-Type: application/json" -d '{
  "user_input": "请帮我部署一个mysql",
  "openai_token": ${openai_token},
  "params": {
    "app_name": "hello-world",
    "image_name": "nginx",
    "instance": 1,
    "cpu": 1,
    "memory": "64M",
    "container_port": 80,
    "public_access": false
  }
}' https://${aiops_service_addr}/gen
```

响应：

```sh
{"GenParamsStr":"{
	"app_name": "hello-world",
    "image_name": "mysql",
    "instance": 1,  
    "cpu": 1,
    "memory": "1G",
    "container_port": 3306,
    "public_access": false,
    "command": "",
    "parameters": "",
    "environment": [
    	{
    		"name": "MYSQL_ROOT_PASSWORD",
    		"value": "password",
    	}
    ],
    "configmap": null,
    "storage": [
    	{
    	    "capacity": 10,
    		"value": "/var/lib/mysql",
    	}
    ],
    }",
 "MessageId":"7246d209-adbe-4ea3-9a66-2c5bea27d9e7"}
```

### 多轮对话

基于[简单部署]，用户再次请求：把内存和CPU量调低些

响应：
```sh
{"GenParamsStr":"{
    "cpu": 0.5,
    "memory": "512M",
    }",
 "MessageId":"df891984-3925-4d9f-bc61-db1b6c334b82"}
```

### 复杂部署

直接复制粘贴文档中的内容：

![image-20230929164037968](images/README/image-20230929164037968.png)

请求：

```sh
 curl -X POST -H "Content-Type: application/json" -d '{
  "user_input": "自定义应用名称;镜像名称设置为 halohub/halo:2.5;CPU 和存储应根据实际情况进行配置，memory 需要 500Mi 的内存才能启动 Halo，这里可以参考官方 prepare：https://docs.halo.run/getting-started/prepare;暴露端口应为 8090。同时，设置为外网访问将自动为应用配置一个出口域名用于外网访问，同时需要在 Halo 中进行配置该地址;环境变量包括数据库配置和其他相关配置。需要注意的是，你需要根据你在 步骤 1 中设置的用户名、密码和 DNS 来配置数据库连接信息。同时，你还需要为 Halo 配置超级管理员的用户名和密码。;配置 Halo 环境变量:spring.sql.init.platform=postgresql spring.r2dbc.url=r2dbc:pool:postgresql://postgres:rcx7f47m@dbname-postgresql.ns-sy32q9p9.svc:5432/halo spring.r2dbc.username=postgres spring.r2dbc.password=rcx7f47m halo.external-url=tmtdvfjiyyfh.cloud.sealos.io halo.security.initializer.superadminusername=root halo.security.initializer.superadminpassword=sealos",
  "openai_token": "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",
  "params": {
    "app_name": "hello-world",
    "image_name": "nginx",
    "instance": 1,
    "cpu": 1,
    "memory": "64M",
    "container_port": 80,
    "public_access": false
  }
}' http://localhost:8080/gen
```

响应：

```sh
{"GenParamsStr":"{
	"app_name": "halo",
    "image_name": "halohub/halo:2.5",
    "instance": 1,
    "cpu": 1,
    "memory": "512M",
    "container_port": 8090,
    "public_access": true,
    "command": "",
    "parameters": "",
    "environment": [
    	{      
    		"name": "spring.sql.init.platform",
        	"value": "postgresql"
    	},
        {
        	"name": "spring.r2dbc.url",
            "value": "r2dbc:pool:postgresql://postgres:rcx7f47m@dbname-postgresql.ns-sy32q9p9.svc:5432/halo"
        },
        {      
        	"name": "spring.r2dbc.username",
            "value": "postgres"
        },
        {      
        	"name": "spring.r2dbc.password",
            "value": "rcx7f47m"
        },
        {      
        	"name": "halo.external-url",
            "value": "tmtdvfjiyyfh.cloud.sealos.io"
        },
        {
        	"name": "halo.security.initializer.superadminusername",
            "value": "root"
        },    
        {
        	"name": "halo.security.initializer.superadminpassword",
            "value": "sealos"
        }
    ],
    "configmap": null,
    "storage": null
    }",
 "MessageId":"1c8d30e6-464c-459e-8685-678a0973d6c9"}
```

## 部署方式

### 构建镜像

执行：
```sh
docker build -t your-dockerhub-username/your-repo-name:your-tag .
docker push your-dockerhub-username/your-repo-name:your-tag
```

### 部署数据库

![image-20230929165548900](images/README/image-20230929165548900.png)

注意版本选 mongodb-6.0

### 部署应用

![image-20230929165715407](images/README/image-20230929165715407.png)

编辑环境变量：

![image-20230929165829912](images/README/image-20230929165829912.png)

${mongo_uri} 替换为 

![image-20230929165953031](images/README/image-20230929165953031.png)

部署完成后，对应用的外网地址发起 curl 请求，如：

```sh
 curl -X POST -H "Content-Type: application/json" -d '{
  "user_input": "请帮我部署一个mysql",
  "openai_token": ${openai_token},
  "params": {
    "app_name": "hello-world",
    "image_name": "nginx",
    "instance": 1,
    "cpu": 1,
    "memory": "64M",
    "container_port": 80,
    "public_access": false
  }
}' https://${aiops_service_addr}/gen
```

正常响应即为部署成功。