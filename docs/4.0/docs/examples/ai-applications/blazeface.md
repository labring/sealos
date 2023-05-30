# Blazeface detector

## Introduction

Blazeface is a lightweight model that detects faces in images. Blazeface makes use of a modified Single Shot Detector architecture with a custom encoder. The model may serve as a first step for face-related computer vision applications, such as facial keypoint recognition.

This project wrap the tensorflow.js model into a REST API so that developers do not need to install the TFjs environment.

For more information please refer to the complete documentation here:   
[https://www.npmjs.com/package/@tensorflow-models/blazeface](https://www.npmjs.com/package/@tensorflow-models/blazeface)

## Installation

```shell script
$ sealos run luanshaotong/sealos-blazeface:v0.1
```

## API

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

### Direct use in Javascript

The pod includes a http-server image so that you can load the model in your js project using tensorflow.js .

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

## Support

Please refer to the complete documentation here: https://www.npmjs.com/package/@tensorflow-models/blazeface
