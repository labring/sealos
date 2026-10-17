"""Deployment contract checks. Requires Helm 3 and PyYAML; no cluster needed."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

import yaml


DEPLOY = Path(__file__).resolve().parents[1]
CHART = DEPLOY / "charts" / "vlogs-service"


def render(values=None):
    result = subprocess.run(
        ["helm", "template", "vlogs", str(CHART), "-n", "logs", "-f", "-"],
        input=yaml.safe_dump(values or {}),
        text=True,
        capture_output=True,
        check=True,
    )
    return {doc["kind"]: doc for doc in yaml.safe_load_all(result.stdout) if doc}


class ChartTests(unittest.TestCase):
    def test_default_service_and_runtime_config(self):
        docs = render()
        service = docs["Service"]
        self.assertEqual(service["metadata"]["name"], "service-vlogs")
        self.assertEqual(service["spec"]["ports"][0]["port"], 8428)
        pod = docs["Deployment"]["spec"]["template"]["spec"]
        container = pod["containers"][0]
        self.assertEqual(container["args"], ["/config/config.yml"])
        self.assertFalse(pod["automountServiceAccountToken"])
        self.assertEqual(container["readinessProbe"]["tcpSocket"]["port"], "http")
        self.assertEqual(container["ports"][0]["name"], "http")
        config = yaml.safe_load(docs["Secret"]["stringData"]["config.yml"])
        self.assertEqual(config["server"]["addr"], ":8428")
        self.assertTrue(config["server"]["path"].startswith("http://"))
        self.assertEqual(
            pod["volumes"][0]["secret"]["secretName"],
            docs["Secret"]["metadata"]["name"],
        )
        self.assertEqual(service["spec"]["selector"], docs["Deployment"]["spec"]["selector"]["matchLabels"])
        for doc in docs.values():
            self.assertEqual(doc["metadata"]["namespace"], "logs")

    def test_custom_backend_credentials_port_and_scheduling(self):
        password = 'quoted: "secret"\nwith newline'
        docs = render({
            "fullnameOverride": "custom-logs",
            "image": "example.com/vlogs:v1",
            "containerPort": 9429,
            "service": {"port": 80},
            "replicaCount": 3,
            "config": {"path": "https://logs.example.com/tenant", "username": "reader", "password": password},
            "whitelistKubernetesHosts": ["https://one:6443", "https://two:6443"],
            "nodeSelector": {"kubernetes.io/arch": "arm64"},
            "imagePullSecrets": [{"name": "registry-auth"}],
        })
        pod = docs["Deployment"]["spec"]["template"]["spec"]
        container = pod["containers"][0]
        config = yaml.safe_load(docs["Secret"]["stringData"]["config.yml"])["server"]
        self.assertEqual(config["password"], password)
        self.assertEqual(config["username"], "reader")
        self.assertEqual(config["path"], "https://logs.example.com/tenant")
        self.assertEqual(config["addr"], ":9429")
        self.assertEqual(container["ports"][0]["containerPort"], 9429)
        self.assertEqual(container["image"], "example.com/vlogs:v1")
        self.assertEqual(container["env"][0]["value"], "https://one:6443,https://two:6443")
        self.assertEqual(pod["nodeSelector"]["kubernetes.io/arch"], "arm64")
        self.assertEqual(pod["imagePullSecrets"], [{"name": "registry-auth"}])
        self.assertEqual(docs["Deployment"]["spec"]["replicas"], 3)
        self.assertEqual(docs["Service"]["metadata"]["name"], "custom-logs")
        self.assertEqual(docs["Service"]["spec"]["ports"][0]["port"], 80)

    def test_config_change_restarts_pods(self):
        before = render()["Deployment"]["spec"]["template"]["metadata"]["annotations"]["checksum/config"]
        after = render({"config": {"password": "changed"}})["Deployment"]["spec"]["template"]["metadata"]["annotations"]["checksum/config"]
        self.assertNotEqual(before, after)

    def test_external_secret_is_mounted_without_generating_credentials(self):
        docs = render({"existingConfigSecret": "external-config"})
        self.assertNotIn("Secret", docs)
        pod = docs["Deployment"]["spec"]["template"]["spec"]
        self.assertEqual(pod["volumes"][0]["secret"]["secretName"], "external-config")

    def test_packaged_overrides_follow_new_image_defaults(self):
        overrides = yaml.safe_load((CHART / "vlogs-service-values.yaml").read_text())
        # Persisted user values must not freeze the image from the first install.
        docs = render({"image": "example.com/vlogs:next", **overrides})
        image = docs["Deployment"]["spec"]["template"]["spec"]["containers"][0]["image"]
        self.assertEqual(image, "example.com/vlogs:next")


class EntrypointTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="vlogs deploy ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.chart = self.root / "charts" / "vlogs-service"
        shutil.copytree(CHART, self.chart)
        self.user_values = self.root / "user values" / "vlogs.yaml"
        self.args_file = self.root / "helm-args.json"
        mock = self.root / "helm"
        mock.write_text(
            "#!/usr/bin/env python3\n"
            "import json, os, pathlib, sys\n"
            "pathlib.Path(os.environ['HELM_ARGS_FILE']).write_text(json.dumps(sys.argv[1:]))\n"
            "sys.exit(int(os.environ.get('HELM_EXIT_CODE', '0')))\n"
        )
        mock.chmod(0o755)
        self.env = {
            **os.environ,
            "PATH": str(self.root) + os.pathsep + os.environ["PATH"],
            "CHART_PATH": str(self.chart),
            "USER_VALUES_FILE": str(self.user_values),
            "HELM_ARGS_FILE": str(self.args_file),
            "RELEASE_NAME": "vlogs",
            "RELEASE_NAMESPACE": "sealos",
            "HELM_OPTS": "",
        }
        for key in ("PACKAGED_APP_VALUES_FILE", "CHART_APP_VALUES_FILE", "HELM_EXIT_CODE"):
            self.env.pop(key, None)

    def run_entrypoint(self, *args):
        return subprocess.run(
            ["bash", str(DEPLOY / "entrypoint.sh"), *args],
            env=self.env, cwd=self.root, text=True, capture_output=True,
        )

    def test_first_install_copies_private_values_and_calls_helm(self):
        result = self.run_entrypoint()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.user_values.read_bytes(), (self.chart / "vlogs-service-values.yaml").read_bytes())
        self.assertEqual(self.user_values.stat().st_mode & 0o077, 0)
        self.assertEqual(json.loads(self.args_file.read_text()), [
            "upgrade", "-i", "vlogs", str(self.chart), "-n", "sealos",
            "--create-namespace", "-f", str(self.user_values),
        ])

    def test_upgrade_preserves_user_values(self):
        self.assertEqual(self.run_entrypoint().returncode, 0)
        custom = "config:\n  path: https://custom.example.com\n  password: keep-me\n"
        self.user_values.write_text(custom)
        (self.chart / "vlogs-service-values.yaml").write_text("replicaCount: 9\n")
        result = self.run_entrypoint()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.user_values.read_text(), custom)

    def test_release_namespace_and_additional_flags(self):
        self.env.update(RELEASE_NAME="logs", RELEASE_NAMESPACE="custom", HELM_OPTS="--wait --timeout 5m")
        result = self.run_entrypoint("--set-string", "config.password=value with spaces")
        self.assertEqual(result.returncode, 0, result.stderr)
        args = json.loads(self.args_file.read_text())
        self.assertEqual(args[2], "logs")
        self.assertEqual(args[5], "custom")
        self.assertEqual(args[-5:], ["--wait", "--timeout", "5m", "--set-string", "config.password=value with spaces"])

    def test_missing_chart_fails_before_helm(self):
        self.env["CHART_PATH"] = str(self.root / "missing")
        result = self.run_entrypoint()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("chart directory not found", result.stderr)
        self.assertFalse(self.args_file.exists())

    def test_missing_packaged_values_fails_before_helm(self):
        (self.chart / "vlogs-service-values.yaml").unlink()
        result = self.run_entrypoint()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("packaged values file not found", result.stderr)
        self.assertFalse(self.args_file.exists())

    def test_packaged_values_override(self):
        packaged = self.root / "packaged.yaml"
        packaged.write_text("replicaCount: 2\n")
        self.env["PACKAGED_APP_VALUES_FILE"] = str(packaged)
        result = self.run_entrypoint()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.user_values.read_text(), "replicaCount: 2\n")

    def test_helm_failure_is_returned(self):
        self.env["HELM_EXIT_CODE"] = "17"
        self.assertEqual(self.run_entrypoint().returncode, 17)


if __name__ == "__main__":
    unittest.main(verbosity=2)
