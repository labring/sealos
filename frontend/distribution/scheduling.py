import json
import requests
import time
import subprocess
import sqlite3
from urllib.parse import quote

SCHEDULING_DATABASE = 'scheduling.db'

SERVER_PORT = 5002
FRONTEND_PORT = 32293

# backend_urls = []
latencys = {}
# app_list = []

def init_scheduling():
    try:
        conn = sqlite3.connect(SCHEDULING_DATABASE)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS backends
                    (ip string PRIMARY KEY)''')
        c.execute('''CREATE TABLE IF NOT EXISTS apps
                    (app_name string PRIMARY KEY, namespace TEXT, app2 TEXT, namespace2 TEXT, url_key TEXT, current_backend TEXT, ports TEXT)''')
        conn.commit()
        conn.close()
    except Exception as e:
        print(e)

def ping():
    return "pong"

def register_backend(ip):
    # backend_urls.append(ip)
    conn = sqlite3.connect(SCHEDULING_DATABASE)
    c = conn.cursor()
    c.execute("INSERT INTO backends (ip) VALUES (?)", (ip,))
    conn.commit()
    conn.close()
    latencys.clear()

def delete_backend(ip):
    # backend_urls.remove(ip)
    conn = sqlite3.connect(SCHEDULING_DATABASE)
    c = conn.cursor()
    c.execute("DELETE FROM backends WHERE ip=?", (ip,))
    conn.commit()
    conn.close()
    latencys.clear()

def get_backends():
    # return backend_urls
    conn = sqlite3.connect(SCHEDULING_DATABASE)
    c = conn.cursor()
    c.execute("SELECT ip FROM backends")
    backend_urls = [row[0] for row in c.fetchall()]
    conn.close()
    return backend_urls


def test_latency():
    global latencys
    backend_urls = get_backends()
    for ip in backend_urls:
        start = time.time()
        try:
            # Add timeout to the request
            response = requests.get("http://" + ip + ":" + str(SERVER_PORT) + "/ping", timeout=5)
            end = time.time()
            if ip not in latencys:
                latencys[ip] = []
            latencys[ip].append(end - start)
        except requests.exceptions.Timeout:
            print(f"Timeout occurred while pinging {ip}")
            if ip not in latencys:
                latencys[ip] = []
            latencys[ip].append(1000)  # Use infinity to indicate timeout
    return latencys

def register_app(app_name, namespace, app2, namespace2, url_key, current_backend, ports):
    if len(ports) == 0:
        return "ports is empty"
    # check ports is map
    if not isinstance(ports, dict):
        return "ports is not map"
    # check ports value is int
    for port in ports.values():
        if not isinstance(port, int):
            return "ports value is not int"
        # check port is valid
        if port < 32000 or port > 32767:
            return "port is invalid"

    # app_list.append([app_name, namespace, app2, namespace2, url_key, current_backend, ports])
    conn = sqlite3.connect(SCHEDULING_DATABASE)
    c = conn.cursor()
    try:
        c.execute("INSERT INTO apps (app_name, namespace, app2, namespace2, url_key, current_backend, ports) VALUES (?, ?, ?, ?, ?, ?, ?)", (app_name, namespace, app2, namespace2, url_key, current_backend, json.dumps(ports)))
        conn.commit()
        conn.close()
        return "success"
    except:
        conn.close()
        return "app already exists"

def delete_app(app_name, namespace):
    # for app in app_list:
    #     if app[0] == app_name and app[1] == namespace:
    #         app_list.remove(app)
    #         return "success"
    conn = sqlite3.connect(SCHEDULING_DATABASE)
    c = conn.cursor()
    try:
        c.execute("DELETE FROM apps WHERE app_name=? AND namespace=?", (app_name, namespace))
        conn.commit()
        conn.close()
        return "success"
    except:
        conn.close()
        return "app not found"
    
def update_app(app_name, namespace, current_backend):
    conn = sqlite3.connect(SCHEDULING_DATABASE)
    c = conn.cursor()
    try:
        c.execute("UPDATE apps SET current_backend=? WHERE app_name=? AND namespace=?", (current_backend, app_name, namespace))
        conn.commit()
        conn.close()
        return "success"
    except:
        conn.close()
        return "app not found"

def get_app_list():
    # return app_list
    conn = sqlite3.connect(SCHEDULING_DATABASE)
    c = conn.cursor()
    c.execute("SELECT app_name, namespace, app2, namespace2, url_key, current_backend, ports FROM apps")
    app_list = c.fetchall()
    conn.close()
    print(app_list)
    return app_list

def change_deploy_env(app2, namespace2, url_key, new_backend):
    # get deploy of app2
    cmd = "kubectl get deploy " + app2 + " -n " + namespace2 + " -o json"
    result = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE)
    deploy = result.stdout.decode('utf-8')
    deploy = eval(deploy)
    # change env of deploy
    for container in deploy["spec"]["template"]["spec"]["containers"]:
        if container["name"] == app2:
            for env in container["env"]:
                if env["name"] == url_key:
                    env["value"] = new_backend
    # update deploy
    cmd = "kubectl apply -f -"
    result = subprocess.run(cmd, shell=True, input=str(deploy), stdout=subprocess.PIPE)
    return result.stdout.decode('utf-8')

check_all_apps_flag = False

def check_all_apps():
    print("check_all_apps")
    global check_all_apps_flag
    if check_all_apps_flag:
        return
    check_all_apps_flag = True
    try:
        test_latency()
        print("latencys: ", latencys)
        backend_urls = get_backends()
        if len(latencys[backend_urls[0]]) >= 5:
            # 统计每个后端的平均延迟
            avg_latency = {}
            for ip in backend_urls:
                avg_latency[ip] = sum(latencys[ip]) / len(latencys[ip])
            # 选出最快的后端
            best_backend = min(avg_latency, key=avg_latency.get)

            latencys.clear()

            # 为每个app分配后端
            for app in get_app_list():
                print("app: ", app)
                print("best_backend: ", best_backend)
                app_name, namespace, app2, namespace2, url_key, current_backend, ports = app
                if current_backend != best_backend:
                    # 于后端创建新的app

                    deployapp_url = "http://" + best_backend + ":" + str(SERVER_PORT) + "/api/deployAppWithImage"
                    data = {
                        "path": "/root/.mxapps/" + namespace2 + "/" + app2,
                        "modelName": "app4399",
                        "modelVersion": "v1",
                        "modelCode": "app4399",
                        "ports": json.loads(ports),
                    }
                    response = requests.post(deployapp_url, json=data)
                    if response.status_code != 200:
                        print(response.text)
                        check_all_apps_flag = False
                        return
                    print("deploy app " + app2 + " to " + best_backend)
                    
                    # 更新app的url
                    cmd = "kubectl get deploy " + app_name + " -n " + namespace + " --kubeconfig=/etc/kubernetes/admin.conf -o json"
                    result = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE)
                    deploy = result.stdout.decode('utf-8')
                    print(deploy)
                    deploy = json.loads(deploy)
                    print(deploy["spec"]["template"]["spec"]["containers"])
                    for container in deploy["spec"]["template"]["spec"]["containers"]:
                        # if container["name"] == app_name:
                            for env in container["env"]:
                                if env["name"] == url_key:
                                    env["value"] = best_backend
                    cmd = "kubectl patch deploy " + app_name + " -n " + namespace + " --kubeconfig=/etc/kubernetes/admin.conf -p '" + json.dumps(deploy) + "'"
                    print(cmd)
                    result = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE)
                    if result.returncode != 0:
                        print(result.stdout.decode('utf-8'))
                        check_all_apps_flag = False
                        return
                    print("update app " + app_name + " to " + best_backend)

                    kubeconfig_path = "/etc/kubernetes/admin.conf"
                    kubeconfig = ""
                    with open(kubeconfig_path, 'r') as f:
                        kubeconfig = f.read()
                    
                    # encodeURIComponent kubeconfig for url
                    kubeconfig = quote(kubeconfig, safe='')
                    # print(kubeconfig)

                    # 删除旧的app
                    deleteapp_url = "http://" + current_backend + ":" + str(FRONTEND_PORT) + "/api/delApp?namespace=" + namespace
                    # print(deleteapp_url)
                    data = {
                        "name": app_name,
                    }
                    # add kubeconfig to header as Authorization
                    headers = {
                        "Authorization": kubeconfig
                    }
                    response = requests.post(deleteapp_url, json=data, headers=headers)
                    if response.status_code != 200:
                        print(response.text)
                        check_all_apps_flag = False
                        return
                    print("delete app " + app_name + " from " + current_backend)
                    
                    # 更新current_backend
                    update_app(app_name, namespace, best_backend)
                    print("update database " + app_name + " to " + best_backend)
                    
            return "success"
    except Exception as e:
        print(e)
    finally:
        check_all_apps_flag = False


