
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
# def stress_test(id, test_type, namespace, appnames, port, core_interface, test_data, qps, max_latency):
#     conn = sqlite3.connect(DATABASE)
#     cursor = conn.cursor()
#     # 插入数据
#     cursor.execute('''
#     INSERT INTO results (id, test_type, namespace, appname, port, core_interface, test_data, qps, max_latency, status)
#     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
#     ''', (id, test_type, namespace, '|'.join(appnames), port, core_interface, test_data, qps, max_latency, 'processing'))
#     conn.commit()
#     conn.close()
#     return 'OK'

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

import subprocess
import json
import requests

def change_resource(appname, namespace, cpu, memory):
    cmd_get_json_data = 'kubectl -n %s get deployment %s -o json --kubeconfig=/etc/kubernetes/admin.conf' % (namespace, appname)
    p = subprocess.Popen(cmd_get_json_data, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    p.wait()
    json_data = p.stdout.read()
    print(json_data)
    
    json_data = json_data.decode('utf-8')
    json_data = json.loads(json_data)
    print(json_data)

    # change resource
    json_data['spec']['template']['spec']['containers'][0]['resources']['requests']['cpu'] = cpu
    json_data['spec']['template']['spec']['containers'][0]['resources']['requests']['memory'] = memory
    json_data['spec']['template']['spec']['containers'][0]['resources']['limits']['cpu'] = cpu
    json_data['spec']['template']['spec']['containers'][0]['resources']['limits']['memory'] = memory
    
    cmd = 'kubectl -n %s patch deployment %s --kubeconfig=/etc/kubernetes/admin.conf -p \'%s\'' % (namespace, appname, json.dumps(json_data))
    print(cmd)
    p = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    p.wait()
    print(p.stdout.read())
    print(p.stderr.read())

def check_pod_status(appname, namespace):
    cmd = 'kubectl -n %s get pods -l app=%s --kubeconfig=/etc/kubernetes/admin.conf | wc -l' % (namespace, appname)
    p = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    p.wait()
    out = p.stdout.read().decode('utf-8').strip()
    print(out)
    print(p.stderr.read())

    if out != '2':
        print('Pod not ready')
        return False

    cmd = 'kubectl -n %s get pods -l app=%s --kubeconfig=/etc/kubernetes/admin.conf' % (namespace, appname)
    p = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    p.wait()
    out = p.stdout.read().decode('utf-8').strip()
    print(out)
    print(p.stderr.read())

    if out.find('Running') != -1:
        return True
    return False

def transform_cpu(cpu):
    if cpu.endswith('m'):
        return int(cpu[:-1]) / 1000
    return int(cpu)

def transform_memory(memory):
    if memory.endswith('Mi'):
        return int(memory[:-2]) / 1024
    return int(memory[:-2])

def get_pod_usage(appname, namespace):
    cmd = 'kubectl -n %s top pod -l app=%s --kubeconfig=/etc/kubernetes/admin.conf | grep %s | awk \'{print $2, $3}\'' % (namespace, appname, appname)
    p = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    p.wait()
    output = p.stdout.read().decode('utf-8')
    print(p.stderr.read())
    usages = output.split(' ')
    print(usages)
    cpu_usage = usages[0].strip()
    memory_usage = usages[1].strip()
    return transform_cpu(cpu_usage), transform_memory(memory_usage)

import asyncio
import aiohttp
import time
import threading

async def single_test(url, test_data, start_time):
    async with aiohttp.ClientSession() as session:
        # start_time = time.time()
        async with session.post(url, json=test_data) as response:
            await response.text()
            if response.status != 200:
                return 1e9
            latency = time.time() - start_time
            return latency

async def run_concurrent_test(url, test_data, qps):
    start_time = time.time()
    latencies = []
    for _ in range(30):
        tasks = [single_test(url, test_data, start_time) for _ in range(qps)]
        latencies = latencies + await asyncio.gather(*tasks)
        sleep_time = 1 - (time.time() - start_time)
        if sleep_time > 0:
            time.sleep(sleep_time)
        start_time = time.time()
    average_latency = sum(latencies) / len(latencies)
    print('Average latency: ', average_latency)
    return average_latency

async def run_concurrent_test_wrapper(url, test_data, qps):
    long_task = asyncio.create_task(run_concurrent_test(url, test_data, qps))
    try:
        result = await asyncio.wait_for(long_task, timeout=60)
    except asyncio.TimeoutError:
        return 1e9
    return result

def collect_usage(appname, namespace, results):
    max_cpu_usage = 0
    max_memory_usage = 0
    for i in range(60):
        try:
            cpu_usage, memory_usage = get_pod_usage(appname, namespace)
        except Exception as e:
            print('Error: ', e)
            time.sleep(1)
            continue
        max_cpu_usage = max(max_cpu_usage, cpu_usage)
        max_memory_usage = max(max_memory_usage, memory_usage)
        time.sleep(1)
    results[appname] = (max_cpu_usage, max_memory_usage)

def stress_test(id, test_type, namespace, appnames, port, url, test_data, qps, max_latency):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
    INSERT INTO results (id, test_type, namespace, appname, port, core_interface, test_data, qps, max_latency, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (id, test_type, namespace, '|'.join(appnames), port, url, test_data, qps, max_latency, 'processing'))
    conn.commit()
    conn.close()

    thread = threading.Thread(target=stress_test_subprocess, args=(id, test_type, namespace, appnames, port, url, test_data, qps, max_latency))
    thread.start()
    return 'OK'

def stress_test_subprocess(id, test_type, namespace, appnames, port, url, test_data, qps, max_latency):
    usages = {}
    max_usages = {}

    for appname in appnames:
        usages[appname] = [1, 2]
        change_resource(appname, namespace, '1', '2Gi')
        ready = False
        for _ in range(100):
            time.sleep(1)
            if check_pod_status(appname, namespace):
                ready = True
                break
        if not ready:
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            cursor.execute('''
            UPDATE results SET status = 'failed' WHERE id = ?
            ''', (id,))
            conn.commit()
            conn.close()

            print("result: ", list_results(id, test_type))
            return 'Failed'

    while True:
        any_scaled = False
        results = {}
        threads = []
        for appname in appnames:
            thread = threading.Thread(target=collect_usage, args=(appname, namespace, results))
            threads.append(thread)
            thread.start()

        latency = asyncio.run(run_concurrent_test_wrapper(url, test_data, qps))

        for thread in threads:
            thread.join()

        for appname, (cpu_usage, memory_usage) in results.items():
            max_usages[appname] = (cpu_usage * usages[appname][0], memory_usage * usages[appname][1])
            if cpu_usage > 0.5 or memory_usage > 0.9:
                any_scaled = True
                usages[appname][0] = usages[appname][0] * 2
                usages[appname][1] = usages[appname][1] * 2
                change_resource(appname, namespace, str(usages[appname][0]), str(usages[appname][1])+ 'Gi')
                ready = False
                for _ in range(100):
                    time.sleep(1)
                    if check_pod_status(appname, namespace):
                        ready = True
                        break
                if not ready:
                    conn = sqlite3.connect(DATABASE)
                    cursor = conn.cursor()
                    cursor.execute('''
                    UPDATE results SET status = 'failed' WHERE id = ?
                    ''', (id,))
                    conn.commit()
                    conn.close()

                    print("result: ", list_results(id, test_type))
                    return 'Failed'
        
        print('Latency: ', latency)
        if latency <= max_latency:
            break

        if not any_scaled:
            break
    
    if latency > 1e8:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('''
        UPDATE results SET status = 'timeout' WHERE id = ?
        ''', (id,))
        conn.commit()
        conn.close()

        print("result: ", list_results(id, test_type))
        return 'Failed'

    suggested_resources = ' | '.join([f'cpu: {usages[appname][0]}, memory: {usages[appname][1]}Gi' for appname in appnames])
    max_usage_resources = ' | '.join([f'cpu: {max_usages[appname][0]}, memory: {max_usages[appname][1]}Gi' for appname in appnames])
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
    UPDATE results SET status = 'completed', average_latency = ?, suggested_resources = ?, max_usage_resources = ? WHERE id = ?
    ''', (latency, suggested_resources, max_usage_resources, id))
    conn.commit()
    conn.close()

    print("result: ", list_results(id, test_type))
    return 'OK'

if __name__ == '__main__':
    init_db()
    # change_resource('nginx', 'test01', '2', '4Gi')
    # print(get_pod_usage('nginx', 'test01'))
    CLUSTER_DOMAIN = '192.168.0.134'
    STRESS_ID="test_stress_id_1"
    STRESS_TYPE="two"
    NAMESPACE="test01"
    APP_LIST="nginx,python-app-lst"
    PORT="32567"
    CORE_API="/test"
    TEST_DATA="1234"
    QPS=1000
    MAX_LATENCY=200
    url = f"http://{CLUSTER_DOMAIN}:{PORT}{CORE_API}"
    stress_test(STRESS_ID, STRESS_TYPE, NAMESPACE, APP_LIST.split(','), PORT, url, TEST_DATA, QPS, MAX_LATENCY)