## Sealos skills 设计说明

通过安装 Sealos skills 用户可以在 claude code, codex, 或者其他支持 skills 的 Agent 中方便的把用户的 Docker 镜像，或者源代码部署到 Sealos 上。

## 安装

Sealos skills 依赖 sealos cli 和 kubectl cli.

## 认证

用户需要通过 skills 部署到自己的 Sealos 账户上, 所以必须有一个认证过程。认证结束后会将 kubeconfig 下载到用户的 ～/.kube/os.sealos.io/usw-1/workspace/config 中。

在用户触发 Sealos skills 时，如果还没有认证信息，给用户交互展示认证方式：

1. 通过网页登录认证，点击认证链接 https://os.sealos.io/skills/login?access-key=xxxxxxxx
2. 通过设备码登录，打开 Sealos 首页 https://os.sealos.io，点击右侧头像，复制 access-key
3. 配置文件，打开 ～/.sealos/skills/config 写入 access-key 的值，或 设置环境变量 SEALOS_ACCESS_KEY=xxx (这种情况是为了应对一些没有交互的情况，比如有些 Agent 是在后台运行的)

以上两种底层原理是一样的，只是用户交互上有区别。

网页登录实现流程：
1. 生成一个设备码，写入本地电脑，生成一个认证链接, skills 每 5秒带着设备 key 去请求获取 kubeconfig
2. 当用户完成登录, access-key 被激活
3. access-key 被激活，顺利拿到 kubeconfig 写入本地

通过设备登录：
1. 因为已经创建好了 access-key, 所以直接可以通过 access-key 交换 kubeconfig

为什么要交换 kubeconfig? 因为 Sealos 中绝大多数核心能力是兼容标准的 kubernetes 标准的，AI 对 kubernetes 有深入的理解，在很多能力上我们不用重复去建设 Sealos 的 API, CRD 就是 API，skills 实现时
只需要给模型一些参考的 Demo 即可，非常的标准化。

## Skills 能力

* Applanchpad 的部署能力，自动生成 ingress service deployment sts 这些资源的 CRD 并 apply
* Database 所有能力集，创建各种数据库，并获取数据库的链接信息
* Docker 镜像的构建和推送到 docker hub
