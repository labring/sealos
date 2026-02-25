## Sealos systemcall 设计

Systemcall 设计有两大目的

第一：为 skills 提供接口能力，方便各种使用 claude code, codex, openclaw，以及其他支持 skills 的 Agent 能够调用 Sealos 的能力，把业务跑在 Sealos 上。
第二：方便在 Sealos 上开发自己的自定义 APP, 如用户自己开发一个类似 devbox, jotlin, fulling 的应用。

Systemcall 的迭代早期并不需要追求全面，而是根据特定场景的需求来决定开放哪些能力。 对于应用层的 API，应用自己去设定，只有鉴权部分会依赖 systemcall. 

## System 层面有哪些能力

* P0 Kubernetes User 级别权限的能力，具体体现是用户可以创建的各种 CRD.
* P2 User management
* P2 Costcenter
  
## CRD 与 Restful API

Systemcall 有两种方式提供出来，一种是 kuberntes CRD，另外一种是 Restful API，区分一下什么情况用什么形式提供。
如果对应的能力是在系统中创建一个“资源” 如 pod service deployment, 或者更逻辑的资源如 application，那么就应该以 CRD 的形式提供。
如果提供的能力是对应数据库里面的某条数据，那应该提供的就是 restful API，如账单增删改查。

切忌：不要在 CRD 上封装 restful API，或者提供 SDK, 因为对于 AI 来说 CRD 是最标准的易于理解的接口，封装之后反而 AI 要去理解 Sealos 独有的设计逻辑。

## 核心提供的能力

* 容器部署（applaunchpad 对应的能力）
* 数据库

创建/更新/获取数据库访问连接等能力，全通过 CRD 获取，大部分 Sealos 已经具备了对应的接口能力，参考 fulling 的提示词：https://github.com/FullAgent/fulling/tree/main/yaml

* 在 Desktop 内部的网页应用如何获取用户的 kubeconfig 的 SDK (OR Oauth2 能力提供)，实际 SDK 也拥有，需要梳理出官方文档和具体教程。
