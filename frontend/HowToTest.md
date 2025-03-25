### 内部开发与部署操作指南


#### 1. 本地环境打包测试

在本地开发环境中，执行命令完成代码打包和测试。例：

```bash
pnpm -r --filter ./providers/dbprovider run build
```

此命令会针对 `dbprovider` 模块进行构建，确保在本地开发环境中代码能够正常打包且无编译错误。

---

#### 2. 打包并上传到 Docker Registry

##### 2.1 环境准备

- 确保本地已安装 Docker 环境。
- 建议使用阿里云容器镜像服务托管 Docker 镜像。请先登录阿里云账户并开通容器镜像服务，创建命名空间和镜像仓库。

##### 2.2 登录阿里云 Docker Registry

执行以下命令登录阿里云 Docker Registry（请替换 `<your-username>` 为您的阿里云账号用户名，`<your-registry>` 为您的阿里云容器镜像服务地址）：

```bash
docker login --username=<your-username> <your-registry>
# 例：docker login --username=<your-username> crpi-visd77fbydeujidg.cn-hangzhou.personal.cr.aliyuncs.com
```

##### 2.3 打包镜像

运行以下命令打包镜像：

```bash
make image-build-<app>
# 例：make image-build-providers/dbprovider
```

##### 2.4 查看本地镜像

执行以下命令查看本地已打包的镜像：

```bash
docker images
```

示例输出：

```
REPOSITORY                                                                          TAG         IMAGE ID       CREATED          SIZE
<your-local-image>                                                                  dev         <image-id>     21 seconds ago   <image-size>
<your-registry>/<your-namespace>/<your-image-name>                                  <your-tag>   <image-id>     4 hours ago      <image-size>
```

##### 2.5 重命名并推送镜像

1. 使用 `docker tag` 命令为镜像重新命名（请确保镜像 ID 和目标镜像名称正确无误）：

   ```bash
   docker tag <image-id> <your-registry>/<your-namespace>/<your-image-name>:<your-tag>
   ```

2. 使用 `docker push` 命令将镜像推送至阿里云容器镜像服务：

   ```bash
   docker push <your-registry>/<your-namespace>/<your-image-name>:<your-tag>
   # 例：docker push crpi-visd77fbydeujidg.cn-hangzhou.personal.cr.aliyuncs.com/xxxxxxx/db-provider:v20250314
   ```

---

#### 3. 部署到测试集群

##### 3.1 修改 Pod 配置

在 Kubernetes 测试集群中，执行以下命令编辑 `<your-namespace>` 命名空间下的 Pod 配置：

```bash
kubectl edit pod -n <your-namespace>
# 例：kubectl edit pod -n dbprovider-frontend
```

在编辑界面中，通过输入 `/image` 搜索定位到 `image` 字段，将镜像地址修改为刚刚上传的镜像标签（如 `<your-registry>/<your-namespace>/<your-image-name>:<your-tag>`）。

##### 3.2 查看 Pod 状态

保存配置后，执行以下命令查看 Pod 是否正常运行：

```bash
kubectl get pod -n <your-namespace>
```

##### 3.3 访问测试环境

访问测试环境地址 https://192.168.10.35.nip.io/ ，验证应用是否正常运行。

---

#### 注意事项

1. **镜像标签命名**：建议使用明确的版本号（如 `<your-tag>`）代替默认的 `latest`，以确保镜像版本的唯一性和可追溯性，以否则镜像推送后测试环境不会及时更新。
2. **本地开发调试**：在开发过程中，也可以通过访问测试集群的 `test-3000` 应用进行调试。

