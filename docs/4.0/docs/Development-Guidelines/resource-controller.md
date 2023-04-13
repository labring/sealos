# How to Write a Resource-Controller

​    The resource-controller is part of the metering and billing module. Please make sure you are familiar with the [design of metering](/proposal/design/zh/metering%E8%AE%BE%E8%AE%A1.md) before proceeding.

## What is a Resource-Controller?

​    The resource-controller is part of the metering and billing module, used to track and bill the usage of resources. Different resources have different resource-controllers. Taking podresource-controller as an example, podresource-controller tracks the usage of resource limits for pods in the user's namespace, calculates the price, and generates a Resource CR.

<img src="/proposal/img/metering-proposal-3.png" width="400px" height="400px" />

## How to Write a Resource-Controller (Using podresource-controller as an Example)



### API Definition

```
type PodResourceSpec struct {
    ResourceName string `json:"resourceName,omitempty"`
    Resources map[v1.ResourceName]meteringcommonv1.ResourcePrice `json:"resources,omitempty"`
// update used resources every Interval minutes
    Interval int `json:"interval,omitempty"`
}
// PodResourceStatus defines the observed state of PodResource
type PodResourceStatus struct {
    LatestUpdateTime int64 `json:"latestUpdateTime,omitempty"`
    SeqID int64 `json:"seqID,omitempty"`
}
```

seqID needs to be incremented by 1 every time podresource-controller completes billing. The current seqID value is used as a suffix for the name of the created Resource CR to prevent duplicate CR names.

### 在reconcile 中实现以下[接口](/pkg/metering/interface.go)


```
type ResourceControllerInterface interface {
    CreateOrUpdateExtensionResourcesPrice(ctx context.Context, obj client.Object) error
    // UpdateResourceUsed update resource used
    UpdateResourceUsed(ctx context.Context, obj client.Object) error
}
```

The CreateOrUpdateExtensionResourcesPrice function declares the resources you want to bill for. If a user is in arrears for too long, ExtensionResourcesPrice will read GVK to determine which resources to delete.

UpdateResourceUsed creates a Resource CR to declare the resources used by the user and the amount owed.

You can view the specific [implementation code](/controllers/metering/controllers/podresource_controller.go) at:



### Example Yaml

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

groupVersionKinds declares GVK of the resources being billed for, and resources lists the prices of those resources. For example, one CPU costs ¥0.067 per hour.

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
      cost: 67 # ¥0.67/hour for one CPU (10,000 cents = ¥1)
      namespace: ns-qdwtxq25
      time: 1681355119 #timestamp
      used: 100m
    memory:
      cost: 41 # ¥0.41/hour for 1Gi memory (10,000 cents = ¥1)
      namespace: ns-qdwtxq25
      time: 1681355119
      used: 128Mi
status:
  status: complete
```

The resource name is constructed as follows: {Namespace name}-{Resource-controller name}-{Pod name}-{seqID}

The status is marked as complete because this Resource CR has been tracked by Metering and the status has been updated to complete.
