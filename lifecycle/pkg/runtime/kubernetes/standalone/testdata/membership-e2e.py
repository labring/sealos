# Copyright 2026 sealos.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
"""Exercise sealctl membership on a disposable two-host kind cluster.

Requires a Linux sealctl binary and the already built mode-controller fixture.
The fixture validates deployment/route ownership, not a CNI routing algorithm.
"""

import argparse
import base64
import json
import pathlib
import re
import subprocess
import tempfile


def run(*args, capture=False, check=True):
    result = subprocess.run(args, text=True, capture_output=capture, check=check)
    return result.stdout if capture else result.returncode


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kind", required=True)
    parser.add_argument("--sealctl", required=True)
    parser.add_argument("--controller-image", required=True)
    parser.add_argument("--name", default="sealos-membership-e2e")
    parser.add_argument("--keep", action="store_true")
    parser.add_argument("--reuse", action="store_true")
    options = parser.parse_args()
    seed = options.name + "-control-plane"
    joining = options.name + "-worker"

    def execute(host, *args, **kwargs):
        return run("docker", "exec", host, *args, **kwargs)

    def kubectl(*args):
        return execute(seed, "kubectl", "--kubeconfig=/etc/kubernetes/admin.conf", *args, capture=True)

    def sealctl(host, *args, **kwargs):
        return execute(host, "/usr/local/bin/sealctl", *args, **kwargs)

    def assert_unregistered():
        nodes = json.loads(kubectl("get", "nodes", "-o", "json"))
        assert not nodes["items"], "a standalone control plane registered a Node"
        pods = json.loads(kubectl("get", "pods", "-A", "-o", "json"))
        mirrors = [pod for pod in pods["items"] if "kubernetes.io/config.mirror" in pod["metadata"].get("annotations", {})]
        assert not mirrors, "standalone control-plane mirror Pods remain"

    def endpoints(host):
        return json.loads(sealctl(host, "standalone", "etcd-endpoints", capture=True))

    with tempfile.TemporaryDirectory(prefix="sealos-membership-") as temporary:
        root = pathlib.Path(temporary)
        kind_config = root / "kind.yaml"
        kind_config.write_text("kind: Cluster\napiVersion: kind.x-k8s.io/v1alpha4\nnodes:\n- role: control-plane\n- role: worker\n")
        if not options.reuse:
            run(options.kind, "create", "cluster", "--name", options.name, "--image", "kindest/node:v1.30.13", "--config", str(kind_config), "--kubeconfig", str(root / "kubeconfig"), "--wait", "180s")
        try:
            run(options.kind, "load", "docker-image", options.controller_image, "--name", options.name)
            ready = root / "ready"
            ready.write_text("ready")
            for host in (seed, joining):
                run("docker", "cp", options.sealctl, host + ":/usr/local/bin/sealctl")
                execute(host, "mkdir", "-p", "/etc/kubernetes/route-controller")
                run("docker", "cp", str(ready), host + ":/etc/kubernetes/route-controller/config")
            shared = root / "shared"
            shared.mkdir()
            run("docker", "cp", seed + ":/etc/kubernetes/pki", str(shared / "pki"))
            run("docker", "cp", seed + ":/etc/kubernetes/admin.conf", str(shared / "admin.conf"))
            for host in (seed, joining):
                run("docker", "cp", str(shared / "admin.conf"), host + ":/etc/kubernetes/route-controller/kubeconfig")

            controller_args = (
                "--route-controller-image", options.controller_image,
                "--route-controller-config", "/etc/kubernetes/route-controller/config",
            )
            sealctl(seed, "switch", "standalone", *controller_args, "--check-only")
            sealctl(seed, "switch", "standalone", *controller_args)
            cluster_config = json.loads(kubectl("get", "cm", "kubeadm-config", "-n", "kube-system", "-o", "json"))["data"]["ClusterConfiguration"]
            kubelet_config = json.loads(kubectl("get", "cm", "kubelet-config", "-n", "kube-system", "-o", "json"))["data"]["kubelet"]
            execute(joining, "kubeadm", "reset", "-f")
            kubectl("delete", "node", joining, "--wait=true", "--ignore-not-found=true")
            address = json.loads(run("docker", "inspect", joining, capture=True))[0]["NetworkSettings"]["Networks"]["kind"]["IPAddress"]
            init_config = {
                "apiVersion": "kubeadm.k8s.io/v1beta3",
                "kind": "InitConfiguration",
                "localAPIEndpoint": {"advertiseAddress": address, "bindPort": 6443},
                "nodeRegistration": {"name": joining, "criSocket": "unix:///run/containerd/containerd.sock"},
            }
            controller = {
                "Image": options.controller_image,
                "Kubeconfig": "/etc/kubernetes/route-controller/kubeconfig",
                "Config": "/etc/kubernetes/route-controller/config",
                "Table": 254,
                "Protocol": 99,
            }

            def prepare(join):
                configuration = cluster_config
                if not join:
                    configuration = re.sub(r"^controlPlaneEndpoint:.*$", "controlPlaneEndpoint: ''", configuration, flags=re.MULTILINE)
                document = configuration + "\n---\n" + json.dumps(init_config) + "\n---\n" + kubelet_config
                plan = {
                    "Config": base64.b64encode(document.encode()).decode(),
                    "Controller": controller,
                    "Join": join,
                    "EtcdEndpoints": endpoints(seed) if join else [],
                }
                path = root / "plan.json"
                path.write_text(json.dumps(plan, indent=2))
                path.chmod(0o600)
                run("docker", "cp", str(path), joining + ":/root/bootstrap-plan.json")
                if join:
                    execute(joining, "mkdir", "-p", "/var/lib/sealos/control-plane-mode/shared/pki/etcd")
                    for name in ("ca.crt", "ca.key", "front-proxy-ca.crt", "front-proxy-ca.key", "sa.pub", "sa.key", "etcd/ca.crt", "etcd/ca.key"):
                        run("docker", "cp", str(shared / "pki" / name), joining + ":/var/lib/sealos/control-plane-mode/shared/pki/" + name)
                    run("docker", "cp", str(shared / "admin.conf"), joining + ":/var/lib/sealos/control-plane-mode/shared/admin.conf")

            prepare(True)
            sealctl(joining, "standalone", "bootstrap", "--plan", "/root/bootstrap-plan.json", "--check-only")
            not_ready = root / "not-ready"
            not_ready.write_text("not-ready")
            run("docker", "cp", str(not_ready), joining + ":/etc/kubernetes/route-controller/config")
            failed = sealctl(joining, "standalone", "bootstrap", "--plan", "/root/bootstrap-plan.json", "--timeout", "120s", check=False)
            assert failed != 0, "bootstrap ignored controller readiness failure"
            assert_unregistered()
            execute(joining, "sh", "-c", "printf ready > /etc/kubernetes/route-controller/config")
            sealctl(joining, "standalone", "bootstrap", "--plan", "/root/bootstrap-plan.json")
            sealctl(joining, "standalone", "bootstrap", "--plan", "/root/bootstrap-plan.json")
            assert len(endpoints(seed)) == 2, "join did not promote exactly one new etcd voter"
            assert_unregistered()

            execute(joining, "ip", "route", "add", "blackhole", "198.18.0.2/32", "table", "200", "proto", "112")
            sealctl(joining, "switch", "standalone", "--update-controller", "--route-table", "200", "--route-protocol", "111")
            previous_routes = execute(joining, "ip", "-j", "route", "show", "table", "254", "proto", "99", capture=True)
            assert json.loads(previous_routes) == [], "controller update left previous owned routes"
            saved_controller = json.loads(sealctl(joining, "standalone", "controller-config", capture=True))
            assert saved_controller["Config"] == controller["Config"], "partial controller update discarded configuration"
            assert saved_controller["Table"] == 200 and saved_controller["Protocol"] == 111
            assert_unregistered()
            sealctl(joining, "switch", "registered", "--check-only")
            sealctl(joining, "switch", "registered")
            owned_routes = execute(joining, "ip", "-j", "route", "show", "table", "200", "proto", "111", capture=True)
            foreign_routes = execute(joining, "ip", "-j", "route", "show", "table", "200", "proto", "112", capture=True)
            assert json.loads(owned_routes) == [], "reverse conversion left updated controller routes"
            assert len(json.loads(foreign_routes)) == 1, "reverse conversion removed another route owner's rules"
            sealctl(joining, "switch", "standalone", *controller_args)
            assert_unregistered()

            sealctl(joining, "standalone", "reset", "--check-only")
            sealctl(joining, "standalone", "reset")
            sealctl(joining, "standalone", "reset")
            assert len(endpoints(seed)) == 1, "removal left the etcd member behind"
            routes = execute(joining, "ip", "-j", "route", "show", "table", "254", "proto", "99", capture=True)
            assert json.loads(routes) == [], "reset left owned routes behind"
            prepare(True)
            sealctl(joining, "standalone", "bootstrap", "--plan", "/root/bootstrap-plan.json")
            assert len(endpoints(seed)) == 2, "reset host could not rejoin"
            assert_unregistered()
            sealctl(joining, "standalone", "reset", "--destroy-cluster")
            sealctl(seed, "standalone", "reset", "--destroy-cluster")
            sealctl(seed, "standalone", "reset", "--destroy-cluster")

            prepare(False)
            sealctl(joining, "standalone", "bootstrap", "--plan", "/root/bootstrap-plan.json")
            nodes = execute(joining, "kubectl", "--kubeconfig=/etc/kubernetes/admin.conf", "get", "nodes", "-o", "json", capture=True)
            assert not json.loads(nodes)["items"], "fresh standalone init registered a Node"
            sealctl(joining, "standalone", "reset", "--destroy-cluster")
            print("PASS: learner join, failed join resume, controller update, reverse conversion, member removal, rejoin, offline destruction, fresh init")
        finally:
            if not options.keep:
                run(options.kind, "delete", "cluster", "--name", options.name)


if __name__ == "__main__":
    main()
