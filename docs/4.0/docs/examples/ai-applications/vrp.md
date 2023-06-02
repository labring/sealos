# Vehicle Routing Problem Service

## Introduction

![Picture1](https://user-images.githubusercontent.com/14962503/179478363-172a4764-f644-40d8-8784-2fdb25ace7a2.png)

The Vehicle Routing Problem is academically one of the most basic and most challenging problems in network optimization, 
and one of the most extensive application scenarios in the field of logistics. The end, to each link in the warehouse. 
It has a significant role in improving efficiency and saving costs. As the logistics industry develops towards intelligence, 
the application scenarios of vehicle path planning, which is one of the core intelligent algorithms of logistics, 
are becoming more and more abundant. The intelligent vehicle scheduling service is independently developed by the scienson algorithm team, 
which can aim at the optimization of time efficiency and support the solution of various types of path optimization problems. 
Combined with the super big data computing capability of cloud computing, the service of the distribution plan with the lowest transportation cost can be planned in a short time. 
Applicable to various types of transportation and distribution business, it can effectively improve operational efficiency, reduce human errors, and reduce transportation costs.

### Service advantage

#### Multi-dimensional input parameters

Capacity constraints: the load and weight of the vehicle; 
Time window: the earliest late delivery or pick-up time window of the goods; 
Duration constraints: the loading and unloading time and operation waiting time of the pickup and delivery; 
Transportation restrictions: Different models are actually transported speed limit, travel radius, and cost calculation requirements for different transportation modes. 
Combined with OSM, comprehensively consider the address of each warehouse and delivery point and obtain the current road conditions, etc.; 
Optimization goals: the least vehicles, the shortest distance or the least cost;

#### Diversified calling methods

1. It can support free invocation of intelligent scheduling services through SaaS services;
2. Mirror service can be deployed privately using Sealos;

#### Intuitive display of optimization results

1. Visually display the completed dispatch plan, such as the total cost of the dispatch plan, the total number of trains, the total mileage, and the route;
2. It is convenient and quick to intervene in manual adjustment, and the cost and mileage data after manual intervention can be obtained in real time;

#### Flexible combination of constraints and goals

We're not just solving one VRP problem, we're solving a whole class of problems like vehicle scheduling. 
Based on the different actual business scenarios of customers, the constraints and goals of the algorithms are often not completely reused. 
The Sansheng algorithm team provides one-to-one personalized customization services. 
We have carefully designed a robust and flexible algorithmic architecture that can plug-in specific constraints and goals to serve you at a very low cost.

## Installation

```shell script
$ sealos run luanshaotong/vrp:v0.1.1
```

## API

### Address

[http://116.204.64.253:7001/avatarsolver-portal/vrp/dvrpSolve](http://116.204.64.253:7002/avatarsolver-portal/route/navigate)

Request Type：POST

Content-Type：application/json

### Scheduling constraints and goals

| Type | Description | Details |
| -------------- | ------------------ | ---------------------------------------------------------------------------------- |
| Constraints | Vehicle Capacity Constraints | The total weight of the vehicle is limited, that is, the total order cargo carried on the vehicle cannot be higher than the total vehicle weight limit |
| Constraints | Vehicle Time Window Constraints | The vehicle has a specific working time window, and the vehicle time window will be considered in the path planning, that is, the vehicle working time must be within the time window |
| 1st priority goal | Least number of unfulfilled orders | Fulfill as many orders as possible and as few unfulfilled orders as possible |
| Second priority goal | Minimum order timeout | Minimum order total timeout in scheduling plan |
| The third priority goal | The total transportation time is the least | The overall plan takes the least time, and the time is the time from the start of vehicle delivery to the completion of the delivery of the last order |
| Fourth priority goal | Minimum total vehicle mileage | Minimum vehicle total mileage |

The constraints and targets currently supported by the API are shown in the table above. If you have other constraints and target requirements, please feel free to contact the customer service staff, and we will provide one-to-one customized services for your specific business.

### Parameters

1. request

| Field Name | | Field Description |
| --------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| key | | API call key1. For general users, please fill in: "91cb09e7-72b7-4094-839e-166bdc279e01"1. For private users, please contact customer service to obtain the key |
| depotParam      |                       | Parameter information of warehouse                                                                                                                                                                                                                                                                                                                                                              |
|                 | depotId               | warehouse id, type: string                                                                                                                                                                                                                                                                                                                                                        |
|                 | positionInfo          | The latitude and longitude information of the warehouse:1. lon: longitude, type: float1. lat: latitude, type: float                                                                                                                                                                                                                                                                                     |
| vehicleParams   |                       | Parameter information of the vehicle                                                                                                                                                                                                                                                                                                                                                               |
|                 | plate                 | license plate number, type: string                                                                                                                                                                                                                                                                                                                                                         |
|                 | capacity              | Vehicle capacity information:  maxWeight: maximum load, format type: floating point number  Capacity can support multiple configurations, if you need other types of support, please contact customer service                                                                                                                                                                                                                                                     |
|                 | startLocation         | Longitude and latitude information of vehicle origin:1. lon: longitude, type: float1. lat: latitude, type: float                                                                                                                                                                                                                                                                               |
|                 | earliestDeparture     | Earliest departure time, format type: floating point numberPlease convert the time to a unified numeric type                                                                                                                                                                                                                                                                                                            |
|                 | timeWindowInfo        | Vehicle time window information, indicating vehicle working time period: beginTime: start time, format type: floating point numberendTime: end time, format type: floating number number                                                                                                                                                                                                                                                     |
| orderParams     |                       | Parameter information of the order                                                                                                                                                                                                                                                                                                                                                               |
|                 | orderId               | order id format type string                                                                                                                                                                                                                                                                                                                                                   |
|                 | positionInfo          | The latitude and longitude information of the order service point:1. lon: longitude, type: float1. lat: latitude, type: float                                                                                                                                                                                                                                                                               |
|                 | timeWindowInfo        | The effective service time window of the order, indicating the working time period of the service point: beginTime: start time, format type: floating point numberendTime: end time, format type: floating number number                                                                                                                                                                                                                                           |
|                 | serviceTime           | Loading/unloading or service time of the order, format: floating point number                                                                                                                                                                                                                                                                                                                                      |
|                 | demand                | Demand of the orderweight: weight demand of the goodsDemand can support various configurations, if you need other types of support, please contact customer service                                                                                                                                                                                                                                                                           |
| relationParam   |                       | Relationship parameters, set distance or time matrix parameters, users can customize distance and time matrix information using this parameter. If this parameter is not filled, you need to rely on distanceCalculateType to specify the distance calculation type.                                                                                                                                                                                                                          |
|                 | distanceTable         | Distance matrix, you can set the following distance relationships:1, order service point distance information2, order and vehicle distance information3, warehouse and order distance information4, warehouse and vehicle distance informationThe distance unit is unified as meterExample:"distanceTable": { "order1": { "order2":5, "vehicleA":4 }}Example description: Indicates that the distance between order1 and order2 is 5 meters, and the distance between order1 and vehicleA is 4 meters |
|                 | durationTable         | Time matrix, you can set the following time relationships:1. Time-consuming information of order service points2. Time-consuming information of orders and vehicles3. Time-consuming information of warehouses and orders4. Time-consuming information of warehouses and vehicles Time-consuming informationThe time unit is unified into seconds"durationTable":{ "order1":{ "order2":5, "vehicleA":4 } }Example description: Indicates that order1 and order2 take 5 seconds, and order1 and vehicleA take 4 seconds             |
| dvrpConfigParam |                       | Overall global configuration                                                                                                                                                                                                                                                                                                                                                                |
|                 | needBackToDepot       | Whether the vehicle needs to return to the warehouse, the default is false, if it is set to true, the calculation process will consider the vehicle returning to the warehouse;                                                                                                                                                                                                                                                                                          |
|                 | globalVelocity        | global vehicle speed unit kmh                                                                                                                                                                                                                                                                                                                                                     |
|                 | distanceCalculateType | Distance calculation type1. circle: use high precision spherical distance calculation1. euclidean: use plane Euclidean distance calculation                                                                                                                                                                                                                                                                           |
|                 | timeType              | Time format type, this field is used to represent the set time type, which will be output in an intuitive format in the returned result1. DATE: date type1. VALUE: numeric type (default)                                                                                                                                                                                                                                |

2. return

| Field Name | | Field Description                                                                                                                                                                                                                               |
| ------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| success            |              | Whether the call was successful                                                                                                                                                                                                                           |
| errorCode          |              | Error codeCB00001 : Business exception, usually caused by business logic exception, please check your parameters carefully;CB00002: System exception,Usually caused by a system error, please contact customer service to deal with itCB00003: Invalid parameter, usually the input parameter format is incorrect, please check your input parameter based on the exampleCB0004: JSON parsing failed |
| errorMsg           |              | error message                                                                                                                                                                                                                                |
| appendMsg          |              | additional error description                                                                                                                                                                                                                            |
| dvrpRouteInfos     |              | planning route information for vehicle scheduling                                                                                                                                                                                                                  |
| vehicleId          |              | vehicle id type format string                                                                                                                                                                                                              |
| assignedJobList    |              | the order of delivery tasks on the route                                                                                                                                                                                                                   |
|                    | id           | taskID                                                                                                                                                                                                                                 |
|                    | jobType      | Task type:1. If it is DEPOT, it means warehouse;1. If it is ORDER, it means order;                                                                                                                                              |
|                    | weight       | weight information                                                                                                                                                                                                                                |
|                    | arriveTime   | the point in time when the task was reached                                                                                                                                                                                                                     |
|                    | deptTime     | time to leave the task                                                                                                                                                                                                                     |
|                    | aggrDistance | the current accumulated mileage of the vehicle                                                                                                                                                                                                                 |
|                    | overTime     | vehicle s current timeout                                                                                                                                                                                                                        |
| routeDistance      |              | total vehicle mileage                                                                                                                                                                                                                          |
| routeTotalWeight   |              | gross vehicle path weight                                                                                                                                                                                                                          |
| routeTotalOrderNum |              | vehicle routing total orders                                                                                                                                                                                                                        |
| routeOverTime      |              | total path timeout                                                                                                                                                                                                                          |
| unAssignedOrderNum |              | unassigned order quantity                                                                                                                                                                                                                       |
| unAssignedJobList  |              | unassigned task list                                                                                                                                                                                                                        |
| totalOverTime      |              | vehicle timeout time of overall scheduling scheme                                                                                                                                                                                                              |
| totalDistance      |              | The total vehicle mileage of the overall dispatch plan                                                                                                                                                                                                               |

### Examples

1. request

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

2. return

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

### Visualization

![image](https://user-images.githubusercontent.com/14962503/179478813-a190c613-852c-4db2-8010-36b383c8f29b.png)

## Support

### team introduction

![image](https://user-images.githubusercontent.com/14962503/179480046-c085c528-bf8e-48ea-8a25-00563e40852f.png)

[https://www.scienson.com/](https://www.scienson.com/)

### service description

1. Private deployment support; 
2. Based on actual business scenarios, it can provide customized business constraints and goals, and can provide you with customized scheduling algorithm services, please feel free to contact us; 
2. 7 / 24 who can provide this service Hours online Q&A customer service WeChat:

![weixin](https://user-images.githubusercontent.com/14962503/179480093-dc6fcfc4-fb02-4245-9155-6d0b7126a36f.jpg)
