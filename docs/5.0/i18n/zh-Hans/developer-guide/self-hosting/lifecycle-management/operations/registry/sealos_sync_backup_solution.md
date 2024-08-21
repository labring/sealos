---
sidebar_position: 1
---

# 高效的Sealos集群镜像同步和备份策略

在我们的日常工作中，可能会遇到一些常见的需求和问题，如：

1. 需要定时备份集群里的镜像仓库，但不想全量同步。
2. 需要使用外部镜像仓库，但还没有sealos集群镜像里的容器镜像。
3. 容器镜像较大，希望避免在sealos运行时传输镜像文件，以减少带宽占用。

为了解决以上问题，sealos提供了一种优雅的解决方案。下面，我将一步步带你了解这个方案。

## 创建和启动临时仓库

首先，我们需要集群镜像里的registry目录来进行镜像同步。因此，执行以下命令来拉取集群镜像并生成一个工作目录：

```shell
sealos pull labring/kubernetes:v1.24.0 
sealos create labring/kubernetes:v1.24.0
```

随后，我们在工作目录的registry目录启动一个临时registry。为了方便操作，我们可以固定一个端口，例如9090。然后，执行以下命令：

```shell
sealos registry serve filesystem -p 9090 registry
```

注意，这是一个常驻进程，同步完成前请确保服务可用。

## 同步镜像

下一步，我们将本地的集群镜像同步到集群里的sealos.hub:5000（或其他仓库）。在执行同步命令前，如果仓库需要认证，请先使用sealos login进行登录。然后，执行以下命令：

```shell
sealos registry sync 127.0.0.1:9090 sealos.hub:5000
```

## 结果展示

在执行了上述步骤后，你将看到类似以下的输出：

```tex
Getting image source signatures
Copying blob d92bdee79785 skipped: already exists
Copying blob 88efb86cbcab skipped: already exists
Copying config edaa71f2ae done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob 8dc21145ed67 skipped: already exists
Copying blob 4cae93f7d292 skipped: already exists
Copying blob 65cd6b3674e6 skipped: already exists
Copying blob b0b160e41cf3 skipped: already exists
Copying blob 9e2e80d6f31a skipped: already exists
Copying config a9a710bb96 done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob e2227eec2e9e skipped: already exists
Copying blob 9dd6bd026ac4 skipped: already exists
Copying blob b0b160e41cf3 skipped: already exists
Copying config b62a103951 done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob b100dd428c40 skipped: already exists
Copying blob b0b160e41cf3 skipped: already exists
Copying blob 9dd6bd026ac4 skipped: already exists
Copying config 59fad34d4f done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob d26839182af9 skipped: already exists
Copying blob 812e11da6772 skipped: already exists
Copying blob d5c2703e56e5 skipped: already exists
Copying config 66e1443684 done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob cd1468482c69 skipped: already exists
Copying blob 9dd6bd026ac4 skipped: already exists
Copying blob b0b160e41cf3 skipped: already exists
Copying config b81513b3bf done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob 9b18e9b68314 skipped: already exists
Copying blob 25f2d353fdd8 skipped: already exists
Copying blob 23a7cdce4c6c skipped: already exists
Copying config 2b25f03fc8 done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob aff472d3f83e skipped: already exists
Copying config e5a475a038 done
Writing manifest to image destination
Storing signatures
Sync completed
```

可以看到，已经存在的镜像不会重复同步，这样可以实现增量镜像同步，使整个流程变得非常优雅和高效。

---

以上就是我们这次的解决方案，希望对你有所帮助。
