class MasterSDK {
  childList = [];
  session = {};
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
          dom?.contentWindow.postMessage(
            {
              apiName,
            },
            origin
          );

          break;

        case "user.getInfo":
          dom?.contentWindow.postMessage(
            {
              apiName: "user.getInfo",
              data: this.session,
            },
            origin
          );

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
