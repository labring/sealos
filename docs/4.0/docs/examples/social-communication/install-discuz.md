# Quick install discuz

[discuz](https://gitee.com/Discuz/DiscuzX) is an open source BBS program that provides a rich features and plug-ins, is widely used in various websites and communities.

## First enter the Sealos and open the "application management"

## Create an new application

![](../images/tailchat/2.png)

### install discuz

`discuz` Have a special image file and installation is very simple.

Now we will deploy ` discuz `.

`discuz` The required configuration is as follows.

- Using a mirror:`tencentci/discuz`
- Exposed container port:`80`

The result is as follows:

![config](../images/discuz/config.png)

Wait patiently for a period of time after can see ` discuz ` service has been started up

![config](../images/discuz/running.png)

![start1](../images/discuz/start1.png)

![start2](../images/discuz/start2.png)

Click agree, the next step

## Install discuz Mysql database

`Mysql` The required configuration is as follows.

- App name:`discuz-db`
- Image name:: `mysql:5.7`
- Container Ports:`3306`
- Environment:

```env
MYSQL_ROOT_PASSWORD=123456
```

The result is as follows:

![mysql](../images/discuz/mysql.png)

The database server address directly fill in the database container name just installed:

## Initialize the discuz

Back to the discuz application, click outside the web address into the discuz initialize the page

![mysql](../images/discuz/url.png)

![[start2](../images/discuz/start2.png)

![[start33](../images/discuz/start3.png)

- The database server address: ` discuz - db ` (here you can directly fill in the database name)

- Database password:`123456`

Other configuration items according to the need to modify.
