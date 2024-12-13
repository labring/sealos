import subprocess
import time

def add_node_to_cluster(node_ip: str, cluster_name: str = 'default', user: str = '', passwd: str = '', pk: str = '', pk_passwd: str = '', port: int = 22):
    command = [
        'sealos', 'add',
        '--nodes', node_ip,
        '--cluster', cluster_name,
        '--port', str(port)
    ]
    
    if user:
        command.extend(['--user', user])
    if passwd:
        command.extend(['--passwd', passwd])
    if pk:
        command.extend(['--pk', pk])
    if pk_passwd:
        command.extend(['--pk-passwd', pk_passwd])
    
    p = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    print(' '.join(command))
    
    time.sleep(3)
    
    success = False
    errorlines = []
    
    try:
        p.stdin.write('y\n')
        p.stdin.flush()
    finally:
        # # 实时获取输出
        for line in iter(p.stdout.readline, ''):
            line_data = line.strip()
            print(line_data)
            if "succeeded in scaling this cluster" in line_data:
                return
        for line in iter(p.stderr.readline, ''):
            line_data = line.strip()
            errorlines.append(line_data)
            print(line_data)

    if not success:
        raise Exception("Error adding node: " + ' '.join(errorlines))

# Example usage:
# add_node_to_cluster('192.168.1.100', user='root', passwd='your_password')

def delete_node_from_cluster(node_ip: str, cluster_name: str = 'default', force: bool = False):
    command = [
        'sealos', 'delete',
        '--nodes', node_ip,
        '--cluster', cluster_name,
    ]
    
    if force:
        command.append('--force')
    
    #result = subprocess.run(command, capture_output=True, text=True)
    p = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    time.sleep(3)
    
    success = False
    errorlines = []
    
    try:
        p.stdin.write('y\n')
        p.stdin.flush()
    finally:
        # # 实时获取输出
        for line in iter(p.stdout.readline, ''):
            line_data = line.strip()
            print(line_data)
            if "succeeded in scaling this cluster" in line_data:
                success = True
            for line in iter(p.stderr.readline, ''):
                line_data = line.strip()
                errorlines.append(line_data)
                print(line_data)
                
    if not success:
        raise Exception("Error adding node: " + ' '.join(errorlines))

# Example usage:
# delete_node_from_cluster('192.168.1.100', user='root', passwd='your_password')