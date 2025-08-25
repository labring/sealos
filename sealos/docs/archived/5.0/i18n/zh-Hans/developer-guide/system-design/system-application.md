---
keywords: [Sealos系统应用, Kubernetes API, CRD API, 应用管理, 费用中心, 定时任务, 数据库, KubePanel, 对象存储, 应用商店]
description: 了解Sealos系统应用的基本原理与实现，包括Kubernetes API、CRD API、应用管理、费用中心、定时任务、数据库、KubePanel等。
---

# 系统应用

主要介绍 Sealos 当前各个系统应用的基本原理与实现。

## 系统桌面

组成：前端系统+Kubernetes API+Kubernetes CRD API+数据库API+其他API

整个系统的入口，处理主界面上用户数据的展示与相关交互逻辑。

部署在桌面上的每个应用都单独存在并前后端分离部署。

## 应用管理

组成：前端系统+Kubernetes API

用于管理用户自定义的应用，本质上是把用户在 GUI 上的命令映射成yml文件（主要是deployment，service等文件），交给Kubernetes执行。

## 费用中心

组成：前端系统 + Kubernetes CRD API

前端页面为用户展示各种收费标准，调用 CRD API,CRD controller再调用后端一个单独的程序提供数据库查询接口，返回用户账单信息。

## 定时任务

组成：前端系统+Kubernetes API

用户管理 Kubernetes 原生 CronJob 资源，逻辑与应用管理基本相同。

## 数据库

组成：前端系统+数据库 API+Kubernetes CRD API（Kube Blocks）

数据库底层使用开源项目 Kube Blocks 实现，其使用了一系列的CRD来帮助用户完成数据库部署的过程。前端需要跟这些CRD的API交互。

用户系统的维护则在小强数据库中，使用API提供服务。

## KubePanel

组成：前端系统+Kubernetes API

用户对特定 Namespace 下的各项资源进行管理，直接调用 Kubernetes 提供的api即可完成。

## 对象存储

组成：前端系统+Kubernetes CRD API

底层使用 minio，并使用两个crd维护关系，objectstorageuser_controller 用于维护存储账户与命名空间的关系，并处理限流等逻辑。

objectstoragebucket_controller 维护存储桶和存储账户之间的关系。

## 云开发

一个单独的应用链接，点击直接跳转到云开发应用。

## 文档中心

一个单独的应用链接，点击直接跳转到官方文档。

## 应用商店

组成：前端系统

应用的名称，种类等信息维护在 Github 的一个仓库中，前端直接拉取仓库中的数据并展示。

## 终端

组成：前端系统+Kubernetes CRD API

具体实现可以概括为前端应用调用 API,然后 controller创建一套新的 pod/deployment/ingress等资源，并建立一个
websocket返回给前端，后续使用这个 websocket进行通信。

## 工单

组成：前端系统+数据库API

单独维护自己的用户系统，用户信息存储在单独的 Mongodb中，用户上传的文件存储到 minio中。

## fastgpt

一个单独的应用链接，点击直接跳转到fastgpt应用。

## 邀请链接

组成：前端系统

展示邀请情况

## 私有云

一个单独的链接，点击直接跳转到一个问卷调查。
