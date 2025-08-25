---
keywords: [计费系统, Sealos, 公有云, 账户管理, 资源计量, CockroachDB, MongoDB, 充值流程, 用户状态, 账单管理]
description: 了解Sealos计费系统的设计与实现，包括资源计量、账户管理、扣费与账单、暂停与恢复以及充值流程，确保用户轻松管理云服务费用。
---

# 计费系统

# 概述

计费一直是公有云的服务痛点之一。Sealos
以简单，弹性为设计理念，自然也不想在计费系统上过多的增加用户的心智负担，因此计费系统采取按量计费的方式，通过尽可能的缩小计费品类，为用户带来更低的价格与更容易理解的方式。并通过完备详细的账单系统使用户能及时清晰的看到自己旗下各项类目的消费情况。

# 系统架构

## 系统组成

与其他系统的设计类似，Sealos 的计费系统由一系列的 CRD 与他们所对应的 Controller
为组成。按照计费的流程可以大致分为计量与计费系统两部分。计量系统主要负责计算用户各项资源具体用量，并交由计费系统，计费系统按照用量进行费用的计算与扣减，并根据用户余额执行停机/恢复等操作。同时计费系统还管理用户的账户信息，并处理用户充值流程。

## 持久化设计

由于 Sealos 存在多个可用区，因此无法使用一套数据源来完成所有功能。

计量系统存在数据及时性与复杂的结构，不适合使用持久化数据库存储，因此采用 MongoDB 存储在每个可用区中，并定时清楚。

而用户的账户，账单等关键数据则使用 CockroachDB 这种分布式关系型数据库，在不同的可用区之间分片存储并进行数据同步，并永久保存。

# 计量

## 设计

计量系统采用 Controller 执行定时任务的方式。具体工作流程为：

- 定时（当前为1min）轮询所有用户资源
- 把轮询的结果存入数据库

按照用户系统的设计，每个用户都有专属的命名空间，所以计量系统的是以命名空间为单位进行统计。

## 实现

计量系统代码位于 Sealos/controllers/resoucers.主要使用一个类 CRD 的 Controller 实现.即使用 Kuberbuilder 生成代码后，不使用其给出的
Reconcile 方法，而是修改其生成的方法和main函数逻辑的方式实现。

main 函数的主要逻辑可以总结为：创建一个 Reconciler 对象，并调用 Reconciler 对象的 StartReconciler() 方法。

在 StartReconciler() 中，使用 ticker 创建了一个一个每分钟执行一次的定时任务。

该任务的执行逻辑大体如下：

- 获取所有的命名空间
- 对于每个命名空间，启动一个 goroutine 进行计费，使用 WaitGroup 同步。
- 获取Pod资源：CPU,内存
- 获取PVC资源
- 获取数据库资源
- 获取端口资源
- 获取对象存储资源
- 组装整体对象，调用数据库接口存入数据库

# 计费

## 设计

计费系统以计量系统为基础，采用定时任务与监听 CR 变化相结合的方式。

## 实现

### 账户

用户账户主要通过名为 account 的 CR 进行管理。代码位于 Sealos/account/account_controller

当用户创建新的账户时，account controller会使用 syncAccount 为其创建新的 account，并完成分配配额等操作。

账户持久化的结构体如下：

