export const LAUNCHPAD_QUERIES = {
  cpu: 'round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~"$namespace",pod=~"$pod.*"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~"$namespace",pod=~"$pod.*"}) by (pod) * 100,0.01)',
  memory:
    'round(sum(container_memory_working_set_bytes{job="kubelet", metrics_path="/metrics/cadvisor",namespace=~"$namespace",pod=~"$pod.*"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~"$namespace",pod=~"$pod.*"}) by (pod)* 100, 0.01)',
  average_cpu:
    'avg(round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~"$namespace",pod=~"$pod.*"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~"$namespace",pod=~"$pod.*"}) by (pod) * 100,0.01))',
  average_memory:
    'avg(round(sum(container_memory_working_set_bytes{job="kubelet", metrics_path="/metrics/cadvisor",namespace=~"$namespace",pod=~"$pod.*",container!=""}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~"$namespace",pod=~"$pod.*"}) by (pod) * 100, 0.01))',
  storage:
    'round((max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~"$namespace", persistentvolumeclaim=~"@persistentvolumeclaim"})) / (max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~"$namespace", persistentvolumeclaim=~"@persistentvolumeclaim"})) * 100, 0.01)'
} as const;

export const MYSQL_QUERIES = {
  cpu: 'round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~"#",pod=~"@-mysql-\\\\d"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~"#",pod=~"@-mysql-\\\\d"}) by (pod)*100,0.01)',
  memory:
    'round(sum(container_memory_working_set_bytes{job="kubelet", metrics_path="/metrics/cadvisor",namespace=~"#",container!="", image!="",pod=~"@-mysql-\\\\d"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~"#", pod=~"@-mysql-\\\\d"}) by (pod) * 100, 0.01)',
  disk_capacity:
    '(max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-mysql-\\\\d"}))',
  disk_used:
    '(max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-mysql-\\\\d"}))',
  disk: 'round((max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-mysql-\\\\d"})) / (max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-mysql-\\\\d"})) * 100, 0.01)',
  uptime:
    'sum(mysql_global_status_uptime{namespace=~"#", app_kubernetes_io_instance=~"@"}) by (namespace,app_kubernetes_io_instance,pod)',
  connections:
    'sum(max_over_time(mysql_global_status_threads_connected{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])) by (namespace,app_kubernetes_io_instance,pod)',
  commands:
    'topk(5, rate(mysql_global_status_commands_total{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m]) > 0)',
  innodb:
    'sum(mysql_global_variables_innodb_buffer_pool_size{namespace=~"#", app_kubernetes_io_instance=~"@"}) by (namespace,app_kubernetes_io_instance,pod)',
  slow_queries:
    'sum(rate(mysql_global_status_slow_queries{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])) by (namespace,app_kubernetes_io_instance,pod)',
  aborted_connections:
    'sum(rate(mysql_global_status_aborted_connects{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])) by (namespace,app_kubernetes_io_instance,pod)',
  table_locks:
    'sum(rate(mysql_global_status_table_locks_immediate{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])) by (namespace,app_kubernetes_io_instance,pod)'
} as const;

