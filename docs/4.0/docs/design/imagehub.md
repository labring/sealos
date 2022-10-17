---
sidebar_position: 6
---

# imagehub
imagehub旨在sealos及sealos cloud上为用户提供类似于dockerhub的镜像管理工具，同时为apphub提供image matedate信息。

## 功能拆分
在sealos cloud及sealos命令行上提供image hub功能
* p0 image hub基本展示和CRUD功能
  * p0 baseInfo及用户提供的detailInfo展示
  * p0 支持搜索，优先级：repo name、keyword
  * p1 按最后上传时间为每一个repo维护一个latest标签的image
  * p2 支持cloud UI上增加image，提供一个页面方便用户添加image及DetailInfo
  * p2 基于上一功能，支持cloud上基于某一个image原本info修改image info
  * P2 applyCRD时 用户没有提供的信息比如 imageID/imageArch，~~通过buildah获取到镜像信息~~
* p0 支持sealos push image基于image中的文件生成imageDetailInfo
* p1 支持imageCRD增删时边界情况下的RepoCRD的增删
* p1 支持org创建、共享，支持对creator与binding的user提供pull/push权限，其他提供pull权限；即org<->user为n对n关系
* p2 image兼容: 在镜像本身没有README.md时, 支持 sealos push image -o README.md解析，不需要开发者重新构建镜像
* p2 sealos search镜像,可以使用registry的_catalog接口实现（待讨论）?

## image hub 设计
### CRD 结构设计与定义
仿照docker hub的结构设计，以sealos push labring/mysql-op:v1为例

**Org向上实现租户权限控制(通过k8s binding及准入控制), 向下保存repository集合**
- "labring" Organization Org
  - repository list


**Repo维护image tag list，需要支持image增删时自动判断是否为空/存在进行删除创建**

- "mysql-op" Repository Repo
  - tags list

**Img保存镜像baseInfo和detailInfo，在sealos push时会读取镜像中的文件加载detailInfo，在集群CMD中新增ImgCRD则需要用户自定义**
- "labring/mysql-op:v1" Image Img
  - baseInfo
    - name: org + repo + tag
  - detailInfo
    * docs: md file.
    * keywords: srting list. 在imagehub中做search用，需要加入到lable中
    * icon: url. 目前仅支持公网URL，默认icon在前端支持
    * Description: string.
    * URL: url.
    * id: buildah inspect.
    * arch: buildah inspect.

Img CRD sample
```yaml
apiVersion: imagehub.sealos.io/v1
kind: Image
metadata:
  name: labring.mysql.v8.0.25
  namespace: sealos-imagehub
spec:
  name: labring/mysql:v8.0.25
  namespace: sealos-imagehub
  detail:
    url: www.mysql.com
    keywords: [ mysql, database, operator ]
    description: MySQL is the world's most popular open source database. Whether you are a fast growing web property, technology ISV or large enterprise, MySQL can cost-effectively help you deliver high performance, scalable database applications.
    icon: https://img.icons8.com/external-those-icons-fill-those-icons/96/000000/external-MySQL-programming-and-development-those-icons-fill-those-icons.png
    docs: MySQL docs
    ID: MySQL ID
    arch: MySQL arch
---
apiVersion: imagehub.sealos.io/v1
kind: Image
metadata:
  name: labring.mysql.v8.0.31
  namespace: sealos-imagehub
spec:
  name: labring/mysql:v8.0.31
  detail:
    url: www.mysql.com
    keywords: [ mysql, database, operator ]
    description: MySQL is the world's most popular open source database. Whether you are a fast growing web property, technology ISV or large enterprise, MySQL can cost-effectively help you deliver high performance, scalable database applications.
    icon: https://img.icons8.com/external-those-icons-fill-those-icons/96/000000/external-MySQL-programming-and-development-those-icons-fill-those-icons.png
    docs: MySQL docs
    ID: MySQL ID
    arch: MySQL arch
---
apiVersion: imagehub.sealos.io/v1
kind: Image
metadata:
  name: labring.helm.v3.14
  namespace: sealos-imagehub
spec:
  name: labring/helm:v3.14
  detail:
    url: www.mysql.com
    keywords: [ mysql, database, operator ]
    description: MySQL is the world's most popular open source database. Whether you are a fast growing web property, technology ISV or large enterprise, MySQL can cost-effectively help you deliver high performance, scalable database applications.
    icon: https://img.icons8.com/external-those-icons-fill-those-icons/96/000000/external-MySQL-programming-and-development-those-icons-fill-those-icons.png
    docs: MySQL docs
    ID: MySQL ID
    arch: MySQL arch
```

### webhook & etc
todo

## 镜像detailInfo相关

### 镜像文件获取
- 在sealos push时获取，具体参考sealos push时mount和merge操作

### 镜像README.md约定
- 约定README.md放在操作系统根目录下面

README.md seample
```yaml
```

## datapack 设计
为了屏蔽掉imagehub下crd request的不一致性，解耦crd与request，并为提供多种信息粒度的查询，设计了datapack机制。

fulldata聚合imagehub所有crd信息，再根据spec下的查询粒度(type)和查询image name在reconcile里填充返回信息到status。
```go
// FullData will gen at reconcile beginning
type FullData struct {
	ImageInfo ImageInfo `json:"imageInfo,omitempty"`
	RepoInfo  RepoInfo  `json:"repoInfo,omitempty"`
	OrgInfo   OrgInfo   `json:"orgInfo,omitempty"`
	// todo add RatingInfo
}
```

```go
// Data defines all data needs to return
type Data struct {
	// base
	Name ImageName `json:"name,omitempty"`
	// grid
	RepoName   RepoName `json:"repoName,omitempty"`
	Rating     int      `json:"rating,omitempty"`
	Icon       string   `json:"icon,omitempty"`
	AuthorIcon string   `json:"authorIcon,omitempty"`
	Keywords   []string `json:"keywords,omitempty"`
	// detail
	Tags        TagsData `json:"tags,omitempty"`
	URL         string   `json:"URL,omitempty"`
	Description string   `json:"description,omitempty"`
	Docs        string   `json:"docs,omitempty"`
	ID          string   `json:"ID,omitempty"`
	Size        int64    `json:"size,omitempty"`
	Arch        string   `json:"arch,omitempty"`
}
```

### DataPack CRD sample
```yaml
apiVersion: imagehub.sealos.io/v1
kind: DataPack
metadata:
  name: datapack-base-sample
  namespace: sealos-imagehub
spec:
  type: base
  names:
    - labring/mysql:v8.0.25
```
需要注意的是，metadata中namespace需要固定为sealos-imagehub，name需要固定为spec的hash，
其一的目的是固定hub所在的namespace，方便datapack get/list imagehub下的crd；
其二的目的是利用datapack的“缓存机制”：已经创建的datapack crd不会立刻删除，而是会不断reconcile直到超时，
  这样一方面解决了datapack只增不减的问题，另一方面为不同用户的前端调用提供”缓存”；


# 用户使用sealos image hub 流程
- 登录注册cloud
- 查看hub token or pw
- 用户命令行执行: sealos login hub.sealos.io -u -p or -token
  - 下载kubeconf到${workdir}/.sealos/
- sealos push
  - 解析image中的README.md, 获取img detail
  - client-go使用kubeconf添加img crd
- 发散
  - sealos search镜像
  - image兼容: 在镜像本身没有README.md时, 支持 sealos push image -o README.md解析
