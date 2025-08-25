# Quick Installation of Gitea

Git with a cup of tea! Painless self-hosted all-in-one software development service, includes Git hosting, code review, team collaboration, package registry and CI/CD.

## Step 1: Log in to Sealos

- Go to the [Sealos](https://cloud.sealos.io/) official website

![](../images/gitea-0.png)

## Step 2: Open the App Launchpad 

![](../images/gitea-1.png)

## Step 3: Create a new application

- In App Launchpad, click "Create New Application" to create a new application.

![](../images/gitea-2.png)

## Step 4: Application deployment

- Basic configuration:

  - Application name (custom): gitea
  - Image name (default latest version): gitea/gitea:latest-rootless
  - CPU (recommended): 1 Core
  - Memory (recommended): 1 G

- Deployment mode:

  - Number of instances (custom): 1

![](../images/gitea-3.png)

- Network configuration:

  - Container  port: 3000
  - Accessible to the Public: enabled

![](../images/gitea-4.png)

- Advanced configuration:

  - Custom local storage, persist Gitea data (recommended 1 G).
  

![](../images/gitea-5.png)

## Step 5: Deploy the application

- Click「Deploy Application」 to start deploying the application.

![](../images/gitea-6.png)

## Step 6: Configure the database

- Configure MySQL database for Gitea via Sealos
- Click Database

![](../images/gitea-9.png)

- Create a new database

![](../images/gitea-10.png)

- Basic configuration:

  - Cluster type: mysql
  - Database version: ac-mysql-8.0.30
  - CPU (recommended): 1 Core
  - Memory (recommended): 1 G
  

![](../images/gitea-11.png)

- After deployment is successful, enter the details page to view the MySQL connection information

![](../images/gitea-12.png)

- Click "One-click Connection" to enter the MySQL terminal connection

![](../images/gitea-13.png)

- Execute

```sql
CREATE DATABASE giteadb CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_unicode_ci';
```

Create the database needed for Gitea

![](../images/gitea-14.png)

## Step 7: Access the application

- Click 「App Launchpad」 to view.When the application's STATUS changes from Pending to Running, it means the application has started successfully.

- When the STATUS is Running, you can directly access the external address.

![](../images/gitea-7.png)

- After accessing the external address, enter the configuration page and configure according to the details of the MySQL just created

![](../images/gitea-15.png)

- After configuring, click Install, wait for a while and you can enter the login page, deployment successful!

![](../images/gitea-16.png)

![](../images/gitea-17.png)