export const POSTGRESQL_QUERIES = {
  cpu: 'round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~"#",pod=~"@-postgresql-\\\\d"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~"#",pod=~"@-postgresql-\\\\d"}) by (pod)*100,0.01)',
  memory:
    'round(sum(container_memory_working_set_bytes{job="kubelet", metrics_path="/metrics/cadvisor",namespace=~"#",container!="", image!="",pod=~"@-postgresql-\\\\d"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~"#", pod=~"@-postgresql-\\\\d"}) by (pod) * 100, 0.01)',
  disk: 'round((max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-postgresql-\\\\d"})) / (max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-postgresql-\\\\d"})) * 100, 0.01)',
  disk_capacity:
    '(max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-postgresql-\\\\d"}))',
  disk_used:
    '(max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-postgresql-\\\\d"}))',
  uptime:
    'avg (time() - pg_postmaster_start_time_seconds{namespace=~"#", app_kubernetes_io_instance=~"@"}) by(namespace, app_kubernetes_io_instance, pod)',
  connections: 'sum(pg_stat_database_numbackends{namespace=~"#", app_kubernetes_io_instance=~"@"})',
  commands:
    'sum by (command,app_kubernetes_io_instance)(label_replace(rate(pg_stat_database_tup_deleted{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m]),"command","delete","namespace","(.*)")) or sum by (command,app_kubernetes_io_instance)(label_replace(rate(pg_stat_database_tup_inserted{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m]),"command","insert","namespace","(.*)")) or sum by (command,app_kubernetes_io_instance)(label_replace(rate(pg_stat_database_tup_fetched{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m]),"command","fetch","namespace","(.*)")) or sum by (command,app_kubernetes_io_instance)(label_replace(rate(pg_stat_database_tup_returned{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m]),"command","return","namespace","(.*)")) or sum by (command,app_kubernetes_io_instance)(label_replace(rate(pg_stat_database_tup_updated{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m]),"command","update","namespace","(.*)"))',
  db_size: 'pg_database_size_bytes{namespace=~"#", app_kubernetes_io_instance=~"@"}',
  active_connections:
    'pg_stat_activity_count{namespace=~"#", app_kubernetes_io_instance=~"@",state="active"}',
  rollbacks:
    'rate (pg_stat_database_xact_rollback_total{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])',
  commits:
    'rate (pg_stat_database_xact_commit_total{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])',
  tx_duration:
    'max without(state) (max_over_time(pg_stat_activity_max_tx_duration{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m]))',
  block_read_time:
    'rate(pg_stat_database_blk_read_time_total{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])',
  block_write_time:
    'rate(pg_stat_database_blk_write_time_total{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])'
} as const;

export const MONGODB_QUERIES = {
  cpu: 'round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~"#",pod=~"@-mongodb-\\\\d"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~"#",pod=~"@-mongodb-\\\\d"}) by (pod)*100,0.01)',
  memory:
    'round(sum(container_memory_working_set_bytes{job="kubelet", metrics_path="/metrics/cadvisor",namespace=~"#",container!="", image!="",pod=~"@-mongodb-\\\\d"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~"#", pod=~"@-mongodb-\\\\d"}) by (pod) * 100, 0.01)',
  disk_capacity:
    '(max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-mongodb-\\\\d"}))',
  disk: 'round((max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-mongodb-\\\\d"})) / (max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-mongodb-\\\\d"})) * 100, 0.01)',
  disk_used:
    '(max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-mongodb-\\\\d"}))',
  uptime:
    'sum by(namespace, app_kubernetes_io_instance, pod) (mongodb_instance_uptime_seconds{namespace=~"#", app_kubernetes_io_instance=~"@"})',
  connections:
    'mongodb_connections{namespace=~"#", app_kubernetes_io_instance=~"@", state=~"current"}',
  commands:
    'label_replace(rate(mongodb_op_counters_total{namespace=~"#", app_kubernetes_io_instance=~"@", type!="command"}[1m])  or irate(mongodb_op_counters_total{namespace=~"#", app_kubernetes_io_instance=~"@", type!="command"}[1m]), "command", "$1", "type", "(.*)")',
  db_size: 'mongodb_dbstats_dataSize{namespace=~"#", app_kubernetes_io_instance=~"@"}',
  document_ops:
    'rate(mongodb_mongod_metrics_document_total{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])',
  pg_faults:
    'rate(mongodb_extra_info_page_faults_total{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m]) or irate(mongodb_extra_info_page_faults_total{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])'
} as const;

