# Quick installation of low-code platform Appsmith

[Appsmith](https://github.com/appsmithorg/appsmith) is an open-source platform to build, deploy, and maintain internal apps. You can build anything from simple CRUD apps, admin panels, dashboards to custom business apps and complicated multi-step workflows.

## Step 1: open the App Launchpad application

![](./image/appsmith-1.png)

## Step 2: create a new application

- In App Launchpad, click "New Application" to create a new application.

![](./image/appsmith-2.png)

## Step 3: application deployment

- Basic configuration:
  
  - Application name (Custom): appsmith
  
  - Image name (default latest version): appsmith/appsmith-ce
  
  - CPU (recommended): 2 Core
  
  - Memory (recommended): 4 GB

- deployment mode:
  
  - number of instances (custom): 1

![](./image/appsmith-3.png)

- Network configuration:
  
  - Container exposure port: 80
  
  - Public network access: enabled

![](./image/appsmith-4.png)

- Advanced configuration:
  
  - Customize local storage and persist Appsmith data (15 GB is recommended).

![](./image/appsmith-5.png)

## Step 4: deploy the application

- Click "deploy Application" to start deploying the application.

![](./image/appsmith-6.png)

## Step 5: access the application

- Click "details" to view, when the STATUS of the application has changed from Pending to Running, it indicates that the application has been launched successfully.

- When STATUS is Running, you can directly access the public network address.

![](./image/appsmith-7.png)

- The visit was successful!

![](./image/appsmith-8.png)


