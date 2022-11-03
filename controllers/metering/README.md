### 计费标准
参考infra的计费（下面的数字是使用每小时的价格，单位分）
```
ec2p = map[string]int64{
		"t2.micro":   int64(0),1核1g
		"t2.small":   int64(22),1核2g
		"t2.medium":  int64(43),2核4g
		"t2.large":   int64(86),2核8g
	}
```
```
"t2.medium":  int64(43),2核4g
"t2.large":   int64(86),2核8g
```
这样算的话cpu就不用钱了，计算方式有问题

#### 查看阿里云按量计费

```
计算型 c8y, 1vCPU 2GiB（ecs.c8y.small）0.133/小时
通用型 g8y, 1vCPU 4GiB（ecs.g8y.small）0.200/小时
计算型 c8y, 2vCPU 4GiB（ecs.c8y.large）0.267/小时
```

##### 磁盘按量计费标准

```
ESSD云盘20GiBPL1  0.042/小时
```

### 价格结论

**综合计算：cpu：0.067/单核/小时，内存：0.033/G/小时，磁盘 0.0021G/小时**



## Metering 部署配置文档

```
sealos run labring/metering:latest
```

已内置pod controller的crd，但是没有cr，需要自己部署，price只能写整数，如果有小数可以unit*10直到price没有小数，price中数字100=1¥。

```
kubectl apply -f pod-controller.yaml
```

// example pod controller yaml

```
apiVersion: metering.sealos.io/v1
kind: MeteringPodController
metadata:
  name: sealos-pod-controller-config
  namespace: metering-system
spec:
  owner: "pod controller"
  interval: 60 # time interval(Minute)
  resources:
    cpu:
      unit: "10"
      price: 67
      describe: "cost per cpu per hour（price:100 = 1¥）"

    memory:
      unit: "10G"
      price: 33
      describe: "the cost per gigabyte of memory per hour（price:100 = 1¥）"

    storage:
      unit: "100G"
      price:  21
      describe: "cost per gigabyte of storage per hour（price:100 = 1¥）"

    ephemeral-storage:
      unit: "100G"
      price: 21
      describe: "cost per gigabyte of storage per hour（price:100 = 1¥）"
```

metering是以分钟为粒度进行计量计费，pod-controller更新使用的资源的时间粒度和metering计量计费解耦，，但是价格的粒度最小是分，所以如果计费的时候计费的钱小于1分就感知不到，之后应该会改。



## Metering

### 一、背景

sealos cloud是一个多租户的，以k8s为内核的云操作系统，传统的资源隔离级别是虚拟机，而sealos cloud的资源隔离级别是namespace，每个用户都至少有一个自己的namespace用来使用，这样就给这么计费带来挑战。怎么样计费k8s中 用户使用的cpu、memory等资源？怎么样计费流量等 metering 不可见的资源。

### 二、Metering 介绍



### 一、各个模块介绍

