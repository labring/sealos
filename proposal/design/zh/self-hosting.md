# Sealos 模块按需加载设计文档

目前 Sealos 中的应用比较多，全部安装比较复杂且重，而且很多用户可能只需要其中部分 Application.

## kubernetes 的安装

```
sealos run kubernetes:v1.23.0 -p xxx -m ... -n ...
```
Sealos 在安装 kubernetes 方面已经做的极优雅了.

驱动的安装：
```
sealos run openebs:[version] -c config.yaml
```

## 安装空 Desktop

```
sealos run sealos-desktop:latest -c config.yaml
```
sealos-desktop 集群镜像中包含了桌面依赖的数据库，桌面 UI，监控系统等基础能力

配置文件：
<img width="1446" height="1044" alt="image" src="https://github.com/user-attachments/assets/c70508c5-8abf-47fb-9b69-552eb4f4a910" />

config.yaml
```
features:
  payments:
    credit_card: true
    wechat_alipay: true
    subscription:
      enabled: true
      private_cloud_supported: true
      deduction_method: balance  # balance | card, balance deduction for private cloud
  invoices:
    china_invoice: true
    proforma_invoice: true
  authentication:
    real_name_verification: true
    login_methods:
      wechat: true
      phone_number: true
      google: true
      github: true
      email: true
      username: true # use username/passwd
  compliance:
    domain_filing: true   # ICP domain filing
```

## Applications 安装

```
sealos run devbox:latest -c config.yaml
sealos run applaunchpad:latest -c config.yaml
sealos run database:latest -c config.yaml
sealos run terminal:latest -c config.yaml
sealos run fulling:latest -c config.yaml
sealos run appstore:latest -c config.yaml
...
```
通过这种方式实现应用的动态加载