```
type Account struct {
	UserUID                 uuid.UUID `gorm:"column:userUid;type:uuid;default:gen_random_uuid();primary_key"`
	ActivityBonus           int64     `gorm:"column:activityBonus;type:bigint;not null"`
	EncryptBalance          string    `gorm:"column:encryptBalance;type:text;not null"`
	EncryptDeductionBalance string    `gorm:"column:encryptDeductionBalance;type:text;not null"`
	CreatedAt               time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp()"`
	CreateRegionID          string    `gorm:"type:text;not null"`
	Balance                 int64
	DeductionBalance        int64
}
```

其中，EncryptBalance 代表全部的历史充值金额，一定程度上反映了用户的信誉程度，EncryptDeductionBalance代表全部的历史扣费金额，均以加密字符串的密文形式存储。

Balance 为用户余额，使用明文存储。当余额与两个金额的差值出现不一致的时候，以更安全的差值为准。

## 扣费与账单

扣费主要由 Sealos/account/billing_controller 负责。这个 controller 没有对应的 CR，其修改的方式其主要是通过 uesr
crd.当前其主要逻辑为：

- 以小时为单位，轮询 Mongodb 获取数据
- 计算账单
- 扣减用户费用，此处即为新增 EncryptDeductionBalance，同时更新 Balance

扣费完成之后生成以小时为单位的账单数据，通过 billinginfoquery 和 billingrecordquery 两个 CRD 进行管理，提供给用户查询账单的各种接口。

## 暂停与恢复

### 状态转换

当 billing 扣费后，debt_controller 会检测用户的账户余额，并根据当前状态和余额的不同执行不同的操作。

用户一共有五个状态：

- 正常期：账户余额大于等于0
- 预警期：账户余额小于0时,且超时超过 WarningPeriodSeconds (default is 0 day)
- 临近删除期：账户余额小于0，且上次更新时间超过 ApproachingDeletionPeriodSeconds (default is 4 days
- 即刻删除期：账户余额小于0，且上次更新时间超过 ImmediateDeletePeriodSeconds (default is 3 days)
- 最终删除期：账户余额小于0，且上次更新时间超过 FinalDeletePeriodSeconds (default is 7 days)

这些状态之间的转移方式大致如下：

当用户处于正常期，且余额大于0，则不进行任何操作，若余额小于0，则进入预警期。

当用户处于预警期，且余额大于0，则返回进入正常期，若余额依然小于0，则判断当前时间，欠费额度与全部历史充值金额的关系，若上次更新时间小于临近删除时间,
且欠费小于历史充值金额的一半，则维持预警期不变，否则进入临近删除期，并向用户发送临近删除的通知。

当用户处于临近删除期，且余额大于0，则返回进入正常期，若余额依然小于0，则判断则判断当前时间，欠费额度与全部历史充值金额的关系，若上次更新时间小于临近删除时间,
且欠费小于历史充值金额，则维持临近删除期不变，否则进入即刻删除期，此时暂停用户的资源，并向用户发送即刻删除期的通知。

当用户处于即刻删除期，且余额大于0，则返回进入正常期，若余额依然小于0，则判断则判断当前时间，若上次更新时间小于临近删除时间,
则维持即刻删除期不变，否则进入最终删除期，并向用户发送最终删除期的通知。

当用户处于最终删除期，且余额大于0，则返回进入正常期。

### 实现

修改用户的状态通过 SuspendUserResource() 方法,这个方法本质上是通过修改 NameSpace 资源，然后触发 NameSpace CR 的controller
实现。

namespcace controller 位于 Sealos/controller/namespcae_controller 中，本质上，是通过一个管道执行一系列函数实现：

```
pipelines := []func(context.Context, string) error{
		//r.suspendKBCluster,
		r.suspendOrphanPod,
		r.limitResourceQuotaCreate,
		r.deleteControlledPod,
		//TODO how to suspend infra cr or delete infra cr
		//r.suspendInfraResources,
		r.suspendObjectStorage,
	}
```

其中，suspendOrphanPod() 方法核心逻辑是使用自建的调度器调度 pod，工作流程如下：

- 深拷贝原pod
- 修改原pod属性：将调度器修改为自定义的调度器
- 重新创建pod

通过这种方式可以保护部分 Pod 不被Kuberrnetes 自带的调度器删除，而可以只删除 Deployment 等资源。

limitResourceQuotaCreate()
方法通过为用户的命名空间添加新的，全部用量都为0的配额来限制用户创建新的资源，当用户创建新的命名空间时，会默认为其分配一定的配额，而命名空间中资源的使用必须符合所有的配额类型，所以此时用户就无法再创建任何全新的资源了。

deleteControlledPod() 是删除控制 Pod 的具体 Pod

suspendObjectStorage()方法用于处理对象存储的相关操作

## 充值

充值功能通过 payment_controller 实现，

具体的工作流程为：

用户发起充值请求，前端调用 payment_controller 生成订单CR返回给前端，用户进行支付，同时 account_controller
轮询查询订单支付状态的接口，当判断到用户充值成功了之后，调用数据库接口为用户增加 EncryptBalance ，同时更新 Balance。
