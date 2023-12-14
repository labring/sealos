---
sidebar_position: 2
---

# Tutorial on modifying database parameters with yaml

Some parameters of the database cannot take effect immediately after modification. Therefore, you need to apply yaml to modify parameters and restart the database. Modifying parameters in yaml will cause the database to restart, and the whole process will take about 20 seconds. The following uses the Postgres database as an example to modify parameters:

1. Access the terminal：

![config_1](./imgs/migration_1.png)

2. Edit pg-config.yaml：

![config_2](./imgs/migration_2.png)
```bash
$ vim pg-config.yaml
```

3. Copy yaml to pg-config.yaml and save pg-config.yaml：

![config_3](./imgs/migration_3.png)
```yaml
apiVersion: apps.kubeblocks.io/v1alpha1
kind: OpsRequest
metadata:
  name: test
spec:
  clusterRef: test-pg  #Change the database name to your own
  reconfigure:
    componentName: postgresql
    configurations: #The following configuration is for reference only. You only need to keep the part to be modified and modify the corresponding parameter values
      - keys:
          - key: postgresql.conf
            parameters:
              - key: max_connections #Sets the maximum number of simultaneous connections that can be made to the database
                value: "1000"
        name: postgresql-configuration
  ttlSecondsAfterSucceed: 0
  type: Reconfiguring
```
Common PostgreSQL Parameters:
+ max_connections - Sets the maximum number of connections that can be established with the database simultaneously.
+ max_wal_size - Sets the maximum size of WAL (Write-Ahead Logging) files.
+ min_wal_size - Sets the minimum size of WAL files.
+ wal_keep_size - Sets the size of the minimum number of WAL files that the primary server should retain.
+ max_worker_processes - Sets the maximum number of background processes that PostgreSQL can start.
+ max_parallel_workers_per_gather - Controls the maximum number of parallel worker processes that can be started in a single query operation.
+ max_parallel_workers - Sets the overall maximum number of parallel worker processes that the database can start.
+ shared_buffers - The size of memory used for data caching.
+ effective_cache_size - Informs the query optimizer about the estimated amount of memory available for caching.
+ work_mem - Sets the memory limit for query operations such as sorting and hash tables.
+ temp_buffers - The maximum amount of memory that each database session can use for temporary buffers.
+ maintenance_work_mem - The memory limit used for maintenance operations like VACUUM.
+ lock_timeout - Sets the maximum time to wait before giving up on acquiring a lock.
+ wal_level - Sets the detail level of WAL (Write-Ahead Logging), affecting replication and data recovery.
+ checkpoint_timeout - Sets the maximum time between two automatic WAL checkpoints.
+ hot_standby - Allows read operations on a standby server.
+ wal_compression - Sets whether to compress WAL logs to save space.
+ autovacuum - Enables the automatic cleaning (VACUUM) process.
+ default_statistics_target - Sets the granularity of statistics collection.
+ random_page_cost - Sets the cost of non-sequential disk access.
+ log_min_duration_statement - Sets the threshold for logging SQL statements that take longer than this value to execute.
+ autovacuum_max_workers - Sets the maximum number of workers for the automatic vacuum process.
+ autovacuum_naptime - Sets the sleep time between automatic vacuum processes.
+ checkpoint_completion_target - Sets the target time for checkpoint completion, relative to the time between two checkpoints.
+ seq_page_cost - Sets the cost of sequential disk page access.
+ archive_command - Sets the command for archiving WAL files.
+ archive_mode - Sets whether to enable WAL archiving.
  Common MySQL Parameters:
+ innodb_buffer_pool_size - Sets the size of the InnoDB buffer pool.
+ max_connections - The maximum number of concurrent connections allowed.
+ query_cache_size - The size of the query cache.
+ table_open_cache - The cache for the number of open tables.
+ thread_cache_size - The size of the thread cache.
+ wait_timeout - Timeout for non-interactive connections.
+ max_allowed_packet - The maximum packet size.
+ innodb_log_file_size - The size of the InnoDB log file.
+ innodb_flush_log_at_trx_commit - Controls when the log is flushed to disk.
+ skip-name-resolve - Disables DNS resolution.
+ character_set_server - The default character set of the server.
+ collation_server - The default collation of the server.
+ innodb_file_per_table - Each table uses an independent InnoDB file.
+ log_bin - Enables binary logging.
+ expire_logs_days - The number of days to expire binary logs.
+ slow_query_log - Switch for the slow query log.
+ slow_query_log_file - The location of the slow query log file.
+ long_query_time - The threshold for defining slow queries (in seconds).
+ server-id - The server ID, used for replication.
+ secure_file_priv - Restricts file access for LOAD DATA, SELECT ... INTO OUTFILE, and LOAD_FILE().
  Common Redis Parameters:
+ bind - The bound IP address.
+ protected-mode - Enables protected mode to prevent unauthorized access.
+ port - The listening port.
+ timeout - Connection timeout time.
+ tcp-backlog - The length of the TCP connection queue.
+ maxclients - The maximum number of client connections.
+ maxmemory - The maximum amount of memory usage.
+ maxmemory-policy - The memory eviction policy.
+ save - The configuration of time and change count for RDB persistence.
+ appendonly - Switch for AOF persistence.
+ appendfsync - The frequency of AOF file flushing.
+ dbfilename - The name of the RDB file.
+ dir - The directory for storing persistence files.
+ slaveof - Configures the address and port of the primary server.
+ masterauth - The password for the primary server.
+ requirepass - Sets the access password.
+ rename-command - Renames dangerous commands.
+ hash-max-ziplist-entries - The threshold for internal encoding transformation of the hash type.
+ list-max-ziplist-size - The threshold for internal encoding transformation of the list type.
+ set-max-intset-entries - The threshold for internal encoding transformation of the set type.
  Common MongoDB Parameters:
+ storage.dbPath - The path for storing data files.
+ storage.journal.enabled - Enables logging.
+ net.port - The server port.
+ net.bindIp - The bound IP address.
+ security.authorization - Enables authorization.
+ replication.replSetName - The name of the replica set.
+ sharding.clusterRole - Configures the role for a sharding cluster.
+ systemLog.destination - The method for logging output.
+ systemLog.path - The path of the log file.
+ systemLog.logAppend - The mode for appending log files.
+ storage.engine - The type of storage engine.
+ storage.directoryPerDB - Uses separate directories for each database.
+ net.maxIncomingConnections - The maximum number of incoming connections.
+ operationProfiling.mode - The mode for operation performance profiling.
+ operationProfiling.slowOpThresholdMs - The threshold for slow operation queries.
+ processManagement.fork - Runs the process in the background.
+ net.ssl.mode - The SSL mode.
+ net.ssl.PEMKeyFile - The SSL key file.
+ net.ssl.CAFile - The SSL CA certificate file.
+ net.wireObjectCheck - Checks the validity of network objects.

4. Apply pg-config.yaml：

![config_4](./imgs/migration_4.png)
```bash
$ kubectl apply -f pg-config.yaml
```

5. Check whether pg-config.yaml is successfully applied：
```bash
# If the status of OpsRequest is Succeed and the status of pod is Running, the application is successfully configured
$ kubectl get OpsRequest
$ kubectl get pod
```
![config_5](./imgs/migration_5.png)

6. Access the database to check whether the configuration takes effect：
```bash
$ show max_connections;
```
![config_6](./imgs/migration_6.png)
![config_7](./imgs/migration_6.png)

