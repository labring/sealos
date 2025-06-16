import subprocess
import json

# 定义记录pod异常的map，用namespace和pod名称作为key
pod_exception_map = {}
map_lock = False

# 写一个函数每10s检查所有的pod，如果有pod处于异常状态，则记录该pod的名称和状态到日志中
def record_events():
    global pod_exception_map
    global map_lock

    if map_lock == True:
        # 如果锁定，直接返回
        return
    map_lock = True

    try:

        cmd = "kubectl get pods --all-namespaces -o json --kubeconfig=/etc/kubernetes/admin.conf"
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, universal_newlines=True)
        pods = json.loads(result.stdout)

        for pod in pods['items']:
            namespace = pod['metadata']['namespace']
            name = pod['metadata']['name']
            status = pod['status']['phase']
            appname = pod['metadata'].get('labels', {}).get('app', 'unknown')
            # print(f"Checking pod: {namespace}/{name}, status: {status}")
            # print("status:", pod['status']['containerStatuses'][0]['lastState'])
            # if name == 'hello-world2-55b8f77997-6csq6':
            #     print("status:", pod['status'])

            # 检查pod状态是否异常
            if status not in ['Running', 'Succeeded']:
                    key = f"{namespace}/{name}"

                # if status == 'Pending':
                    # describe命令获取更多信息
                    describe_cmd = f"kubectl get events -n {namespace} --field-selector involvedObject.name={name} --kubeconfig=/etc/kubernetes/admin.conf  --sort-by='.metadata.creationTimestamp'"
                    describe_result = subprocess.run(describe_cmd, shell=True, check=True, capture_output=True, universal_newlines=True)
                    describe_events = describe_result.stdout.strip()
                    # print(f"Pod {key} is pending, events: {describe_events}")
                    pod_exception_map[key] = {'status': status, 'message': describe_events, 'appName': appname}
                # else:
                #     last_states = []
                    # if 'containerStatuses' in pod['status']:
                    #     for container in pod['status']['containerStatuses']:
                    #         if 'lastState' in container and container['lastState']:
                    #             last_states.append((container['name'], container['lastState'], container['reason']))
                    # pod_exception_map[key] = {'status': status, 'message': last_states}
                    # print(f"Pod {key} is in abnormal state: {status}")
            else:
                ready_flag = False
                if status == 'Running':
                    for condition in pod.get('status', {}).get('conditions', []):
                        if condition.get('type') == 'Ready' and condition.get('status') == 'True':
                            ready_flag = True
                            break

                time_flag = False
                last_states = []
                if 'containerStatuses' in pod['status']:
                    for container in pod['status']['containerStatuses']:
                        # 检查container['lastState']['finishedAt']是否在1m内
                        # print("Container: ", container)
                        # print("lastState: ", container.get('lastState', {}))
                        # print("terminated: ", container.get('lastState', {}).get('terminated', {}))
                        if 'lastState' in container and container['lastState'] and 'terminated' in container['lastState'] and container['lastState']['terminated'] and 'finishedAt' in container['lastState']['terminated']:
                            finished_at = container['lastState']['terminated']['finishedAt']
                            # 比较finished_at时间是否在1分钟内，finished_at的格式类似于2025-06-07T10:01:26Z
                            from datetime import datetime, timedelta
                            finished_time = datetime.strptime(finished_at, '%Y-%m-%dT%H:%M:%SZ')
                            current_time = datetime.utcnow()
                            # print(f"Container {container['name']} finished at: {finished_time}, current time: {current_time}")
                            if current_time - finished_time < timedelta(minutes=1):
                                time_flag = True
                                # print("terminated: ", container.get('lastState', {}).get('terminated', {}))
                            last_states.append((container['name'], container['lastState'], container['lastState']['terminated']['reason']))
                        # if 'lastState' in container and container['lastState']:
                        #     last_states.append((container['name'], container['lastState'], container['reason']))
                
                if ready_flag == False or time_flag == True:
                    # 如果有container的lastState在1分钟内，记录pod异常
                    key = f"{namespace}/{name}"
                    pod_exception_map[key] = {'status': 'Failed', 'message': last_states, 'appName': appname}
                else:
                    # 如果pod恢复正常，移除记录
                    key = f"{namespace}/{name}"
                    if key in pod_exception_map:
                        del pod_exception_map[key]
    except Exception as e:
        print(f"Error while checking pods: {e}")
    finally:
        map_lock = False

def get_pod_exception_map():
    return pod_exception_map

if __name__ == "__main__":
    record_events()
    print(json.dumps(pod_exception_map, indent=2, ensure_ascii=False))