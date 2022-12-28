### 计费标准
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



### 二、Metering 介绍

## **一、背景**

sealos cloud 是一个多租户的，以 k8s 为内核的云操作系统，每个用户都至少有一个自己的 namespace 用来使用，这样就给怎么计费带来挑战。怎么样计费 k8s 中 用户使用的 cpu、memory 等资源？怎么样计费流量等 Metering 不可见的资源。

## 二、需求

计费正在使用的pod 的cpu、memory等资源，可以计费metering感知不到的第三方资源(如流量)

## 三、设计思路

计量计费扣费解耦开，设计第三方资源计量计费接入方案

计量：计量使用的资源量

计费：根据资源价格和使用的资源量计算出价格

扣费：从账户中扣除计算出的价格

### 3.1、各模块介绍

![](https://tva1.sinaimg.cn/large/008vxvgGly1h89ekci465j30l00b9757.jpg)

**ExtensionResourcesPrice:**注册额外资源的声明，声明中有资源的单价和单位

**meteringQuota:**计量模块，计量使用的资源量

**metering:计**费模块，每分钟去meteringQuota里面看使用的多少资源，根据价格计费。

### 3.2、计量计费流程

![](https://tva1.sinaimg.cn/large/008vxvgGly1h89elp5qjyj30pl0ehgnr.jpg)

1、资源controller注册要进行计量的资源进ExtensionResourcePrice，ExtensionResourcePrice将要计量的资源注册进MeteringQuota，将计费的资源价格注册进Metering中。

2、资源controller更新MeteringQuota中资源的used，增量资源把增加的部分更新进used，比如流量，这个时间段使用50M就used中增加50Mi，更新的时间间隔按照资源controller自己的需求自己更新，可以1个钟头更新一次，price那边价格定为每小时的价格就行。

3、metering计费模块，每一分钟计费一次，查看对应的meteringQuota中资源的used，使用量/单价*价格

就是最终价格，增量的存入totalAmout，并且把**meteringQuota里面的used置0**。

4、deduction扣费模块可以按任意时间间隔扣费。



