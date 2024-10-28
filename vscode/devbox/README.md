# Devbox

Sailos Devbox is a remote development&production environment that helps you develop and deploy your projects.

This plugin support connection and management of Devbox.

> Note: Currently, only connections are supported, management will be supported later.

## Features

- Remote environment is based on Kubernetes, it has the advantages of K8S's environment.
- Preset popular languages and frameworks make it easy to get started with development.
- It has all the features of the editor, such as VSCode and Cursor.

## Usage

### 1. Connect to the remote environment

Login to the [Sailos Devbox](https://usw.sailos.io/) and create new Devbox.

![create](https://raw.githubusercontent.com/mlhiter/typora-images/master/create-page.png)

Then you can connect to the Devbox by your own IDE in the list page.

![list](https://raw.githubusercontent.com/mlhiter/typora-images/master/CleanShot%202024-09-27%20at%2015.44.57%402x.png)

After that, you can use the Devbox just like your local environment.

### 2. Develop your project just like your local environment.

![dev](https://raw.githubusercontent.com/mlhiter/typora-images/master/img_v3_02f2_eb75e0b8-6eab-43e5-b383-6a953e7286eg.jpg)

### 3. Get your port export result

You can use local port forwarding supported by VSCode or Cursor to get your own page.

![port-forward](https://raw.githubusercontent.com/mlhiter/typora-images/master/CleanShot%202024-09-27%20at%2015.10.37%402x.png)

![port-forward-result](https://raw.githubusercontent.com/mlhiter/typora-images/master/CleanShot%202024-09-27%20at%2015.50.18%402x.png)

If you want to **share your port (maybe a page or an API) with others**,you can update your network config in Sailos Devbox Website to export your port **in public network**.

you can update a public port or there is **a preset default public export port**(Different runtime has a different default public export port).

![update-network](https://raw.githubusercontent.com/mlhiter/typora-images/master/CleanShot%202024-09-27%20at%2015.54.36%402x.png)

## Requirements

You need to install `Remote - SSH` extension in your IDE firstly.

## Known Issues

- Management function is not supported yet.
- Local port forwarding only supports same port forwarding. such as devbox's 8080->localhost:8080.
