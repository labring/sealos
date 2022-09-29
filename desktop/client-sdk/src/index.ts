class ClientSDK {
  private commonConfig = {
    appKey: "",
    appName: "",
    origin: "",
  };

  constructor(config) {
    this.commonConfig = {
      appKey: config.appKey,
      appName: config.appName,
      origin: "",
    };
  }

  connect(): Promise<{ connect: boolean }> {
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

  getUserInfo(): Promise<{
    user: {
      id: string;
      name: string;
      avatar: string;
    };
    kubeconfig: string;
    token: {
      access_token: string;
      expiry: string;
      token_type: string;
      refresh_token: string;
    };
  }> {
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
