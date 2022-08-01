# Blazeface人脸检测

## 服务介绍

Blazeface 是一种轻量级模型，可检测图像中的人脸。 Blazeface 使用经过修改的 Single Shot Detector 架构和自定义编码器。 该模型可以作为与面部相关的计算机视觉应用的第一步，例如面部关键点识别。

本项目将 tensorflow.js 模型包装成一个 REST API，这样开发者不需要安装 TFjs 环境就可以在 sealos 中使用人脸检测功能。

有关更多信息，请参阅此处的完整文档：  
[https://www.npmjs.com/package/@tensorflow-models/blazeface](https://www.npmjs.com/package/@tensorflow-models/blazeface)

## 安装

```shell script
$ sealos run luanshaotong/sealos-blazeface:v0.1
```

## API调用

### Address

http://blazeface-service.blazeface.svc.cluster.local:8081/api/face

Request Type：POST

Content-Type：application/json

### Parameters

1. request

```json
{
    "data":"/9j/2wCEAAgGBgcGBQgHBwcJCQgK...",  
    "width":352,
    "height":352
}
```

1. return

```json
{
     "status": "ok",
     "result": [
          {
               "topLeft": [
                    72.4721908569336,
                    135.42098999023438
               ],
               "bottomRight": [
                    235.3646240234375,
                    298.3135070800781
               ],
               "landmarks": [
                    [
                         117.72970151901245,
                         195.7294445335865
                    ], // right eye
                    [
                         189.26612424850464,
                         197.56982764601707
                    ], // left eye
                    [
                         148.54099228978157,
                         249.37124395370483
                    ], // nose
                    [
                         148.59421181678772,
                         271.4104413986206
                    ], // mouth
                    [
                         83.46071767807007,
                         190.3339051604271
                    ], // right ear
                    [
                         225.17551040649414,
                         194.26241767406464
                    ] // left ear
               ],
               "probability": [
                    0.9985783100128174
               ]
          }
     ]
}
```

### directly use in javascript

除了 REST API，pod 中还包含了一个提供模型下载的 http-server，可以在你的 js 代码中通过该接口直接加载模型到内存中。

```javascript
var getPixels = require("get-pixels")
require("@tensorflow/tfjs-backend-cpu")
var blazeface = require('@tensorflow-models/blazeface');

const returnTensors = false;

const model = blazeface.load({
    modelUrl: "http://blazeface-service.blazeface.svc.cluster.local:8080/model.json"
});

getPixels("./image.jpg", function(err, pixels) {
    if (err) {
        console.log("Bad image path")
        return
    }
    console.log(pixels)

    var image = {
        data: new Uint8Array(pixels.data),
        width: pixels.shape[0],
        height: pixels.shape[1]
    }

    var predictions = model.then(function(res) {
        return res.estimateFaces(image, returnTensors);
    })
    predictions.then(function(res) {
        console.log(res)
    });
})
```

## 服务支持

请参阅此处的完整文档：  
[https://www.npmjs.com/package/@tensorflow-models/blazeface](https://www.npmjs.com/package/@tensorflow-models/blazeface)
