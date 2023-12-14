---
sidebar_position: 2
---

# Tutorial on modifying database parameters with yaml

由于数据库的某些参数在修改后无法立即生效，因此需要通过应用yaml来实现修改参数并重启数据库通过yaml修改参数会导致数据库重启，整个过程大概会持续20s左右。这里以Postgres数据库的参数修改为例，具体操作步骤如下：
1. 进入终端：

![config_1](./imgs/migration_1.png)

2. 编辑pg-config.yaml：

![config_2](./imgs/migration_2.png)
```bash
$ vim pg-config.yaml
```

3. 复制yaml到pg-config.yaml中，保存pg-config.yaml：

![config_3](./imgs/migration_3.png)
```yaml
apiVersion: apps.kubeblocks.io/v1alpha1
kind: OpsRequest
metadata:
  name: test
spec:
  clusterRef: test-pg  #修改为自己的数据库名
  reconfigure:
    componentName: postgresql
    configurations: #以下配置仅供参考，只需保留要修改的部分即可，并修改对应的参数的值
      - keys:
          - key: postgresql.conf
            parameters:
              - key: max_connections #设置可以同时与数据库建立的最大连接数
                value: "1000"
        name: postgresql-configuration
  ttlSecondsAfterSucceed: 0
  type: Reconfiguring
```
常见的postgres参数：
+ max_connections #设置可以同时与数据库建立的最大连接数
+ max_wal_size #设置WAL文件的最大大小
+ min_wal_size #设置WAL文件的最小大小
+ wal_keep_size #设置主服务器应该保留的最小WAL文件数量的大小
+ max_worker_processes #设置PostgreSQL可以启动的最大后台进程数
+ max_parallel_workers_per_gather #控制单个查询操作中可以启动的并行工作进程的最大数量
+ max_parallel_workers #设置数据库可以启动的并行工作进程的总体最大数量
+ shared_buffers #用于数据缓存的内存大小
+ effective_cache_size #通知查询优化器可用于缓存的预估内存量
+ work_mem #设置用于查询操作（如排序和哈希表）的内存限制
+ temp_buffers #每个数据库会话可以使用的临时缓冲区的最大内存量
+ maintenance_work_mem #用于维护操作（如VACUUM）的内存限制
+ lock_timeout #设置在放弃获取锁之前等待的最长时间
+ wal_level #设置WAL（写前日志）的详细级别，影响复制和数据恢复
+ checkpoint_timeout #设置两个自动WAL检查点之间的最大时间
+ hot_standby #设置在备用服务器上允许读操作
+ wal_compression #设置是否压缩WAL日志以节省空间
+ autovacuum #设置自动清理（VACUUM）进程
+ default_statistics_target #设置统计信息的采集粒度
+ random_page_cost #设置非顺序磁盘访问的成本
+ log_min_duration_statement #设置记录执行时间超过该阈值的SQL语句
+ autovacuum_max_workers #设置自动清理进程的最大工作数
+ autovacuum_naptime #设置自动清理进程间的休眠时间
+ checkpoint_completion_target #设置检查点完成的目标时间，相对于两个检查点之间的时间
+ seq_page_cost #设置顺序磁盘页面访问的成本
+ archive_command #设置WAL文件的归档命令
+ archive_mode #设置是否启用WAL归档
  常见的mysql参数：
+ innodb_buffer_pool_size: 设置InnoDB缓冲池的大小
+ max_connections: 允许的最大并发连接数
+ query_cache_size: 查询缓存的大小
+ table_open_cache: 打开表的数量的缓存
+ thread_cache_size: 线程缓存的大小
+ wait_timeout: 非交互连接的超时时间
+ max_allowed_packet: 最大数据包大小
+ innodb_log_file_size: InnoDB日志文件的大小
+ innodb_flush_log_at_trx_commit: 控制日志刷新到磁盘的时机
+ skip-name-resolve: 禁用DNS解析
+ character_set_server: 服务器的默认字符集
+ collation_server: 服务器的默认校对规则
+ innodb_file_per_table: 每个表使用独立的InnoDB文件
+ log_bin: 启用二进制日志
+ expire_logs_days: 二进制日志的过期天数
+ slow_query_log: 慢查询日志的开关
+ slow_query_log_file: 慢查询日志文件的位置
+ long_query_time: 定义慢查询的阈值（秒）
+ server-id: 服务器ID，用于复制
+ secure_file_priv: 限制LOAD DATA、SELECT ... INTO OUTFILE和LOAD_FILE()的文件访问
  常见的redis参数：
+ bind: 绑定的IP地址
+ protected-mode: 开启保护模式，防止非法访问
+ port: 监听端口
+ timeout: 连接超时时间
+ tcp-backlog: TCP连接队列的长度
+ maxclients: 最大客户端连接数
+ maxmemory: 最大内存使用量
+ maxmemory-policy: 内存淘汰策略
+ save: RDB持久化的时间和更改次数配置
+ appendonly: AOF持久化开关
+ appendfsync: AOF文件刷新频率
+ dbfilename: RDB文件名称
+ dir: 持久化文件存储目录
+ slaveof: 配置主服务器地址和端口
+ masterauth: 主服务器密码
+ requirepass: 设置访问密码
+ rename-command: 重命名危险命令
+ hash-max-ziplist-entries: 哈希类型内部编码转换的阈值
+ list-max-ziplist-size: 列表类型内部编码转换的阈值
+ set-max-intset-entries: 集合类型内部编码转换的阈值
  常见的mongo参数：
+ storage.dbPath: 数据文件存放路径
+ storage.journal.enabled: 启用日志
+ net.port: 服务器端口
+ net.bindIp: 绑定的IP地址
+ security.authorization: 启用权限验证
+ replication.replSetName: 复制集名称
+ sharding.clusterRole: 配置为分片集群的角色
+ systemLog.destination: 日志输出方式
+ systemLog.path: 日志文件路径
+ systemLog.logAppend: 日志文件追加模式
+ storage.engine: 存储引擎类型
+ storage.directoryPerDB: 每个数据库使用独立目录
+ net.maxIncomingConnections: 最大入站连接数
+ operationProfiling.mode: 操作性能分析模式
+ operationProfiling.slowOpThresholdMs: 操作慢查询阈值
+ processManagement.fork: 后台运行进程
+ net.ssl.mode: SSL模式
+ net.ssl.PEMKeyFile: SSL密钥文件
+ net.ssl.CAFile: SSL CA证书文件
+ net.wireObjectCheck: 检查网络对象的有效性

4. 应用pg-config.yaml：

![config_4](./imgs/migration_4.png)
```bash
$ kubectl apply -f pg-config.yaml
```

5. 检查pg-config.yaml是否应用成功：
```bash
# OpsRequest中对应的状态为Succeed且pod对应的状态为Running则说明配置应用成功
$ kubectl get OpsRequest
$ kubectl get pod
```
![config_5](./imgs/migration_5.png)

6. 进入数据库查看配置是否生效：
```bash
$ show max_connections;
```
![config_6](./imgs/migration_6.png)
![config_7](./imgs/migration_6.png)

