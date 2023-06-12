# Quick installation of ILLA Cloud

[ILLA Cloud](https://www.illacloud.com/zh-CN) is an open-source platform to build, deploy, and maintain internal apps. You can build anything from simple CRUD apps, admin panels, dashboards to custom business apps and complicated multi-step workflows.

## Step 1: open the App Launchpad application

![illa_home](../images/illa_home.jpg)

## Step 2: create a new application

- In App Launchpad, click "New Application" to create a new application.

![illa0](../images/illa0.png)

## Step 3: application deployment

- Basic configuration:

  - Application name (Custom): illa-builder

  - Image name (default latest version): illasoft/illa-builder

  - CPU (recommended): 0.5 Core

  - Memory (recommended): 512 MB 
  
  - Note: both the CPU and Memory configuration here is the minimum requirement, you may use more based on your needs.

- deployment mode:

  - number of instances (custom): 1

![illa1](../images/illa1.jpg)

- Network configuration:

  - Container exposure port: 2022

  - Public network access: enabled

  - Custom domain: (left blank in the example here but you may put your own domain down)

![illa2](../images/illa2.jpg)

- Advanced configuration:

  - Customize local database and drive for ILLA Cloud (use 1GB here but you may use more according to your needs).

![illa3](../images/illa3.jpg)

## Step 4: deploy the application

- Click "deploy Application" to start deploying the application.

![illa4](../images/illa4.jpg)

## Step 5: access the application

- Click "details" to view, when the STATUS of the application has changed from Pending to Running, it indicates that the application has been launched successfully.

- When STATUS is Running, you can directly access the public network address.

![illa5](../images/illa5.jpg)

- The visit was successful!

![illa6](../images/illa6.jpg)
