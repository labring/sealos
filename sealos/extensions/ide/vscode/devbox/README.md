# DevBox by Sealos

Seamless cloud development on Kubernetes — right inside your IDE.

DevBox by Sealos gives you zero-config cloud dev environments backed by Kubernetes. Build, test, and deploy projects remotely, with all the power of your favorite editor.

> Note: Current version supports remote connections and basic management. Advanced features—including AI coding tools—are coming soon.

## Important Links
- [Sealos](https://sealos.io) - an enterprise-grade cloud operating system built on Kubernetes that provides a unified platform for developers to develop, deploy, and scale applications with ease.
- [Sealos DevBox](https://sealos.io/products/devbox) - a ready-to-code cloud developmnet envrionemnt that eliminates development environment friction with instant setup, perfect isolation, and enterprise security.

## Key Features
- Remote-by-default: Your DevBox runs on Kubernetes in the cloud.
- Zero config: No setup required. Just log in and connect.
- Ready-to-code: Preinstalled languages and frameworks.
- VS Code & Cursor compatible: Use all your favorite editor features.
- Port access: Forward local ports or expose them publicly.

## How DevBox Works

### 1. Create a DevBox

Login to [Sealos](https://os.sealos.io) and head over to the [DevBox](https://os.sealos.io/?openapp=system-devbox) module to create a new DevBox.

![create](https://raw.githubusercontent.com/mlhiter/typora-images/master/create.png)

### 2. Open in your IDE

From DevBox chose your prfered IDE and connnect with just one click.

![list](https://raw.githubusercontent.com/mlhiter/typora-images/master/list.png)

### 3, Start Coding Remotely

Use the DevBox like a local dev environment — just faster and preconfigured.

![dev](https://raw.githubusercontent.com/mlhiter/typora-images/master/dev.png)

### 4. Access Your App

#### Local Preview

Use VS Code or Cursor port forwarding to preview your app.

![port-forward](https://raw.githubusercontent.com/mlhiter/typora-images/master/port-forward.png)

![port-forward-result](https://raw.githubusercontent.com/mlhiter/typora-images/master/port-forward-result.png)

#### Share Publicly

Want others to view your app or API? Expose a public port from your DevBox dashboard.

Use the preset default public port per runtime or configure custom port exports easily

![update-network](https://raw.githubusercontent.com/mlhiter/typora-images/master/update-network.png)

## DevBox Management

### 1. Quick Actions

Manage your DevBoxes or send feedback directly from the extension.

> Note: Deleting a DevBox from the plugin only removes the local SSH config—it won’t delete the actual environment.

![manage](https://raw.githubusercontent.com/mlhiter/typora-images/master/manage.png)

### 2. Network and Database panel

Monitor your the network settings of your DevBox and view all databases in your namespace.

![network](https://raw.githubusercontent.com/mlhiter/typora-images/master/network.png)
![database](https://raw.githubusercontent.com/mlhiter/typora-images/master/database.png)

## Requirements

- VS Code, Cursor or any other VS Code compatible IDE
- Remote - SSH extension installed
- An SSH client installed locally

## Coming Soon

- Natively integrated AI features
