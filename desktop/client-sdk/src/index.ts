import { API_NAME } from "./constant";

class ClientSDK {
  private commonConfig = {
    appKey: "",
    appName: "",
    clientOrigin: "",
  };

  private masterOrigin = window?.top?.origin || "*";

  constructor(config) {
    this.commonConfig = {
      appKey: config.appKey,
      appName: config.appName,
      clientOrigin: "",
    };
  }

  connect(): Promise<{ connected: boolean }> {
    this.commonConfig.clientOrigin = window.location.origin;
    window.top?.postMessage(
      {
        apiName: API_NAME.SYSTEM_CONNECT,
        ...this.commonConfig,
        data: {
          location: window.location.href.toString(),
        },
      },
      this.masterOrigin
    );

    return new Promise((resolve) => {
      window.addEventListener("message", (e) => {
        if (
          e.origin === this.masterOrigin &&
          e.data.apiName === API_NAME.SYSTEM_CONNECT
        ) {
          resolve({
            connected: true,
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
        apiName: API_NAME.USER_GETINFO,
        ...this.commonConfig,
        data: {},
      },
      this.masterOrigin
    );

    return new Promise((resolve) => {
      window.addEventListener("message", (e) => {
        if (
          e.origin === this.masterOrigin &&
          e.data.apiName === API_NAME.USER_GETINFO
        ) {
          resolve(e.data.data);
        }
      });
    });
  }
}

export default ClientSDK;
