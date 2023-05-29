# Resource-controller如何编写

resource-controller 是计量计费模块的一部分，请确保您提前了解[计量计费的设计](/proposal/design/zh/metering%E8%AE%BE%E8%AE%A1.md)



## resource-controller 是什么

resource-controller 是计量计费模块的一部分，用来统计和计费资源的使用量，不同资源不同resource-controller，使用podresource-controller举例，podresource-controller会统计用户ns下pod的资源limit使用量，并且计算出价格，生成一个Resource CR.

<img src="/proposal/img/metering-proposal-3.png" width="400px" height="400px" />

## 怎么样编写resource-controller（以podresource-controller举例）

### api定义

```

type PodResourceSpec struct {
	ResourceName string                                          `json:"resourceName,omitempty"`
	Resources    map[v1.ResourceName]meteringcommonv1.ResourcePrice `json:"resources,omitempty"`

	// update used resources every Interval minutes
	Interval int `json:"interval,omitempty"`
}

// PodResourceStatus defines the observed state of PodResource
type PodResourceStatus struct {
	LatestUpdateTime int64 `json:"latestUpdateTime,omitempty"`
	SeqID            int64 `json:"seqID,omitempty"`
}
```

seqID是每次podresource-controller统计计费完之后都需要+1，用当前seqID值来作为后缀命名创建的Resource CR，防止CR 名字一样。

### 在reconcile 中实现以下[接口](/pkg/metering/interface.go)

```
type ResourceControllerInterface interface {
	CreateOrUpdateExtensionResourcesPrice(ctx context.Context, obj client.Object) error

	// UpdateResourceUsed update resource used
	UpdateResourceUsed(ctx context.Context, obj client.Object) error
}
```

CreateOrUpdateExtensionResourcesPrice 函数是声明你要进行计费的资源,用户欠费过久会读取ExtensionResourcesPrice 中GVK来判断要删除什么资源。

UpdateResourceUsed 是创建一个Resource CR，用来申明自己统计到了这个用户使用的资源和计算出应付金额。

具体[实现代码](/controllers/metering/controllers/podresource_controller.go)可自行查看


### Example  Yaml

#### ExtensionResourcesPrice Yaml

```
apiVersion: metering.common.sealos.io/v1
kind: ExtensionResourcePrice
metadata:
  name: extensionresourceprice-sealos-pod-controller
  namespace: metering-system
spec:
  groupVersionKinds:
  - kind: pod
    version: v1
  - group: apps
    kind: deployment
    version: v1
  resourceName: pod
  resources:
    cpu:
      describe: cost per cpu per hour（price:10000 = 1¥）
      price: 670
      unit: "1"
    memory:
      describe: the cost per gigabyte of memory per hour（price:10000 = 1¥）
      price: 330
      unit: 1Gi
```

groupVersionKinds 会申明进行计费的资源的GVK，resources 中会有资源的价格，比如cpu是1个每小时0.067¥

#### Resource Yaml

```
apiVersion: metering.common.sealos.io/v1
kind: Resource
metadata:
  name: ns-qdwtxq25-sealos-pod-controller-sdk-demo-545d5c74f4-mqktj-754
  namespace: metering-system
spec:
  resources:
    cpu:
      cost: 67
      namespace: ns-qdwtxq25
      time: 1681355119 #timestamp
      used: 100m
    memory:
      cost: 41
      namespace: ns-qdwtxq25
      time: 1681355119
      used: 128Mi
status:
  status: complete
```

resource Name 构成是 {Namespace名字}-{resource-controller名字}-{pod名字}-{seqID}

status 为complete是因为这个Resource CR被Metering统计过了，会把状态改为complete.

