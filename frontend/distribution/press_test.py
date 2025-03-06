
import sqlite3

DATABASE = 'app.db'

def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    # 创建表的SQL语句
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        namespace TEXT NOT NULL,
        appname TEXT NOT NULL,
        port INTEGER NOT NULL,
        core_interface TEXT NOT NULL,
        test_data TEXT NOT NULL,
        qps INTEGER NOT NULL,
        max_latency INTEGER NOT NULL
        suggested_resources TEXT,
        max_usage_resources TEXT,
        status TEXT NOT NULL
    )
    ''')
    conn.commit()
    conn.close()


# 命名空间: string
# 应用列表: [appname]
# 端口: int
# 核心接口: string
# 测试数据: string
# 期望的QPS: int
# 最大时延(ms): int
def press_test(namespace, appnames, port, core_interface, test_data, qps, max_latency):
    init_db()
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    # 插入数据
    conn.commit()
    conn.close()
    return 'OK'

def list_results():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
    SELECT * FROM results
    ''')
    results = cursor.fetchall()
    conn.close()
    return results

def get_result_by_id(id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
    SELECT * FROM results WHERE id = ?
    ''', (id,))
    result = cursor.fetchone()
    conn.close()
    return result

def delete_result_by_id(id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
    DELETE FROM results WHERE id = ?
    ''', (id,))
    conn.commit()
    conn.close()
    return 'OK'