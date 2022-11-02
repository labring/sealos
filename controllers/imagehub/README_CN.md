# imagehub CRD介绍
基于kubebuilder创建的k8s crd，由api和controller组成，参考PROJECT进一步开发。
api分为cr和webhook，imagehub中cr包括Image、Repository、Organization、Datapack；webhook包括cr的cud的Validate check及default填充。

## Image Repository Organization 设计
Image会在controller中同步信息到Repository，同样Repository也会同步信息到Organization中。
三个cr都会在创建时添加lable，方便Datapack按lable查找资源。
无需创建repo/org cr，image cr会自动同步新建：apply image.yaml即可在sealos cloud的imagehub gui上看到上传的image cr信息。

### e.g
```yaml
apiVersion: imagehub.sealos.io/v1
kind: Image
metadata:
  name: labring.mysql.v8.0.25
  namespace: sealos-imagehub
spec:
  name: labring/mysql:v8.0.25
  detail:
    url: www.mysql.com
    keywords: [ mysql, database, operator ]
    description: MySQL is the world's most popular open source database.
    icon: MySQL icon
    docs: MySQL docs
    ID: MySQL ID
    arch: MySQL arch
```

## Datapack 设计
值得注意的是Datapack作为信息集合的一个api，负责对imagehub下的所有信息的整合及对外暴露。

使用时需要先apply一个Datapack，其中spec存放需要的image信息及pack的type，Datapack controller会立刻返回Status.code=PENDING，后
根据imagehub的其他cr聚合信息，完成后更新data到Status，这时再get Datapack即可拿到需要的数据。

sealos cloud在使用时会根据Datapack的spec的hash作为Datapack的metadata.name，这样在多用户获取同一Datapack时支持“缓存”。
### e.g
```yaml
apiVersion: imagehub.sealos.io/v1
kind: DataPack
metadata:
  name: datapack-detail-sample
  namespace: sealos-imagehub
spec:
  type: detail
  names:
    - labring/mysql:v8.0.25
    - labring/mysql:v8.0.31 
```
