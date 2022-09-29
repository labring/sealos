class ClientSDK {
  commonConfig = {
    appKey: "",
    appName: "",
    origin: "",
  };

  iframeUrl = "";

  isConnected = false;

  _instance;

  constructor(config) {
    this.commonConfig = {
      appKey: config.appKey,
      appName: config.appName,
      origin: "",
    };
  }

  connect() {
    this.commonConfig.origin = window.location.origin;
    window.top?.postMessage(
      {
        apiName: "system.connect",
        ...this.commonConfig,
        data: {
          location: window.location.href.toString(),
        },
      },
      "*"
    );

    return new Promise((resolve) => {
      window.addEventListener("message", (e) => {
        if (e.data.apiName === "system.connect") {
          resolve({
            connect: true,
          });
        }
      });
    });
  }

  getUserInfo() {
    window.top?.postMessage(
      {
        apiName: "user.getInfo",
        ...this.commonConfig,
        data: {},
      },
      "*"
    );

    return new Promise((resolve) => {
      window.addEventListener("message", (e) => {
        if (e.data.apiName === "user.getInfo") {
          resolve(e.data.data);
        }
      });
    });
  }
}

export default ClientSDK;
