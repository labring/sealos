# How to deploy the application to desktop

## Use Terminal to write app.yaml

### Key Information

- type: iframe, identified as a web application
- spec name is the name displayed on the desktop
- url application address
- icon is the icon displayed on the desktop

```yaml
apiVersion: app.sealos.io/v1
kind: App
metadata:
  name: app-sample
spec:
  name: Image Hub Demo
  icon:
  type: iframe
  data:
    url: https://hub.sealos.io/
    desc:
  icon: https://cloud.sealos.io/images/icons/app_store.png
  menuData:
    nameColor: text-black
    helpDropDown:
    helpDocs:
  displayType: normal
```

![appyaml.png](./image/app-yaml.png)

### apply yaml

```
kubectl apply -f app.yaml
```

![apply](./image/app-apply-command.png)

### Refresh the browser, you can see the app on the desktop
