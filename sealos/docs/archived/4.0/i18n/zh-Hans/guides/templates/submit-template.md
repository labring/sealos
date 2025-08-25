---
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

import wechat from './images/wechat-qr-code.jpg';

# 提交模板

:::tip

提交模板是可以拿奖金💰的！奖励规则如下：

| 类型                                                         | 奖金 |
| ------------------------------------------------------------ | ---- |
| 提交模板到 Sealos 模板市场                                   | 50¥  |
| 同时将模板的一键部署 PR 提交到模板应用的官方文档或者 README 中 | 150¥ |

:::

## 模板提交流程

Sealos 模板市场的所有模板都是实时从 [Sealos 模板仓库](https://github.com/labring-actions/templates) 同步过来的。如果您想要为这个仓库贡献新的模板，可以通过提交 PR（Pull Request）的方式来实现。

要创建一个新模板，您可以参考这里的 [template.yaml](https://github.com/labring-actions/templates/blob/main/template.yaml) 文件。系统已经内置了许多通用的环境变量和函数，这些都可以在编写模板时使用。这些内置的功能允许您使用类似于 `GitHub Actions` 的语法来编写模板，例如，您可以使用 `${{ SEALOS_NAMESPACE }}` 这样的环境变量来设置模板参数。关于这些内置环境变量的具体信息，可以参阅[模板说明文档](https://github.com/labring-actions/templates/blob/main/example_zh.md)。

## 领取奖金

首先填写并提交以下表单：

<iframe src="https://fael3z0zfze.feishu.cn/share/base/form/shrcnl6BLJUyRaASA0B1DNLKh3d" width="100%" height="800px" frameborder="0" allowfullscreen></iframe>

然后扫码添加 Sealos 小助理微信领取奖金：

<img src={wechat} style={{width: 400}} />