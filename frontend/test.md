### 内部开发与部署操作指南

---

#### 1. 本地环境打包测试

在本地开发环境中，执行以下命令以完成代码打包和测试：

```bash
pnpm -r --filter ./providers/dbprovider run build
```

此命令会针对 `dbprovider` 模块进行构建，确保代码能够正常打包且无编译错误。

---

#### 2. 打包并上传到 Docker Registry

##### 2.1 环境准备

- 确保本地已安装 Docker 环境。
- 建议使用阿里云容器镜像服务托管 Docker 镜像。请先登录阿里云账户并开通容器镜像服务，创建命名空间和镜像仓库。

##### 2.2 登录阿里云 Docker Registry

执行以下命令登录阿里云 Docker Registry（请替换 `<your-username>` 为您的阿里云账号用户名）：

```bash
docker login --username=<your-username> crpi-visd77fbydeujidg.cn-hangzhou.personal.cr.aliyuncs.com
```

##### 2.3 打包镜像

运行以下命令打包镜像：

```bash
sudo make image-build-providers/dbprovider
```

##### 2.4 查看本地镜像

执行以下命令查看本地已打包的镜像：

```bash
docker images
```

示例输出：

```
REPOSITORY                                                                          TAG         IMAGE ID       CREATED          SIZE
sealos-dbprovider                                                                   dev         79798c8f327b   21 seconds ago   283MB
crpi-visd77fbydeujidg.cn-hangzhou.personal.cr.aliyuncs.com/dilettante/db-provider   v20250314   44066ed79aad   4 hours ago      283MB
```

##### 2.5 重命名并推送镜像

1. 使用 `docker tag` 命令为镜像重新命名（请确保镜像 ID 和目标镜像名称正确无误）：

   ```bash
   docker tag <image-id> crpi-visd77fbydeujidg.cn-hangzhou.personal.cr.aliyuncs.com/dilettante/db-provider:<your-tag>
   ```

   示例：

   ```bash
   docker tag 79798c8f327b crpi-visd77fbydeujidg.cn-hangzhou.personal.cr.aliyuncs.com/dilettante/db-provider:v20250314v2
   ```

2. 使用 `docker push` 命令将镜像推送至阿里云容器镜像服务：

   ```bash
   docker push crpi-visd77fbydeujidg.cn-hangzhou.personal.cr.aliyuncs.com/dilettante/db-provider:<your-tag>
   ```

   示例：

   ```bash
   docker push crpi-visd77fbydeujidg.cn-hangzhou.personal.cr.aliyuncs.com/dilettante/db-provider:v20250314v2
   ```

---

#### 3. 部署到测试集群

##### 3.1 修改 Pod 配置

在 Kubernetes 测试集群中，执行以下命令编辑 `dbprovider-frontend` 命名空间下的 Pod 配置：

```bash
kubectl edit pod -n dbprovider-frontend
```

在编辑界面中，通过输入 `/image` 快速定位到 `image` 字段，将镜像地址修改为刚刚上传的镜像标签（如 `crpi-visd77fbydeujidg.cn-hangzhou.personal.cr.aliyuncs.com/dilettante/db-provider:v20250314v2`）。

##### 3.2 查看 Pod 状态

保存配置后，执行以下命令查看 Pod 是否正常运行：

```bash
kubectl get pod -n dbprovider-frontend
```

##### 3.3 访问测试环境

访问测试环境地址 [https://192.168.10.35.nip.io/](https://192.168.10.35.nip.io/)，验证应用是否正常运行。如果无法访问，请检查网络连接或确认链接的合法性，并适当重试。

---

#### 注意事项

1. **镜像标签命名**：建议使用明确的版本号（如 `v20250314v2`）代替默认的 `latest`，以确保镜像版本的唯一性和可追溯性。
2. **本地开发调试**：在开发过程中，也可以通过访问本地开发环境的 `test-3000` 端口进行调试。

如有疑问或遇到问题，请及时联系开发团队协助解决。