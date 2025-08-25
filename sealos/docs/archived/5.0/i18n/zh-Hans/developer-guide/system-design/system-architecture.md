---
keywords: [Sealos, Kubernetes云操作系统, 应用架构, 前后端分离, Kubernetes API]
description: Sealos 是基于 Kubernetes 的云操作系统，采用前后端分离架构，简化用户操作，提供专业高效的工具，满足不同需求。
---

# 系统架构

## 设计哲学

Sealos 的目的是打造基于 Kubernetes 的云操作系统，在系统与普通用户的交互过程中尽可能多的向用户屏蔽掉 Kubernetes
的复杂性，使这部分功能尽可能的简单。同时对于具有专业知识的云计算领域人员，Sealos 又期望提供专业高效的工具使其完成工作。

基于这个目标，Sealos 提出了**"一切皆应用"**
的设计理念。把每个功能抽象成一个个独立又可以相互配合的应用，不同需求和目的的人员操作不同的应用完成不同的功能。尽可能的与用户在使用单机操作系统时的体验保持一致。

## 整体架构

Sealos 整体架构图如下：

![Architecture](./images/architecture_light.png#gh-light-mode-only)

![Architecture](./images/architecture_dark.png#gh-dark-mode-only)

因此我们可以说，**Sealos = Kubernets + 一系列应用**

## 应用架构

Sealos 上的应用采用前后端分离的架构，同时前端能够提供 `SSR` 能力，使得应用也可以单独对外提供服务，而不需要绑定在 Sealos 单

体上。

应用架构以及交互情况：（以App Launchpad 与 Terminal 应用与其交互为例子）

![Application](./images/application_light.png#gh-light-mode-only)![Application](./images/application_dark.png#gh-dark-mode-only)

每个应用都的前端系统会调用诸多不同的接口，调用 Kubernetes 原生 API 以实现一些简单的逻辑，调用 Kubernetes CRD API
实现复杂的逻辑，调用多种不同的数据库 API 持久化和获取数据，还会调用一些部署在集群内的特殊应用提供的 API 实现一些特殊的逻辑。

因此我们可以说，**Sealos = Kubernets + 一系列应用 = 一系列的 "前端系统 + Kubernetes API + Kubernetes CRD API + Database
API+ Service API"**。
