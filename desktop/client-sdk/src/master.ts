import { API_NAME } from "./constant";

const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement =>
  input !== null && input.tagName === "IFRAME";

type TChild = {
  [key: string]: {
    clientOrigin: string;
    location: string;
  };
};
class MasterSDK {
  private readonly childList: TChild[] = [];
  private readonly session = {};

  constructor(session) {
    this.session = session;
  }

  init() {
    window.addEventListener("message", ({ data }) => {
      const { apiName, appName, appKey, clientOrigin } = data || {};
      if (!apiName) {
        return;
      }

      let dom = window.document.getElementById("app-window-" + appName);

      switch (data.apiName) {
        case API_NAME.MASTER_INT:
          break;

        case API_NAME.SYSTEM_CONNECT:
          const { location } = data.data;
          this.childList.push({
            [appKey]: {
              clientOrigin: clientOrigin,
              location,
            },
          });

          if (isIFrame(dom) && dom.contentWindow) {
            dom?.contentWindow.postMessage(
              {
                apiName,
              },
              clientOrigin
            );
          }

          break;

        case API_NAME.USER_GETINFO:
          if (isIFrame(dom) && dom.contentWindow) {
            dom?.contentWindow.postMessage(
              {
                apiName: API_NAME.USER_GETINFO,
                data: this.session,
              },
              clientOrigin
            );
          }
          break;

        default:
          break;
      }
    });

    return () => {
      window.removeEventListener("message", (e) => {
        console.log("removed...");
      });
    };
  }
}

export default MasterSDK;
