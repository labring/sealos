#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import subprocess
from datetime import datetime
from kubernetes import client, config
import logging
from typing import Dict, List

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bandwidth_autoscaler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BandwidthAutoscaler:
    def __init__(self):
        """初始化基于带宽的自动扩缩容控制器"""
        try:
            # 尝试加载集群内配置，如果失败则使用本地配置
            config.load_incluster_config()
        except:
            try:
                # 尝试使用默认kubeconfig
                config.load_kube_config()
            except:
                try:
                    # 尝试使用容器中的kubeconfig路径
                    config.load_kube_config(config_file="/etc/kubernetes/admin.conf")
                except:
                    logger.error("无法加载k8s配置，请检查集群连接")
                    raise Exception("K8s配置加载失败")
        
        self.v1 = client.AppsV1Api()
        self.core_v1 = client.CoreV1Api()
        
        # 扩缩容历史记录，用于防止频繁变化
        self.scale_history = []
        self.cooldown_period = 120  # 冷却期2分钟
        self.sampling_interval = 2.0  # 带宽采样间隔（秒）
        
    def get_deployment_annotations(self, deployment_name, namespace='default'):
        """获取deployment的注解配置"""
        try:
            deployment = self.v1.read_namespaced_deployment(
                name=deployment_name, 
                namespace=namespace
            )
            return deployment.metadata.annotations
        except Exception as e:
            logger.error(f"获取deployment注解失败: {e}")
            return {}
    
    def get_current_replicas(self, deployment_name, namespace='default'):
        """获取当前副本数"""
        try:
            deployment = self.v1.read_namespaced_deployment(
                name=deployment_name,
                namespace=namespace
            )
            return deployment.spec.replicas
        except Exception as e:
            logger.error(f"获取副本数失败: {e}")
            # 不使用假数据，抛出异常让上层处理
            raise Exception(f"无法获取副本数: {e}")
    
    def update_replicas(self, deployment_name, new_replicas, namespace='default'):
        """更新副本数"""
        try:
            # 更新deployment的副本数
            body = {'spec': {'replicas': new_replicas}}
            self.v1.patch_namespaced_deployment(
                name=deployment_name,
                namespace=namespace,
                body=body
            )
            logger.info(f"成功将 {deployment_name} 副本数调整为 {new_replicas}")
            return True
        except Exception as e:
            logger.error(f"更新副本数失败: {e}")
            return False
    
    async def get_app_pods(self, app_name: str, namespace: str = "default") -> List:
        """获取应用的所有pod"""
        try:
            # 通过label selector查找pods
            selectors = [
                f"app={app_name}",
                f"app.kubernetes.io/name={app_name}",
                f"k8s-app={app_name}"
            ]
            
            pods = []
            for selector in selectors:
                try:
                    pod_list = self.core_v1.list_namespaced_pod(
                        namespace=namespace,
                        label_selector=selector
                    )
                    if pod_list.items:
                        pods.extend(pod_list.items)
                        break
                except:
                    continue
            
            if not pods:
                # 通过名称模糊匹配
                all_pods = self.core_v1.list_namespaced_pod(namespace=namespace)
                pods = [pod for pod in all_pods.items 
                       if app_name in pod.metadata.name]
            
            return pods
            
        except Exception as e:
            logger.error(f"获取应用 {app_name} 的pods失败: {e}")
            return []
    
    async def get_pod_network_metrics(self, pod_name: str, namespace: str = "default") -> Dict:
        """获取pod的网络指标"""
        try:
            result = subprocess.run(
                ['kubectl', 'exec', '-n', namespace, pod_name, '--', 'cat', '/proc/net/dev'],
                capture_output=True, text=True, timeout=15
            )
            
            if result.returncode == 0:
                return self._parse_proc_net_dev(result.stdout)
            else:
                logger.warning(f"kubectl exec失败: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            logger.warning(f"kubectl exec超时: {pod_name}")
        except FileNotFoundError:
            logger.warning("kubectl命令未找到")
        except Exception as e:
            logger.warning(f"获取pod {pod_name} 网络指标失败: {e}")
        
        return {'rx_bytes': 0, 'tx_bytes': 0}
    
    def _parse_proc_net_dev(self, content: str) -> Dict:
        """解析/proc/net/dev内容"""
        try:
            lines = content.strip().split('\n')
            total_rx_bytes = 0
            total_tx_bytes = 0
            
            for i, line in enumerate(lines):
                if i < 2:  # 跳过头部两行
                    continue
                
                parts = line.split()
                if len(parts) >= 17 and ':' in parts[0]:
                    try:
                        rx_bytes = int(parts[1])
                        tx_bytes = int(parts[9])
                        
                        total_rx_bytes += rx_bytes
                        total_tx_bytes += tx_bytes
                        
                    except (ValueError, IndexError):
                        continue
            
            return {
                'rx_bytes': total_rx_bytes,
                'tx_bytes': total_tx_bytes
            }
            
        except Exception as e:
            logger.warning(f"解析网络指标失败: {e}")
            return {'rx_bytes': 0, 'tx_bytes': 0}
    
    async def get_app_traffic(self, app_name: str, namespace: str = "default") -> Dict:
        """获取应用流量数据"""
        try:
            pods = await self.get_app_pods(app_name, namespace)
            if not pods:
                logger.warning(f"未找到应用 {app_name} 的pods")
                return {
                    'total_rx_bytes': 0,
                    'total_tx_bytes': 0,
                    'pod_count': 0
                }
            
            total_rx_bytes = 0
            total_tx_bytes = 0
            
            for pod in pods:
                if pod.status.phase != 'Running':
                    continue
                
                metrics = await self.get_pod_network_metrics(pod.metadata.name, namespace)
                total_rx_bytes += metrics['rx_bytes']
                total_tx_bytes += metrics['tx_bytes']
            
            return {
                'total_rx_bytes': total_rx_bytes,
                'total_tx_bytes': total_tx_bytes,
                'pod_count': len([p for p in pods if p.status.phase == 'Running'])
            }
            
        except Exception as e:
            logger.error(f"获取应用 {app_name} 流量数据失败: {e}")
            return {
                'total_rx_bytes': 0,
                'total_tx_bytes': 0,
                'pod_count': 0
            }
    
    async def get_app_bandwidth_kbps(self, app_name: str, namespace: str = "default", sampling_interval: float = None):
        """
        获取应用的实时带宽 (Kbps) - 使用和app_traffic_api相同的算法
        """
        if sampling_interval is None:
            sampling_interval = self.sampling_interval
        
        try:
            logger.info(f"开始计算应用 {app_name} 的实时带宽，采样间隔: {sampling_interval}秒")
            
            # 第一次采样
            first_sample = await self.get_app_traffic(app_name, namespace)
            first_time = datetime.now()
            
            # 等待采样间隔
            await asyncio.sleep(sampling_interval)
            
            # 第二次采样
            second_sample = await self.get_app_traffic(app_name, namespace)
            second_time = datetime.now()
            
            # 计算实际时间间隔
            actual_interval = (second_time - first_time).total_seconds()
            
            # 计算带宽 (bps)
            rx_bps = (second_sample['total_rx_bytes'] - first_sample['total_rx_bytes']) / actual_interval
            tx_bps = (second_sample['total_tx_bytes'] - first_sample['total_tx_bytes']) / actual_interval
            
            # 转换为 Kbps
            rx_kbps = max(0, rx_bps / 1024)
            tx_kbps = max(0, tx_bps / 1024)
            total_kbps = rx_kbps + tx_kbps
            
            logger.info(f"应用 {app_name} 带宽: RX={rx_kbps:.2f}Kbps, TX={tx_kbps:.2f}Kbps, 总计={total_kbps:.2f}Kbps")
            
            return {
                'rx_kbps': rx_kbps,
                'tx_kbps': tx_kbps,
                'total_kbps': total_kbps,
                'pod_count': second_sample['pod_count'],
                'sampling_interval': actual_interval
            }
            
        except Exception as e:
            logger.error(f"获取应用 {app_name} 带宽失败: {e}")
            # 尝试获取真实的pod数量，而不是使用假数据
            try:
                pods = await self.get_app_pods(app_name, namespace)
                real_pod_count = len([p for p in pods if p.status.phase == 'Running'])
            except:
                real_pod_count = 0
            
            return {
                'rx_kbps': 0,
                'tx_kbps': 0,
                'total_kbps': 0,
                'pod_count': real_pod_count,  # 使用真实Pod数量，不是假数据
                'sampling_interval': sampling_interval
            }
    
    def calculate_min_threshold(self, max_threshold):
        """
        计算最小阈值，避免频繁扩缩容
        min = max * 0.3，提供足够的缓冲区间
        """
        return max_threshold * 0.3
    
    def should_scale(self, current_time):
        """检查是否应该进行扩缩容（冷却期检查）"""
        if not self.scale_history:
            return True
        
        last_scale_time = self.scale_history[-1]['time']
        time_diff = (current_time - last_scale_time).total_seconds()
        
        return time_diff >= self.cooldown_period
    
    def _validate_annotations(self, annotations):
        """验证annotations中是否包含所有必要字段"""
        required_fields = [
            'deploy.cloud.sealos.io/network-hpa',
            'deploy.cloud.sealos.io/minReplicas',
            'deploy.cloud.sealos.io/maxReplicas'
        ]
        
        for field in required_fields:
            if field not in annotations:
                logger.error(f"缺少必要配置: {field}")
                return False
        return True
    
    async def make_scaling_decision(self, deployment_name, namespace='default'):
        """做出扩缩容决策 - 基于真实带宽数据"""
        try:
            # 获取配置
            annotations = self.get_deployment_annotations(deployment_name, namespace)
            
            if not annotations or 'deploy.cloud.sealos.io/network-hpa' not in annotations:
                logger.info("自动扩缩容未启用 (缺少 deploy.cloud.sealos.io/network-hpa 配置)")
                return
            
            # 验证所有必要字段
            if not self._validate_annotations(annotations):
                return
            
            max_rate = float(annotations['deploy.cloud.sealos.io/network-hpa'])  # Kbps
            min_instances = int(annotations['deploy.cloud.sealos.io/minReplicas'])
            max_instances = int(annotations['deploy.cloud.sealos.io/maxReplicas'])
            
            # 计算最小阈值
            min_rate = self.calculate_min_threshold(max_rate)
            
            # 获取当前状态
            try:
                current_replicas = self.get_current_replicas(deployment_name, namespace)
            except Exception as e:
                logger.error(f"无法获取当前副本数，跳过本次扩缩容检查: {e}")
                return
            
            # 获取真实带宽数据 (和app_traffic_api相同的算法)
            bandwidth_data = await self.get_app_bandwidth_kbps(deployment_name, namespace)
            app_bandwidth_kbps = bandwidth_data['total_kbps']
            
            # 计算每个实例的平均带宽负载
            x = app_bandwidth_kbps / current_replicas if current_replicas > 0 else app_bandwidth_kbps
            
            logger.info(f"当前指标 - 副本数: {current_replicas}, 总带宽: {app_bandwidth_kbps:.2f}Kbps, "
                       f"每实例负载: {x:.2f}Kbps, 阈值范围: [{min_rate:.2f}, {max_rate}]")
            
            current_time = datetime.now()
            new_replicas = current_replicas
            action = "保持"
            
            # 扩缩容决策
            if x > max_rate and current_replicas < max_instances:
                if self.should_scale(current_time):
                    new_replicas = min(current_replicas + 1, max_instances)
                    action = "扩容"
                else:
                    remaining = self.cooldown_period - (current_time - self.scale_history[-1]['time']).total_seconds()
                    logger.info(f"扩容请求被冷却期限制 (剩余 {remaining:.0f}s)")
                    
            elif x < min_rate and current_replicas > min_instances:
                if self.should_scale(current_time):
                    new_replicas = max(current_replicas - 1, min_instances)
                    action = "缩容"
                else:
                    remaining = self.cooldown_period - (current_time - self.scale_history[-1]['time']).total_seconds()
                    logger.info(f"缩容请求被冷却期限制 (剩余 {remaining:.0f}s)")
            
            # 执行扩缩容
            if new_replicas != current_replicas:
                if self.update_replicas(deployment_name, new_replicas, namespace):
                    # 记录扩缩容历史
                    self.scale_history.append({
                        'time': current_time,
                        'action': action,
                        'from': current_replicas,
                        'to': new_replicas,
                        'trigger_rate': x,
                        'total_bandwidth': app_bandwidth_kbps
                    })
                    
                    # 只保留最近10次记录
                    if len(self.scale_history) > 10:
                        self.scale_history = self.scale_history[-10:]
                    
                    logger.info(f"✅ {action}成功: {current_replicas} -> {new_replicas} (触发值: {x:.2f}Kbps)")
            else:
                logger.info(f"📊 {action}: 当前副本数 {current_replicas} 已满足需求")
                
        except Exception as e:
            logger.error(f"扩缩容决策过程发生错误: {e}")
    
    def print_history(self):
        """打印扩缩容历史"""
        if not self.scale_history:
            logger.info("暂无扩缩容历史记录")
            return
            
        logger.info("📈 扩缩容历史记录:")
        for record in self.scale_history[-5:]:  # 显示最近5次
            logger.info(f"  {record['time'].strftime('%H:%M:%S')} - {record['action']}: "
                       f"{record['from']} -> {record['to']} (负载: {record['trigger_rate']:.2f}Kbps)")
    
    async def get_all_autoscale_deployments(self, namespace='default'):
        """获取所有启用了带宽自动扩缩容的deployment"""
        try:
            deployments = []
            
            # 获取指定namespace的所有deployment
            if namespace == 'all':
                # 获取所有namespace的deployment
                namespaces = self.core_v1.list_namespace()
                for ns in namespaces.items:
                    ns_name = ns.metadata.name
                    # 跳过系统namespace
                    if ns_name.startswith('kube-') or ns_name in ['kube-system', 'kube-public', 'kube-node-lease']:
                        continue
                    try:
                        dep_list = self.v1.list_namespaced_deployment(namespace=ns_name)
                        for dep in dep_list.items:
                            if dep.metadata.annotations and 'deploy.cloud.sealos.io/network-hpa' in dep.metadata.annotations:
                                deployments.append({
                                    'name': dep.metadata.name,
                                    'namespace': ns_name,
                                    'annotations': dep.metadata.annotations
                                })
                    except Exception as e:
                        logger.warning(f"获取namespace {ns_name} 的deployment失败: {e}")
            else:
                # 获取指定namespace的deployment
                dep_list = self.v1.list_namespaced_deployment(namespace=namespace)
                for dep in dep_list.items:
                    if dep.metadata.annotations and 'deploy.cloud.sealos.io/network-hpa' in dep.metadata.annotations:
                        deployments.append({
                            'name': dep.metadata.name,
                            'namespace': namespace,
                            'annotations': dep.metadata.annotations
                        })
            
            return deployments
            
        except Exception as e:
            logger.error(f"获取启用自动扩缩容的deployment失败: {e}")
            return []

    async def run_single_app(self, deployment_name, namespace):
        """为单个应用运行扩缩容监控"""
        app_scale_history = []  # 每个应用独立的扩缩容历史
        
        while True:
            try:
                logger.info(f"🔍 检查应用 {namespace}/{deployment_name}")
                
                # 临时保存当前的scale_history
                original_history = self.scale_history
                self.scale_history = app_scale_history
                
                await self.make_scaling_decision(deployment_name, namespace)
                
                # 保存应用的扩缩容历史
                app_scale_history = self.scale_history
                # 恢复原来的history
                self.scale_history = original_history
                
                await asyncio.sleep(60)  # 每分钟检查一次
                
            except Exception as e:
                logger.error(f"应用 {namespace}/{deployment_name} 扩缩容过程发生错误: {e}")
                await asyncio.sleep(60)

    async def run(self, namespace='default'):
        """启动集群级别的基于带宽自动扩缩容器"""
        logger.info("🚀 集群级别带宽自动扩缩容器启动")
        logger.info(f"监控范围: {namespace}")
        logger.info("检查间隔: 60秒")
        logger.info("冷却期: 120秒")
        logger.info("负载指标: 真实网络带宽 (Kbps)")
        logger.info("触发条件: deployment包含 deploy.cloud.sealos.io/network-hpa 注解")
        
        running_tasks = {}  # 存储每个应用的监控任务
        
        while True:
            try:
                logger.info(f"\n{'='*60}")
                logger.info(f"🔍 扫描集群中的自动扩缩容应用 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                
                # 获取所有启用了自动扩缩容的deployment
                autoscale_deployments = await self.get_all_autoscale_deployments(namespace)
                
                logger.info(f"📊 发现 {len(autoscale_deployments)} 个启用自动扩缩容的应用:")
                for dep in autoscale_deployments:
                    hpa_value = dep['annotations'].get('deploy.cloud.sealos.io/network-hpa', 'N/A')
                    logger.info(f"   • {dep['namespace']}/{dep['name']} (阈值: {hpa_value}Kbps)")
                
                # 启动新发现的应用监控
                current_apps = set()
                for dep in autoscale_deployments:
                    app_key = f"{dep['namespace']}/{dep['name']}"
                    current_apps.add(app_key)
                    
                    if app_key not in running_tasks:
                        logger.info(f"🚀 启动新应用监控: {app_key}")
                        task = asyncio.create_task(
                            self.run_single_app(dep['name'], dep['namespace'])
                        )
                        running_tasks[app_key] = task
                
                # 停止已删除应用的监控
                removed_apps = set(running_tasks.keys()) - current_apps
                for app_key in removed_apps:
                    logger.info(f"🛑 停止应用监控: {app_key}")
                    running_tasks[app_key].cancel()
                    del running_tasks[app_key]
                
                # 显示当前监控状态
                logger.info(f"📈 当前监控 {len(running_tasks)} 个应用")
                self.print_cluster_status(running_tasks)
                
                logger.info("💤 等待下次集群扫描...")
                await asyncio.sleep(300)  # 每5分钟重新扫描集群
                
            except KeyboardInterrupt:
                logger.info("👋 收到停止信号，正在退出...")
                # 取消所有任务
                for task in running_tasks.values():
                    task.cancel()
                break
            except Exception as e:
                logger.error(f"集群扫描过程发生错误: {e}")
                await asyncio.sleep(60)

    def print_cluster_status(self, running_tasks):
        """显示集群监控状态"""
        if not running_tasks:
            logger.info("   暂无应用在监控中")
            return
            
        logger.info("   监控中的应用:")
        for app_key in running_tasks.keys():
            logger.info(f"     ✅ {app_key}")
        
        # 显示最近的扩缩容历史
        if self.scale_history:
            logger.info("📈 最近扩缩容记录:")
            for record in self.scale_history[-3:]:  # 显示最近3次
                logger.info(f"   {record['time'].strftime('%H:%M:%S')} - {record['action']}: "
                           f"{record['from']} -> {record['to']} (负载: {record['trigger_rate']:.2f}Kbps)")

def run_autoscaler_all():
    """供 app.py 线程调用的函数，监控所有namespace"""
    try:
        logger.info("🚀 带宽自动扩缩容器作为线程启动")
        autoscaler = BandwidthAutoscaler()
        asyncio.run(autoscaler.run('all'))
    except Exception as e:
        logger.error(f"带宽自动扩缩容器线程启动失败: {e}")

async def main():
    """主函数"""
    import sys
    
    print("🎯 K8s 集群级带宽自动扩缩容器")
    print("作者: AI Assistant") 
    print("说明: 基于真实网络带宽 (Kbps) 的智能扩缩容")
    print("范围: 监控整个集群中所有启用扩缩容的应用")
    print("触发: deployment包含 deploy.cloud.sealos.io/network-hpa 注解")
    print("-" * 60)
    
    # 支持命令行参数指定namespace
    namespace = 'default'
    if len(sys.argv) > 1:
        namespace = sys.argv[1]
    
    print(f"🎯 监控范围: {namespace}")
    print("💡 使用方式:")
    print("   python bandwidth_autoscaler.py          # 监控default namespace")
    print("   python bandwidth_autoscaler.py all      # 监控所有namespace (除系统namespace)")
    print("   python bandwidth_autoscaler.py ns-xxx   # 监控指定namespace")
    print("-" * 60)
    
    try:
        autoscaler = BandwidthAutoscaler()
        
        # 启动集群级扩缩容器
        await autoscaler.run(namespace)
    except KeyboardInterrupt:
        print("\n👋 程序退出")
    except Exception as e:
        print(f"启动失败: {e}")
        print("请检查K8s集群连接")

if __name__ == "__main__":
    asyncio.run(main()) 