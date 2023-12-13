---
sidebar_position: 2
---

# Database

** Database ** is the core component of an application, Sealos provides a database cluster deployment management tool, can help you quickly deploy database clusters. It supports MySQL, PostgreSQL, MongoDB, Redis, Kafka, and more. Currently the ** database ** supports the following features.

+ Elastic expansion
+ Support multi-version and multi-type databases
+ Database connection: one-click connection, external network access
+ Database connection: manual backup, automatic backup
+ Database monitoring: resource, status, and performance monitoring
+ Database migration: public network migration and file migration
+ Database high availability: Supports multiple database instances
+ Visual database management: Create, delete, update, pause, restart the database


## Quick start

Take deploying a PostgreSQL database as an example to experience the convenience of a database.

Deployment and access in just 6 steps:

1. Enter the Database application from the [Sealos](https://cloud.sealos.io) desktop：

![start_1](./imgs/start_1.png)

2. Click on the creation of a new cluster.：

![start_2](./imgs/start_2.png)

3. Select the corresponding database and parameters：

![start_3](./imgs/start_3.png)

4. Click on deployment：

![start_4](./imgs/start_4.png)

5. Enter DB to view details：

![start_5](./imgs/start_5.png)

6. Database details：

![start_6](./imgs/start_6.png)

![start_7](./imgs/start_7.png)

![start_8](./imgs/start_8.png)

![start_9](./imgs/start_9.png)

![start_10](./imgs/start_10.png)

![start_11](./imgs/start_11.png)

![start_12](./imgs/start_12.png)


## Database connection

### One-click connection

1. Enter ** database **, click Connect:

![connect_1](./imgs/connect_1.png)

2. Manipulate the database at the terminal：

![connect_2](./imgs/connect_2.png)


### Extranet access

1. Enter ** database **, click Connect：

![connect_3](./imgs/connect_3.png)

2. Confirm open ** database **：

![connect_4](./imgs/connect_4.png)

3. Copy the database connection information：

![connect_5](./imgs/connect_5.png)

4. Connect to the database in the Database Connection tool：

![connect_6](./imgs/connect_6.png)

![connect_7](./imgs/connect_7.png)


## Database backup

### Manual backup
1. Enter the database backup page, click Backup：

![backup_1](./imgs/backup_1.png)

2. Enter the backup information to start the backup：

![backup_2](./imgs/backup_2.png)

3. Check Backup status：

![backup_3](./imgs/backup_3.png)

![backup_4](./imgs/backup_4.png)


### Automatic backup
1. Enter the database backup page, click Backup：

![backup_5](./imgs/backup_5.png)

2. Enable automatic backup and enter backup information：

![backup_6](./imgs/backup_6.png)


## Database migration

This section uses the MySQL database as an example to describe how to migrate a database.

### Public network migration

Public network migration involves two databases: the source database and the target database. The source database is the data source for migration, and the target database is the data destination for migration. The following introduction demonstrates the local database as the source database.

1. Enter the target database and connect to the target database：

![migration_1](./imgs/migration_1.png)

2. Create the corresponding database in the terminal interface (skip this step if the corresponding database already exists)：

![migration_2](./imgs/migration_2.png)
```bash
# Example of creating a database sql statement：
$ create database testmysql;
```

3. Enter the public network migration page of the target database, click the Migrate button：

![migration_3](./imgs/migration_3.png)

4. View migration configuration information：

![migration_4](./imgs/migration_4.png)

Copy the migration configuration information as follows：
```bash
# Example of an sql statement for setting configuration information：
$ set global binlog_format=ROW;
$ set binlog_row_image ='FULL';
```

5. Set the configuration information in the source database (MySQL and Postgres require manual configuration information, Mongo does not require configuration)：
```bash
# xample of an sql statement for setting configuration information：
$ set global binlog_format=ROW;
$ set binlog_row_image ='FULL';
```
![migration_5](./imgs/migration_5.png)

6. Enter the target database, fill in the migration information of the source database, which tables to migrate, and fill in which database in the target database to migrate：

![migration_6](./imgs/migration_6.png)

If you need to continuously migrate data from the source database, enable continuous migration in the advanced configuration as follows：

![migration_7](./imgs/migration_7.png)

7. View migration task information：

![migration_8](./imgs/migration_8.png)

8. Enter the target database, connect to the target database, and check whether the migration data is complete：

![migration_9](./imgs/migration_9.png)

### File migration

1. Enter the target database and connect to the target database：

![migration_10](./imgs/migration_10.png)

2. Create the corresponding database in the terminal interface (skip this step if the corresponding database already exists)：
```bash
# Example of creating a database sql statement：
$ create database testmysql;
```
![migration_11](./imgs/migration_11.png)

3. Upload the migration file, enter the database name, and start the migration：

![migration_12](./imgs/migration_12.png)

4. File migrating, Wait for the migration result：

![migration_13](./imgs/migration_13.png)

![migration_14](./imgs/migration_14.png)

5. Connect to the database to check whether the migrated data is complete：

![migration_15](./imgs/migration_15.png)