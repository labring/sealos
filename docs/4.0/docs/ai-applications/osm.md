# OpenStreetMap Navigation Service

## Introduction
![17359201](https://user-images.githubusercontent.com/14962503/179479809-2fd169b8-d452-4b2a-ad6b-8004389b40a5.jpeg)

Routing is a common service commonly used in business. The core is to solve the problem of point-to-point distance and time estimation. 
In the logistics industry, takeaway industry and supply chain industry, the application is particularly common. 
Path planning needs to simulate and calculate the actual driving path between two points based on real map information, including distance information, 
time-consuming information, and road navigation information. Due to factors such as general traffic control, 
different types of real moving objects will have different navigation paths. Common ones are: car navigation, walking navigation, and bicycle navigation, etc. 
A complete path planning service needs to support multiple navigation types.
At present, there are relatively few manufacturers providing path planning services on the market at home and abroad. 
There are AutoNavi, Baidu in China, and google and here in foreign countries. 
For small and medium-sized enterprises, the use of the above-mentioned business services usually faces a large cost. 
For ordinary-scale calls, it costs hundreds of thousands of yuan in call costs each year, and this does not include QPS and RT limits. 
Usually daily enterprise usage scenarios do not pursue ultra-high navigation accuracy, as long as the planning accuracy rate is greater than 90%, it is acceptable.

The route planning service based on openStreetMap is the obvious choice. 
Using open map data to build route planning services can help companies greatly reduce service costs and reduce the strong dependence of businesses on map service providers. 
This service is most suitable for scenarios that require high QPS, low RT, and large-scale matrix computing.

### serviceAdvantage

#### freeService

1. The SaaS service is completely free and can provide route navigation services throughout China;
2. NoQPSLimit
3. noRTRestrictions

#### supportForPrivateCloudDeployment

Deep integration with sealos can provide one-stop private cloud deployment capabilities;

#### highPerformance

1. The evaluation RT of SaaS service public network call is 50ms, which is much smaller than other service providers;
2. The average RT of local mirror service calls is about 5ms;

#### matrixCalculation

For planning application scenarios, matrix calculation of distance or time is usually necessary. 
The OSM-based path planning service provides powerful matrix computing services. 
After our long-term algorithm optimization for matrix planning, RT is greatly reduced, which can support 10000\10000 large matrix calculations.

#### highFrequencyUpdateOfMapData

For SaaS services, we will update the underlying map data frequently and regularly, and build a new map network every week based on the latest OSM data.

#### highMapAccuracy

Based on China map data, randomly sampled within 500KM, and respectively call the following three services to obtain distance data:

1. AutoNavi; 
2. Accurate spherical distance calculation; 
3. OSM navigation service;

The following figure shows the distance curves calculated by the three services:

![image](https://user-images.githubusercontent.com/14962503/179479910-f52ecd96-2cf2-4116-ac2f-93daa859f468.png)

It can be seen that the distance calculated by the spherical straight line has a large deviation, and the larger the distance, the higher the absolute value of the deviation. 
And OSM navigation is very close to AutoNavi. To further analyze the OSM navigation accuracy, we plotted the error rate curve:

![image](https://user-images.githubusercontent.com/14962503/179479965-301fdc3f-154c-4f45-98c4-c2fefb05268d.png)

It can be seen that the accuracy of spherical distance calculation is usually above 15%, and the short distance can reach 25%. 
The OSM navigation can control the accuracy rate below 5%, and the greater the distance, the higher the accuracy rate. 
It can meet the vast majority of usage scenarios of the business.

## Installation

Not available for free.

## API

### Address

[http://116.204.64.253:7002/avatarsolver-portal/route/navigate](http://116.204.64.253:7002/avatarsolver-portal/route/navigate)

Request Type：POST

Content-Type：application/json

### Parameters

1. request

|fieldName              | fieldDescription                                                                                                                                                                                                                                           |
| ------------------- |------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| key                 | API call key 1. For general users, please fill in: "91cb09e7-72b7-4094-839e-166bdc279e01" 1. For private users, please contact customer service to obtain the key                                                                                     |
| gisStandardType     | Standard types of latitude and longitude:1. GCJ02: Chinese standard, which is adopted by most domestic map providers, such as AutoNavi map;1. WGS84: International standard, which is adopted by overseas maps , for example: Google Maps;  |
| startPosition       | Origin latitude and longitude:1. lon: longitude1. lat: latitude                                                                                                                                                                             |
| endPosition         | Destination latitude and longitude:1. lon: longitude1. lat: latitude                                                                                                                                                                        |
| needRouteDetail     | Whether navigation description is requiredtrue: requiredfalse: not required                                                                                                                                                                       |
| instructionLangType | Type of navigation description language:1. Chinese1. Japanese1. English                                                                                                                                                                |
| drivingType         | Navigation Type:car: Carmotorcycle: Motorcyclebike: Bicyclefoot: Walking                                                                                                                                                               |

2. return

| fieldName           | fieldDescription                                                                                                                                                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| success          | whetherTheCallWasSuccessful |
| errorCode        |Error codeCB00001 : abnormal business, usually caused by abnormal business logic, please check your parameters carefully, please do not import overseas map parameters;CB00002: abnormal system, usually caused by system error, please contact customer service CB00003: Invalid parameter, usually the input parameter format is incorrect, please check your input parameter based on the exampleCB0004: JSON parsing failed |
| errorMsg         | errorMessage                                                                                                                                                                                                                                                       |
| appendMsg        | additionalErrorDescription                                                                                                                                                                                                                                                   |
| distance         | distanceInMeters                                                                                                                                                                                                                                                   |
| duration         | timeInSeconds                                                                                                                                                                                                                                                    |
| wayPointList     | listOfWaypoints                                                                                                                                                                                                                                                      |
| instructionInfos | navigationDescriptionList                                                                                                                                                                                                                                                    |

### Examples

1. request

```json
{
  "key": "91cb09e7-72b7-4094-839e-166bdc279e01",
  "gisStandardType": "GCJ02",
  "startPosition": {
    "lon": 118.77087540907952,
    "lat": 31.97373869999062
  },
  "endPosition": {
    "lon": 118.81768217678243,
    "lat": 31.95568524518241
  },
  "needRouteDetail": true,
  "instructionLangType": 1,
  "drivingType": "car"
}
```

2. return

```json
{
  "success": true,
  "data": {
    "distance": 7397.578730590102,
    "duration": 414.191,
    "wayPointList": [
      {
        "lon": 118.77087540907952,
        "lat": 31.97373869999062
      },
      {
        "lon": 118.77171057566537,
        "lat": 31.976176940205473
      },
      {
        "lon": 118.77326941359988,
        "lat": 31.97631492889526
      },
      {
        "lon": 118.77365383511638,
        "lat": 31.976336469036127
      },
      {
        "lon": 118.77402934575777,
        "lat": 31.97623323886325
      },
      {
        "lon": 118.77417332400243,
        "lat": 31.976093172517697
      },
      {
        "lon": 118.77436007261561,
        "lat": 31.975995965839772
      },
      {
        "lon": 118.77452464223454,
        "lat": 31.975955860276223
      },
      {
        "lon": 118.77469570881107,
        "lat": 31.975949641330875
      },
      {
        "lon": 118.77486357986825,
        "lat": 31.975977615725707
      },
      {
        "lon": 118.77501906263807,
        "lat": 31.97603839044384
      },
      {
        "lon": 118.77518104424131,
        "lat": 31.976153447058323
      },
      {
        "lon": 118.7752968651657,
        "lat": 31.97630322835918
      },
      {
        "lon": 118.77553409235463,
        "lat": 31.976510906682044
      },
      {
        "lon": 118.77581226968336,
        "lat": 31.976568887130703
      },
      {
        "lon": 118.7769941751091,
        "lat": 31.9766658587903
      },
      {
        "lon": 118.78254647330775,
        "lat": 31.97718644551635
      },
      {
        "lon": 118.78243200179382,
        "lat": 31.97614799684331
      },
      {
        "lon": 118.78237848525576,
        "lat": 31.975340835292915
      },
      {
        "lon": 118.78237044026082,
        "lat": 31.974758977573288
      },
      {
        "lon": 118.78230844508978,
        "lat": 31.97408549317431
      },
      {
        "lon": 118.78212635281974,
        "lat": 31.973130089301975
      },
      {
        "lon": 118.78202202928054,
        "lat": 31.972748577423108
      },
      {
        "lon": 118.78190830889122,
        "lat": 31.972297290256538
      },
      {
        "lon": 118.78156908228598,
        "lat": 31.971371925354152
      },
      {
        "lon": 118.78151760480164,
        "lat": 31.97103005275097
      },
      {
        "lon": 118.78155184031081,
        "lat": 31.970720692004214
      },
      {
        "lon": 118.78165040903737,
        "lat": 31.970422268004405
      },
      {
        "lon": 118.78185606352544,
        "lat": 31.970120042896497
      },
      {
        "lon": 118.7821260552221,
        "lat": 31.969901535367825
      },
      {
        "lon": 118.78241313068946,
        "lat": 31.9697374963147
      },
      {
        "lon": 118.78276024300949,
        "lat": 31.969635281475313
      },
      {
        "lon": 118.78311594731677,
        "lat": 31.96959853907517
      },
      {
        "lon": 118.78345447356789,
        "lat": 31.96964189132111
      },
      {
        "lon": 118.78379300058931,
        "lat": 31.96973982726721
      },
      {
        "lon": 118.78407469101532,
        "lat": 31.969864911464263
      },
      {
        "lon": 118.78434489450434,
        "lat": 31.970019498162532
      },
      {
        "lon": 118.78468952238961,
        "lat": 31.970324670245738
      },
      {
        "lon": 118.7848984920958,
        "lat": 31.97048221528412
      },
      {
        "lon": 118.78557352537388,
        "lat": 31.97086181211764
      },
      {
        "lon": 118.78632344026819,
        "lat": 31.971131738150486
      },
      {
        "lon": 118.78675751373213,
        "lat": 31.97123383678684
      },
      {
        "lon": 118.7871488354916,
        "lat": 31.971349574345844
      },
      {
        "lon": 118.78728216858434,
        "lat": 31.971359522516714
      },
      {
        "lon": 118.78806308537274,
        "lat": 31.971492705072382
      },
      {
        "lon": 118.79028876908701,
        "lat": 31.971892185181137
      },
      {
        "lon": 118.7926778593224,
        "lat": 31.972386189718378
      },
      {
        "lon": 118.79482902883517,
        "lat": 31.972911846904275
      },
      {
        "lon": 118.79778600777526,
        "lat": 31.973791063767187
      },
      {
        "lon": 118.79887887867733,
        "lat": 31.974191706680948
      },
      {
        "lon": 118.79953442828861,
        "lat": 31.974465290864913
      },
      {
        "lon": 118.80071081006072,
        "lat": 31.974918850653744
      },
      {
        "lon": 118.80151796751592,
        "lat": 31.97517918090206
      },
      {
        "lon": 118.80244630007233,
        "lat": 31.975456107207723
      },
      {
        "lon": 118.80408699382062,
        "lat": 31.97614041065381
      },
      {
        "lon": 118.8047610052502,
        "lat": 31.976243527162392
      },
      {
        "lon": 118.80494277945557,
        "lat": 31.976234741772867
      },
      {
        "lon": 118.80527118477276,
        "lat": 31.97617453467006
      },
      {
        "lon": 118.80631267684645,
        "lat": 31.975926924938296
      },
      {
        "lon": 118.80692564706932,
        "lat": 31.97583325532514
      },
      {
        "lon": 118.80712358252501,
        "lat": 31.975825635418932
      },
      {
        "lon": 118.80734287559403,
        "lat": 31.975795085214056
      },
      {
        "lon": 118.8077646849731,
        "lat": 31.975682921333597
      },
      {
        "lon": 118.80792418347444,
        "lat": 31.97562387326085
      },
      {
        "lon": 118.80862631529756,
        "lat": 31.974989362079214
      },
      {
        "lon": 118.80903692015103,
        "lat": 31.97472474191828
      },
      {
        "lon": 118.80980559157352,
        "lat": 31.973895749817686
      },
      {
        "lon": 118.81481249896396,
        "lat": 31.96782374972137
      },
      {
        "lon": 118.81548078590373,
        "lat": 31.966940576603267
      },
      {
        "lon": 118.81610564845133,
        "lat": 31.966006086222606
      },
      {
        "lon": 118.81644411579667,
        "lat": 31.965437116221874
      },
      {
        "lon": 118.8170168640694,
        "lat": 31.964385437963365
      },
      {
        "lon": 118.81820423289753,
        "lat": 31.961968865773827
      },
      {
        "lon": 118.8183935866171,
        "lat": 31.961311576049564
      },
      {
        "lon": 118.81877825659062,
        "lat": 31.959736344443655
      },
      {
        "lon": 118.81884553797457,
        "lat": 31.958852826074867
      },
      {
        "lon": 118.81929467836665,
        "lat": 31.956238913954
      },
      {
        "lon": 118.81768217678243,
        "lat": 31.95568524518241
      }
    ],
    "instructionInfos": [
     "distance: 277m, continue to Tiexin Industrial Park Road", 
     "distance: 221m, turn right to Software Avenue", 
     "distance: 844m, inside the roundabout, take Exit 2 to exit the roundabout and enter Software Avenue", 
     "distance: 345m , turn right", 
     "distance: 151m, keep right to the flower temple hub", 
     "distance: 965m, continue to the flower temple hub", 
     "distance: 1340m, keep left", 
     "distance: 265m, keep Go right", 
     "distance: 2832m, keep going right", 
     "distance: 152m, turn right", 
     "distance: 0m, end point reached"
    ]
  },
  "errorCode": null,
  "errorMsg": null,
  "appendMsg": null
}
```

## Support

### teamIntroduction

![image](https://user-images.githubusercontent.com/14962503/179480046-c085c528-bf8e-48ea-8a25-00563e40852f.png)

teamURL [https://www.scienson.com/](https://www.scienson.com/)

### serviceDescription

1. Privatization deployment support; 
2. Customized map navigation service for any overseas country, welcome to contact us; 
3. 7 \ 24 hours online Q&A service for this service Customer service WeChat:

![weixin](https://user-images.githubusercontent.com/14962503/179480093-dc6fcfc4-fb02-4245-9155-6d0b7126a36f.jpg)