![](https://tva1.sinaimg.cn/large/008vxvgGly1h7o9t8ej72j30it0dqdgy.jpg)

#### 1、EntersionResourcesPrice

```
Kind: ExtensionResourcesPrice
Spec:
resources: map[string]resource
  - name:cpu
  unit: 1
  price:1    //  100 = 1¥
  owner: pod controller
  describe: 
```

注册额外资源

#### 2、meteringQuota

```
Kind: MeteringQuota
Status:
resources:
  - name:cpu 
  Used: 1  
  owner:pod controller
  - name:sealos/traffic #增量计费的资源
  Used: 0Mi
  owner:网关controller
```

计量模块，计量使用的资源量

#### 3、metering

```
kind: Metering
metadata:
  name: metering-nsName
  namespace:metering-system
Spec: 
resources: map[string]resource
  - name:cpu
  unit: 1
  price:1    //  100 = 1¥
  - name:sealos/traffic
  unit: 100Mi
  price:1    //  100 = 1¥
Status：
totalAmount：100
```

计费模块，每分钟去meteringQuota里面看使用的多少资源，根据价格计费。

### 二、Metering计量计费过程

![](https://tva1.sinaimg.cn/large/008vxvgGly1h7oaau6rx2j30sp0gm0w7.jpg)

1、资源controller注册要进行计量的资源进ExtensionResourcePrice，ExtensionResourcePrice将要计量的资源注册进MeteringQuota，将计费的资源价格注册进Metering中。

2、资源controller更新MeteringQuota中资源的used，增量资源把增加的部分更新进used，比如流量，这个时间段使用50M就used中增加50Mi，更新的时间间隔按照资源controller自己的需求自己更新，可以1个钟头更新一次，price那边价格定为每小时的价格就行。

3、metering计费模块，每一分钟计费一次，查看对应的meteringQuota中资源的used，使用量/单价*价格

就是最终价格，增量的存入totalAmout，并且把**meteringQuota里面的used置0**。

4、deduction扣费模块可以按任意时间间隔扣费。







## Resource-controller如何编写

提前了解metering的设计可以帮你更好的理解resource-controller如何编写

### 以pod-controller举例

example yaml

```
apiVersion: metering.sealos.io/v1
kind: MeteringPodController
metadata:
  name: sealos-pod-controller-config
  namespace: metering-system
spec:
  owner: "pod controller"
  interval: 60
  resources:
    cpu:
      unit: "10"
      price: 67
      describe: "cost per cpu per hour（price:100 = 1¥）"

    memory:
      unit: "10G"
      price: 33
      describe: "the cost per gigabyte of memory per hour（price:100 = 1¥）"

    storage:
      unit: "100G"
      price:  21
      describe: "cost per gigabyte of storage per hour（price:100 = 1¥）"

    ephemeral-storage:
      unit: "100G"
      price: 21
      describe: "cost per gigabyte of storage per hour（price:100 = 1¥）"
```

unit是 resource.Quantity类型，支持传入100m（=0.1），1，1k，1Gi

price是int64类型，100=¥1，转化成RMB的时候记得除以100

### crd编写

1、完成api定义

```
type MeteringPodControllerSpec struct {
   Owner     string                            `json:"owner,omitempty"`
   Resources map[v1.ResourceName]ResourcePrice `json:"resources,omitempty"`
   // update used resources every Interval minutes
   Interval int `json:"interval,omitempty"`
}

type ResourcePrice struct {
	Unit     *resource.Quantity `json:"unit"`
	Price    int64              `json:"price"` // 100 = 1¥
	Describe string             `json:"describe,omitempty"`
}
```

**Resources map[v1.ResourceName]ResourcePrice 类型请不要改变**

2、在reconcile 实现以下接口

```
type ResourceController interface {
	// CreateOrUpdateExtensionResourcesPrice need to create a ExtensionResourcesPrice to make metering-quota know this resource
	CreateOrUpdateExtensionResourcesPrice(ctx context.Context, obj client.Object) error

	// UpdateResourceUsed update metering-quota resource used
	UpdateResourceUsed(ctx context.Context, obj client.Object) error
}
```

CreateOrUpdateExtensionResourcesPrice函数是声明你要进行计费的资源给metering-quota，把计费的价格给metering，然后metering计费的时候就知道这个资源也要计费。

example code

```
// CreateOrUpdateExtensionResourcesPrice need to create a ExtensionResourcesPrice to make metering-quota know this resource
func (r *MeteringPodControllerReconciler) CreateOrUpdateExtensionResourcesPrice(ctx context.Context, obj client.Object) error {

	podController := obj.(*meteringv1.MeteringPodController)
	extensionResourcesPrice := &meteringv1.ExtensionResourcesPrice{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: os.Getenv(METERINGNAMESPACE),
			Name:      podController.Name,
		},
		Spec: meteringv1.ExtensionResourcesPriceSpec{
			Resources: make(map[v1.ResourceName]meteringv1.ResourcePrice, 0),
		},
	}

	//r.Logger.Info("podController.Spec.Resources", "podController name", podController.Name, "podController Resources", podController.Spec.Resources)
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, extensionResourcesPrice, func() error {
		extensionResourcesPrice.Spec.Resources = podController.Spec.Resources
		extensionResourcesPrice.Spec.Owner = podController.Spec.Owner
		err := controllerutil.SetOwnerReference(podController, extensionResourcesPrice, r.Scheme)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("sync resource quota failed: %v", err)
	}
	r.Logger.V(1).Info("sync extensionResourcesPrice", "extensionResourcesPrice.Spec", extensionResourcesPrice.Spec)
	return nil
}
```



```
func (r *MeteringPodControllerReconciler) UpdateResourceUsed(ctx context.Context, obj client.Object) error {

	podController := obj.(*meteringv1.MeteringPodController)
	var podList v1.PodList
	err := r.List(ctx, &podList)
	if err != nil {
		return err
	}
	meteringQuotaMap := make(map[string]meteringv1.MeteringQuota, 0)
	meteringQuotaList := meteringv1.MeteringQuotaList{}
	err = r.List(ctx, &meteringQuotaList)
	if err != nil {
		return err
	}
	for _, meteringQuota := range meteringQuotaList.Items {
		meteringQuotaMap[meteringQuota.Namespace] = meteringQuota
	}
	for _, pod := range podList.Items {
		podNS := pod.Namespace
		if _, ok := meteringQuotaMap[podNS]; ok && pod.Status.Phase == v1.PodRunning {

			for _, container := range pod.Spec.Containers {
				if container.Resources.Limits != nil {
					for resourceName := range podController.Spec.Resources {
						if _, ok := container.Resources.Limits[resourceName]; ok {
							if _, ok2 := meteringQuotaMap[podNS].Status.Resources[resourceName]; ok2 {
								meteringQuotaMap[podNS].Status.Resources[resourceName].Used.Add(container.Resources.Limits[resourceName])
							} else {
								r.Logger.Info("container.Resources.Limits resource not available", "pod", pod.Name, "resource name", resourceName, "pod namespace", pod.Namespace)
							}
						} else {
							r.Logger.Info("container.Resources.Limits resource not available", "pod", pod.Name, "resource name", resourceName, "pod namespace", pod.Namespace)
						}
					}
				} else {
					r.Logger.Error(nil, "container.Resources.Limits is nil", "container", container.Name, "pod", pod.Name)
				}
			}
		}
	}

	for _, meteringQuota := range meteringQuotaMap {
		err := r.Status().Update(ctx, &meteringQuota)
		if err != nil {
			return err
		}
	}

	podController.Status.LatestUpdateTime = time.Now().Unix()
	err = r.Status().Update(ctx, podController)
	if err != nil {
		return err
	}
	//r.Logger.Info("sync meteringQuota success", "meteringQuota", meteringQuotaMap)
	r.Logger.Info("pod controller calculate resource success")
	return nil
}
```

