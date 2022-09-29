const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement =>
  input !== null && input.tagName === "IFRAME";

type TChild = {
  [key: string]: {
    origin: string;
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
      const { apiName, appName, appKey, origin } = data || {};
      if (!apiName) {
        return;
      }

      let dom = window.document.getElementById("app-window-" + appName);

      switch (data.apiName) {
        case "init":
          break;

        case "system.connect":
          const { location } = data.data;
          this.childList.push({
            [appKey]: {
              origin,
              location,
            },
          });

          if (isIFrame(dom) && dom.contentWindow) {
            dom?.contentWindow.postMessage(
              {
                apiName,
              },
              origin
            );
          }

          break;

        case "user.getInfo":
          if (isIFrame(dom) && dom.contentWindow) {
            dom?.contentWindow.postMessage(
              {
                apiName: "user.getInfo",
                data: this.session,
              },
              origin
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
