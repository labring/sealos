---
sidebar_position: 1
---

# Quick Installation of Uptime Kuma



![](../images/uptimekuma_img-10.png)

[Uptime Kuma](https://github.com/louislam/uptime-kuma) is an open-source and easy-to-use server monitoring tool. It helps you monitor the real-time status, response time, and other key metrics of your server to ensure that it always remains in optimal condition. If you want to quickly install Uptime Kuma, follow these steps:

### Step 1: First, enter Sealos and open the App Launchpad

![](../images/uptimekuma_img-1.png)

### Step 2: Create a New Application

Open the App Launchpad in the [Sealos](https://cloud.sealos.io) desktop environment, click "New Application" to create a new application.

![](../images/uptimekuma_img-2.png)

### Step 3: Set Startup Parameters

Configure the startup parameters as follows:

- Set the container exposed port to 3001
- Enable public network access to access the application via the provided domain

![](../images/uptimekuma_img-3.png)

![](../images/uptimekuma_img-4.png)

### Step 4: Set up Storage Volumes

In the advanced settings, add a storage volume mount to persist the Uptime Kuma data directory `/app/data`. This ensures that the application data is not lost when the container restarts.

![](../images/uptimekuma_img-5.png)

### Step 5: Deploy the Application

Click 「Deploy Application」 to start the application:

![](../images/uptimekuma_img-6.png)

### Step 6: Access the Application

Once the application is successfully launched, you can access it using its public network address. Enter the application domain in your browser to access the main interface.

![](../images/uptimekuma_img-7.png)

### Step 7: Create an Administrator Account

To ensure the security of Uptime Kuma, you will need to create an administrator account when you first access the application. Fill in the basic information for the administrator account, including the username and password. After completing the form, click the "Create" button to register the account.

![](../images/uptimekuma_img-8.png)

### Step 8: Add Custom Monitoring Items

![](../images/uptimekuma_img-9.png)

![](../images/uptimekuma_img-0.png)