export const REDIS_QUERIES = {
  cpu: 'round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~"#",pod=~"@-redis-\\\\d"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~"#",pod=~"@-redis-\\\\d"}) by (pod)*100,0.01)',
  memory:
    'round(sum(container_memory_working_set_bytes{job="kubelet", metrics_path="/metrics/cadvisor",namespace=~"#",container!="", image!="",pod=~"@-redis-\\\\d"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~"#", pod=~"@-redis-\\\\d"}) by (pod) * 100, 0.01)',
  disk_capacity:
    '(max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-redis-\\\\d"}))',
  disk: 'round((max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-redis-\\\\d"})) / (max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-redis-\\\\d"})) * 100, 0.01)',
  disk_used:
    '(max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-redis-\\\\d"}))',
  uptime: 'redis_uptime_in_seconds{namespace=~"#", app_kubernetes_io_instance=~"@"}',
  connections: 'sum(redis_connected_clients{namespace=~"#", app_kubernetes_io_instance=~"@"})',
  commands:
    'label_replace(sum(irate(redis_commands_total{namespace=~"#", app_kubernetes_io_instance=~"@"} [1m])) by (cmd, namespace, app_kubernetes_io_instance), "command", "$1", "cmd", "(.*)")',
  db_items: 'sum (redis_db_keys{namespace=~"#", app_kubernetes_io_instance=~"@"}) by (db)',
  hits_ratio:
    'avg(rate(redis_keyspace_hits_total{namespace=~"#",app_kubernetes_io_instance="@"}[1m]) / clamp_min((irate(redis_keyspace_misses_total{namespace=~"#",app_kubernetes_io_instance=~"@"}[1m]) + irate(redis_keyspace_hits_total{namespace=~"#",app_kubernetes_io_instance="@"}[1m])), 0.01)) by (pod, app_kubernetes_io_instance)',
  commands_duration:
    'avg(rate(redis_commands_duration_seconds_total{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])) by (cmd) / avg(irate(redis_commands_total{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])) by (cmd)',
  blocked_connections:
    'sum(redis_blocked_clients{namespace=~"#", app_kubernetes_io_instance=~"@"})',
  key_evictions:
    'irate(redis_evicted_keys_total{namespace=~"#", app_kubernetes_io_instance=~"@"}[1m])'
} as const;

export const KAFKA_QUERIES = {
  cpu: 'round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~"#",pod=~"@-kafka-.*"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~"#",pod=~"@-kafka-.*"}) by (pod)*100,0.01)',
  memory:
    'round(sum(container_memory_working_set_bytes{job="kubelet", metrics_path="/metrics/cadvisor",namespace=~"#",container!="", image!="",pod=~"@-kafka-.*"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~"#", pod=~"@-kafka-.*"}) by (pod) * 100, 0.01)',
  disk_capacity:
    '(max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-(kafka-broker|kafka-server)-\\\\d"}))',
  disk: 'round((max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-(kafka-broker|kafka-server)-\\\\d"})) / (max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-(kafka-broker|kafka-server)-\\\\d"})) * 100, 0.01)',
  disk_used:
    '(max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~"#", persistentvolumeclaim=~"data-@-(kafka-broker|kafka-server)-\\\\d"}))'
} as const;

export const MILVUS_QUERIES = {
  cpu: 'round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~"#",pod=~"@-milvus-.*"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~"#",pod=~"@-milvus-.*"}) by (pod)*100,0.01)',
  memory:
    'round(sum(container_memory_working_set_bytes{job="kubelet", metrics_path="/metrics/cadvisor",namespace=~"#",container!="", image!="",pod=~"@-milvus-.*"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~"#", pod=~"@-milvus-.*"}) by (pod) * 100, 0.01)'
} as const;

export const MINIO_QUERIES = {
  minio_bucket_usage_object_total: 'minio_bucket_usage_object_total{bucket="@", instance="#"}',
  minio_bucket_usage_total_bytes: 'minio_bucket_usage_total_bytes{bucket="@", instance="#"}',
  minio_bucket_traffic_received_bytes:
    'sum(minio_bucket_traffic_received_bytes{bucket="@", instance="#"}) by (bucket, instance, job, namespace)',
  minio_bucket_traffic_sent_bytes:
    'sum(minio_bucket_traffic_sent_bytes{bucket="@", instance="#"}) by (bucket, instance, job, namespace)'
} as const;

export const DATABASE_QUERY_MAP = {
  'apecloud-mysql': MYSQL_QUERIES,
  postgresql: POSTGRESQL_QUERIES,
  mongodb: MONGODB_QUERIES,
  redis: REDIS_QUERIES,
  kafka: KAFKA_QUERIES,
  milvus: MILVUS_QUERIES
} as const;
