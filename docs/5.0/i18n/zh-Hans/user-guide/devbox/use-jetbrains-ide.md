# 使用 JetBrains IDE 开发

> 本指南介绍如何使用 JetBrains IDE 中的 IntelliJ IDEA 来开发基础环境为 Java 的 Devbox。

需要提前下载好 [JetBrains Gateway](https://www.jetbrains.com/remote-development/gateway/) 应用。

1. 打开 Devbox，点击新建项目，运行环境选择 Java，其他配置默认，点击创建。

![use-jb-ide-1](./images/use-jb-ide-1.png)

2. 打开 Devbox，点击项目的详情，查看 SSH 配置（Username：devbox，Host：hzh.sealos.run，Port：47888），下载私钥到本地。

![use-jb-ide-2](./images/use-jb-ide-2.png)

3. 打开 Devbox，选择 JetBrains IDE 并点击。

![use-jb-ide-3](./images/use-jb-ide-3.png)

4. 自动唤起本地的 JetBrains Gateway，点击 `New Connection`。

![use-jb-ide-4](./images/use-jb-ide-4.png)

5. 打开 JetBrains Gateway，填写 Username、Host 和 Port，勾选 Specify private key，选择私钥的所在路径。点击 `Check Connection and Continue`，即可测试 SSH 连接。

![use-jb-ide-5](./images/use-jb-ide-5.png)

6. IDE 版本选择 `IntelliJ IDEA 2024.3.1 Preview`，项目路径选择 `/home/devbox/project`。点击 Download IDE and Connect，即可下载 IDE 和连接。

![use-jb-ide-6](./images/use-jb-ide-6.png)

需要等待 IDE 下载完毕。

![use-jb-ide-7](./images/use-jb-ide-7.png)

7. 自动唤起本地的 IntelliJ IDEA，语言选择 Chinese 简体中文，打开项目文件，点击绿箭头来运行 Java 服务。

![use-jb-ide-8](./images/use-jb-ide-8.png)

![use-jb-ide-9](./images/use-jb-ide-9.png)

8. 打开 Devbox 项目的详情，点击公网地址，即可跳转访问 Java 服务。

![use-jb-ide-10](./images/use-jb-ide-10.png)

9. 成功访问 Java 服务。

![use-jb-ide-11](./images/use-jb-ide-11.png)

