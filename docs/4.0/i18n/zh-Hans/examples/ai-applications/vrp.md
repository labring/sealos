# 智能调度服务

## 服务介绍

![Picture1](https://user-images.githubusercontent.com/14962503/179478363-172a4764-f644-40d8-8784-2fdb25ace7a2.png)

车辆智能调度问题（Vehicle Routing Problem），在学术上是网络优化问题中的最基本同时也是最具挑战性的问题之一，在物流领域也是最为广泛的应用场景之一，其覆盖了从干线、末端、到仓内的各个环节。对于效率的提升和成本的节省提到重大作用。随着物流行业向智能化发展，作为物流核心智能算法之一的车辆路径规划的应用场景也越来越丰富。

车辆智能调度服务由 scienson 算法团队的独立研发，可以以时效最优为目标，支持多种路径优化问题类型的求解。结合云计算超强的大数据计算能力，在短时间内规划出运输成本最低的配送方案的服务。适用于多种类型的运输配送业务，能够有效提高运营效率，降低人为误差，减少运输成本。

### 服务优势

#### 多维度的输入参数

能力约束：车的载方、载重；

时间窗口：货物的最早/晚送货或取货的时间窗口；

时长约束：取货/送货的装卸货时间及作业等待时间；

运输限制：不同车型在实际运输中的速度限制，行驶半径，以及满足不同运输模式下成本计算要求。结合 OSM，综合考量每个仓库和送货点的地址并获得当前的路况等；

优化目标：最少车辆，最短距离或者是最小成本；

#### 多样化的调用方式

1. 可以支持通过 SaaS 服务免费调用智能调度服务；
1. 可以使用 Sealos 私有化部署镜像服务；

#### 直观的优化结果展示

1. 可视化展示已完成的调度计划，如调度计划的总成本、总车次、总行驶里程、路顺等；
1. 方便快捷地介入人工调整，实时可得人工干预后的成本、里程数据；

#### 灵活多变的约束和目标组合

我们不仅仅解决一种 VRP 问题，我们解决的是车辆调度等一整类问题。基于客户实际业务场景的不同，算法的约束和目标往往不能完全复用，三笙算法团队提供一对一的个性化定制服务。我们精心设计了强大灵活的算法架构，可以插件化具体约束和目标，从而能够以极低的成本为您提供服务。

## 安装

```shell script
$ sealos run luanshaotong/vrp:v0.1.1
```

## API 调用

### 调用地址

[http://116.204.64.253:7001/avatarsolver-portal/vrp/dvrpSolve](http://116.204.64.253:7002/avatarsolver-portal/route/navigate)

请求类型：POST

Content-Type：application/json

### 调度约束和目标

| 类型           | 描述               | 详细说明                                                                           |
| -------------- | ------------------ | ---------------------------------------------------------------------------------- |
| 约束           | 车辆容量约束       | 车辆的总重量有限制，即车辆身上承载的总订单货重不能高于车辆总体重量限制             |
| 约束           | 车辆时间窗约束     | 车辆有特定的工作时间窗，在路径规划中会考虑车辆时间窗，即车辆工作时间必须在时间窗内 |
| 第一优先级目标 | 未配送的订单数最少 | 尽可能多的完成订单配送，剩余未配送的订单数尽可能的少                               |
| 第二优先级目标 | 订单超时时间最小   | 调度方案中订单总超时时间最少                                                       |
| 第三优先级目标 | 运输总耗时最小     | 总体方案耗时最少，耗时为车辆配送开始，到最后一个订单配送完成的消耗时间             |
| 第四优先级目标 | 车辆总行驶里程最小 | 车辆总体行驶里程最小                                                               |

当前 API 支持的约束和目标如上表所示。如果您有其他约束和目标要求，请随时联系客服人员，我们将针对您的具体业务提供一对一的定制服务。

### 详细参数说明

1. 请求参数

| 字段名          |                       | 字段说明                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| key             |                       | API 调用秘钥<br />1. 一般用户请填写："91cb09e7-72b7-4094-839e-166bdc279e01"<br />1. 私人定制用户请联系客服获取秘钥<br />                                                                                                                                                                                                                                                     |
| depotParam      |                       | 仓库的参数信息                                                                                                                                                                                                                                                                                                                                                               |
|                 | depotId               | 仓库 ID，类型：字符串                                                                                                                                                                                                                                                                                                                                                        |
|                 | positionInfo          | 仓库的经纬度信息：<br />1. lon：经度，类型：浮点数<br />1. lat：纬度，类型：浮点数<br />                                                                                                                                                                                                                                                                                     |
| vehicleParams   |                       | 车辆的参数信息                                                                                                                                                                                                                                                                                                                                                               |
|                 | plate                 | 车牌号，类型：字符串                                                                                                                                                                                                                                                                                                                                                         |
|                 | capacity              | 车辆的容量信息：<br /> maxWeight：最大载重 ，格式类型：浮点数<br />容量可以支持多种配置，如需要其他类型支持，请联系客服                                                                                                                                                                                                                                                      |
|                 | startLocation         | 车辆始发地的经纬度信息：<br />1. lon：经度，类型：浮点数<br />1. lat：纬度，类型：浮点数<br />                                                                                                                                                                                                                                                                               |
|                 | earliestDeparture     | 最早出发时间，格式类型：浮点数<br />请将时刻转换成统一的数值类型                                                                                                                                                                                                                                                                                                             |
|                 | timeWindowInfo        | 车辆时间窗信息，表示车辆工作时间段：<br />beginTime：起始时刻，格式类型：浮点数<br />endTime: 结束时刻，格式类型：浮点数                                                                                                                                                                                                                                                     |
| orderParams     |                       | 订单的参数信息                                                                                                                                                                                                                                                                                                                                                               |
|                 | orderId               | 订单 ID，格式类型：字符串                                                                                                                                                                                                                                                                                                                                                    |
|                 | positionInfo          | 订单服务点的经纬度信息：<br />1. lon：经度，类型：浮点数<br />1. lat：纬度，类型：浮点数<br />                                                                                                                                                                                                                                                                               |
|                 | timeWindowInfo        | 订单的有效服务时间窗，表示服务点的工作时间段：<br />beginTime：起始时刻，格式类型：浮点数<br />endTime: 结束时刻，格式类型：浮点数                                                                                                                                                                                                                                           |
|                 | serviceTime           | 订单的装卸载或者服务耗时，格式：浮点数                                                                                                                                                                                                                                                                                                                                       |
|                 | demand                | 订单的需求量<br />weight: 货物重量需求<br />需求量可以支持多种配置，如需要其他类型支持，请联系客服                                                                                                                                                                                                                                                                           |
| relationParam   |                       | 关系参数，设置距离或者时间矩阵参数，利用该参数用户可以自定义距离和时间矩阵信息。如果该参数不填，则需要依赖 distanceCalculateType 指定距离计算类型。                                                                                                                                                                                                                          |
|                 | distanceTable         | 距离矩阵，可以设置如下距离关系：<br />1、订单服务点距离信息<br />2、订单与车辆距离信息<br />3、仓库与订单距离信息<br />4、仓库与车辆距离信息<br />距离单位统一为米<br />示例：<br />"distanceTable": {<br /> "order1": {<br /> "order2":5,<br /> "vehicleA":4<br /> }<br />}<br />示例说明：<br />表示订单 order1 与 order2 距离为 5 米，订单 order1 与 vehicleA 距离为 4 米 |
|                 | durationTable         | 时间矩阵，可以设置如下时间关系：<br />1、订单服务点耗时信息<br />2、订单与车辆耗时信息<br />3、仓库与订单耗时信息<br />4、仓库与车辆耗时信息 <br />时间单位统一为秒<br />"durationTable":{<br /> "order1":{<br /> "order2":5,<br /> "vehicleA":4<br /> }<br /> }<br />示例说明：<br />表示订单 order1 与 order2 耗时为 5 秒，订单 order1 与 vehicleA 耗时为 4 秒             |
| dvrpConfigParam |                       | 总体全局配置                                                                                                                                                                                                                                                                                                                                                                 |
|                 | needBackToDepot       | 车辆是否需要返回仓库，默认是 false，如果设置为 true，则计算过程会考虑车辆返回仓库；                                                                                                                                                                                                                                                                                          |
|                 | globalVelocity        | 全局车辆速度，单位：km/h                                                                                                                                                                                                                                                                                                                                                     |
|                 | distanceCalculateType | 距离计算类型<br />1. circle ：使用高精度球面距离计算<br />1. euclidean：使用平面欧式距离计算<br />                                                                                                                                                                                                                                                                           |
|                 | timeType              | 时间格式类型，该字段用于表示设定的时间类型，在返回结果中会以直观的格式化形式输出<br />1. DATE：日期类型<br />1. VALUE：数值类型（默认）<br />                                                                                                                                                                                                                                |

2. 返回参数

| 字段名             |              | 字段说明                                                                                                                                                                                                                                |
| ------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| success            |              | 调用是否成功                                                                                                                                                                                                                            |
| errorCode          |              | 错误码<br />CB00001 : 业务异常，通常是业务逻辑异常导致，请仔细检测您的参数；<br />CB00002: 系统异常，通常是系统错误导致，请联系客服处理<br />CB00003: 无效参数，通常是入参格式不正确，请基于示例检测您的入参<br />CB0004: JSON 解析失败 |
| errorMsg           |              | 错误信息                                                                                                                                                                                                                                |
| appendMsg          |              | 额外错误说明                                                                                                                                                                                                                            |
| dvrpRouteInfos     |              | 车辆调度的规划路径信息                                                                                                                                                                                                                  |
| vehicleId          |              | 车辆 ID，类型格式：字符串                                                                                                                                                                                                               |
| assignedJobList    |              | 路径上配送任务的顺序                                                                                                                                                                                                                    |
|                    | id           | 任务 ID                                                                                                                                                                                                                                 |
|                    | jobType      | 任务类型：<br />1. 如果是 DEPOT，则表示为仓库；<br />1. 如果是 ORDER，则表示为订单；<br />                                                                                                                                              |
|                    | weight       | 重量信息                                                                                                                                                                                                                                |
|                    | arriveTime   | 达到该任务的时间点                                                                                                                                                                                                                      |
|                    | deptTime     | 离开该任务的时间点                                                                                                                                                                                                                      |
|                    | aggrDistance | 车辆的当前累计行驶里程                                                                                                                                                                                                                  |
|                    | overTime     | 车辆当前超时时间                                                                                                                                                                                                                        |
| routeDistance      |              | 车辆路径总里程                                                                                                                                                                                                                          |
| routeTotalWeight   |              | 车辆路径总重量                                                                                                                                                                                                                          |
| routeTotalOrderNum |              | 车辆路径总订单数                                                                                                                                                                                                                        |
| routeOverTime      |              | 路径总超时时间                                                                                                                                                                                                                          |
| unAssignedOrderNum |              | 未分配的订单数量                                                                                                                                                                                                                        |
| unAssignedJobList  |              | 未分配的任务列表                                                                                                                                                                                                                        |
| totalOverTime      |              | 总体调度方案的车辆超时时间                                                                                                                                                                                                              |
| totalDistance      |              | 总体调度方案的车辆总里程                                                                                                                                                                                                                |

### 调用示例

1. 调用请求

```json
{
  "key": "91cb09e7-72b7-4094-839e-166bdc279e01",
  "depotParam": {
    "depotId": "depot",
    "positionInfo": {
      "lon": 0,
      "lat": 0
    }
  },
  "vehicleParams": [
    {
      "plate": "vehicleA",
      "capacity": {
        "maxVolume": 10,
        "minVolume": 0,
        "maxWeight": 100,
        "minWeight": 0,
        "maxDistance": 0,
        "amount": 0
      },
      "startLocation": {
        "lon": 1,
        "lat": 0
      },
      "earliestDeparture": 0,
      "timeWindowInfo": {
        "beginTime": 0,
        "beginTimeDisplay": null,
        "endTime": 1000,
        "endTimeDisplay": null
      }
    },
    {
      "plate": "vehicleB",
      "capacity": {
        "maxVolume": 10,
        "minVolume": 0,
        "maxWeight": 100,
        "minWeight": 0,
        "maxDistance": 0,
        "amount": 0
      },
      "startLocation": {
        "lon": 4,
        "lat": 0
      },
      "earliestDeparture": 0,
      "timeWindowInfo": {
        "beginTime": 0,
        "beginTimeDisplay": null,
        "endTime": 1000,
        "endTimeDisplay": null
      }
    }
  ],
  "orderParams": [
    {
      "orderId": "order1",
      "positionInfo": {
        "lon": 1,
        "lat": 1
      },
      "timeWindowInfo": {
        "beginTime": 0,
        "beginTimeDisplay": null,
        "endTime": 1000,
        "endTimeDisplay": null
      },
      "serviceTime": 1,
      "demand": {
        "itemNum": 0,
        "weight": 5,
        "volume": 0,
        "worth": 0
      }
    },
    {
      "orderId": "order2",
      "positionInfo": {
        "lon": 3,
        "lat": 2
      },
      "timeWindowInfo": {
        "beginTime": 0,
        "beginTimeDisplay": null,
        "endTime": 1000,
        "endTimeDisplay": null
      },
      "serviceTime": 1,
      "demand": {
        "itemNum": 0,
        "weight": 1,
        "volume": 0,
        "worth": 0
      }
    },
    {
      "orderId": "order3",
      "positionInfo": {
        "lon": 5,
        "lat": 5
      },
      "timeWindowInfo": {
        "beginTime": 0,
        "beginTimeDisplay": null,
        "endTime": 1000,
        "endTimeDisplay": null
      },
      "serviceTime": 1,
      "demand": {
        "itemNum": 0,
        "weight": 2,
        "volume": 0,
        "worth": 0
      }
    },
    {
      "orderId": "order4",
      "positionInfo": {
        "lon": 10,
        "lat": 10
      },
      "timeWindowInfo": {
        "beginTime": 0,
        "beginTimeDisplay": null,
        "endTime": 1000,
        "endTimeDisplay": null
      },
      "serviceTime": 1,
      "demand": {
        "itemNum": 0,
        "weight": 4,
        "volume": 0,
        "worth": 0
      }
    },
    {
      "orderId": "order5",
      "positionInfo": {
        "lon": 6,
        "lat": 2
      },
      "timeWindowInfo": {
        "beginTime": 0,
        "beginTimeDisplay": null,
        "endTime": 1000,
        "endTimeDisplay": null
      },
      "serviceTime": 1,
      "demand": {
        "itemNum": 0,
        "weight": 3,
        "volume": 0,
        "worth": 0
      }
    },
    {
      "orderId": "order6",
      "positionInfo": {
        "lon": 8,
        "lat": 2
      },
      "timeWindowInfo": {
        "beginTime": 0,
        "beginTimeDisplay": null,
        "endTime": 1000,
        "endTimeDisplay": null
      },
      "serviceTime": 1,
      "demand": {
        "itemNum": 0,
        "weight": 1,
        "volume": 0,
        "worth": 0
      }
    },
    {
      "orderId": "order7",
      "positionInfo": {
        "lon": 9,
        "lat": 1
      },
      "timeWindowInfo": {
        "beginTime": 0,
        "beginTimeDisplay": null,
        "endTime": 1000,
        "endTimeDisplay": null
      },
      "serviceTime": 1,
      "demand": {
        "itemNum": 0,
        "weight": 3,
        "volume": 0,
        "worth": 0
      }
    },
    {
      "orderId": "order8",
      "positionInfo": {
        "lon": 2,
        "lat": 7
      },
      "timeWindowInfo": {
        "beginTime": 0,
        "beginTimeDisplay": null,
        "endTime": 1000,
        "endTimeDisplay": null
      },
      "serviceTime": 1,
      "demand": {
        "itemNum": 0,
        "weight": 2,
        "volume": 0,
        "worth": 0
      }
    }
  ],
  "relationParam": null,
  "dvrpConfigParam": {
    "needBackToDepot": false,
    "globalVelocity": 3.6,
    "distanceCalculateType": "euclidean",
    "timeType": null
  }
}
```

2. 调用返回结果

```json
{
  "success": true,
  "data": {
    "dvrpRouteInfos": [
      {
        "vehicleId": "vehicleB",
        "assignedJobList": [
          {
            "id": "depot",
            "jobType": "DEPOT",
            "weight": 0.0,
            "arriveTime": "4.0",
            "deptTime": "4.0",
            "aggrDistance": 4.0,
            "overTime": 0.0
          },
          {
            "id": "order8",
            "jobType": "ORDER",
            "weight": 2.0,
            "arriveTime": "11.280109889280517",
            "deptTime": "12.280109889280517",
            "aggrDistance": 11.280109889280517,
            "overTime": 0.0
          },
          {
            "id": "order4",
            "jobType": "ORDER",
            "weight": 4.0,
            "arriveTime": "20.82411363459805",
            "deptTime": "21.82411363459805",
            "aggrDistance": 19.82411363459805,
            "overTime": 0.0
          }
        ],
        "routeDistance": 19.82411363459805,
        "routeTotalWeight": 6.0,
        "routeTotalOrderNum": 2,
        "routeOverTime": 0.0
      },
      {
        "vehicleId": "vehicleA",
        "assignedJobList": [
          {
            "id": "depot",
            "jobType": "DEPOT",
            "weight": 0.0,
            "arriveTime": "1.0",
            "deptTime": "1.0",
            "aggrDistance": 1.0,
            "overTime": 0.0
          },
          {
            "id": "order1",
            "jobType": "ORDER",
            "weight": 5.0,
            "arriveTime": "2.414213562373095",
            "deptTime": "3.414213562373095",
            "aggrDistance": 2.414213562373095,
            "overTime": 0.0
          },
          {
            "id": "order2",
            "jobType": "ORDER",
            "weight": 1.0,
            "arriveTime": "5.650281539872885",
            "deptTime": "6.650281539872885",
            "aggrDistance": 4.650281539872885,
            "overTime": 0.0
          },
          {
            "id": "order3",
            "jobType": "ORDER",
            "weight": 2.0,
            "arriveTime": "10.255832815336873",
            "deptTime": "11.255832815336873",
            "aggrDistance": 8.255832815336873,
            "overTime": 0.0
          },
          {
            "id": "order5",
            "jobType": "ORDER",
            "weight": 3.0,
            "arriveTime": "14.418110475505253",
            "deptTime": "15.418110475505253",
            "aggrDistance": 11.418110475505253,
            "overTime": 0.0
          },
          {
            "id": "order6",
            "jobType": "ORDER",
            "weight": 1.0,
            "arriveTime": "17.41811047550525",
            "deptTime": "18.41811047550525",
            "aggrDistance": 13.418110475505253,
            "overTime": 0.0
          },
          {
            "id": "order7",
            "jobType": "ORDER",
            "weight": 3.0,
            "arriveTime": "19.832324037878347",
            "deptTime": "20.832324037878347",
            "aggrDistance": 14.83232403787835,
            "overTime": 0.0
          }
        ],
        "routeDistance": 14.83232403787835,
        "routeTotalWeight": 15.0,
        "routeTotalOrderNum": 6,
        "routeOverTime": 0.0
      }
    ],
    "unAssignedJobList": [],
    "totalOverTime": 0.0,
    "totalDistance": 34.6564376724764,
    "unAssignedOrderNum": 0
  },
  "errorCode": null,
  "errorMsg": null,
  "appendMsg": null
}
```

### 示例方案展示

![image](https://user-images.githubusercontent.com/14962503/179478813-a190c613-852c-4db2-8010-36b383c8f29b.png)

## 服务支持

### 团队介绍

![image](https://user-images.githubusercontent.com/14962503/179480046-c085c528-bf8e-48ea-8a25-00563e40852f.png)

团队网址：[https://www.scienson.com/](https://www.scienson.com/)

### 服务说明

1. 私有化部署支持；
1. 基于实际业务场景，可提供定制化的业务约束和目标，能够为您提供定制化的调度算法服务，欢迎随时联系我们；
1. 可提供该服务的 7 \* 24 小时在线答疑

客服微信：

![weixin](https://user-images.githubusercontent.com/14962503/179480093-dc6fcfc4-fb02-4245-9155-6d0b7126a36f.jpg)
