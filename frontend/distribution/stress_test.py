
import sqlite3

DATABASE = 'app.db'

def init_db():
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        # 创建表的SQL语句
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS results (
            id STRING PRIMARY KEY,
            test_type TEXT NOT NULL,
            namespace TEXT NOT NULL,
            appname TEXT NOT NULL,
            port INTEGER NOT NULL,
            core_interface TEXT NOT NULL,
            test_data TEXT NOT NULL,
            qps INTEGER NOT NULL,
            max_latency INTEGER NOT NULL,
            suggested_resources TEXT,
            max_usage_resources TEXT,
            average_latency INTEGER,
            status TEXT NOT NULL
        )
        ''')
        conn.commit()
        conn.close()
    except Exception as e:
        print('Error: ', e)
        return 'Error: ' + str(e)

# 压测ID: string
# 压测类型: string
# 命名空间: string
# 应用列表: [appname]
# 端口: int
# 核心接口: string
# 测试数据: string
# 期望的QPS: int
# 最大时延(ms): int
def stress_test(id, test_type, namespace, appnames, port, core_interface, test_data, qps, max_latency):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    # 插入数据
    cursor.execute('''
    INSERT INTO results (id, test_type, namespace, appname, port, core_interface, test_data, qps, max_latency, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (id, test_type, namespace, '|'.join(appnames), port, core_interface, test_data, qps, max_latency, 'processing'))
    conn.commit()
    conn.close()
    return 'OK'

def mock_run_test(id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
    UPDATE results SET status = 'success', suggested_resources = 'cpu: 1, memory: 1Gi | cpu: 2, memory: 4Gi ', max_usage_resources = 'cpu: 0.5, memory: 500Mi | cpu: 0.7, memory: 700Mi', average_latency = 100, status = 'success' WHERE id = ?
    ''', (id,))
    conn.commit()
    conn.close()
    return 'OK'

def list_results(id, test_type):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    if id:
        if test_type:
            cursor.execute('''
            SELECT * FROM results WHERE id LIKE ? AND test_type = ?
            ''', (id, test_type))
        else:
            cursor.execute('''
            SELECT * FROM results WHERE id LIKE ?
            ''', (id,))
    else:
        if test_type:
            cursor.execute('''
            SELECT * FROM results WHERE test_type = ?
            ''', (test_type,))
        else:
            cursor.execute('''
            SELECT * FROM results
            ''')
    results = cursor.fetchall()
    conn.close()
    return results

def delete_result_by_id(id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
    DELETE FROM results WHERE id = ?
    ''', (id,))
    conn.commit()
    conn.close()
    return 'OK'