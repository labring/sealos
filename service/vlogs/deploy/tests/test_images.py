"""Exercise native packaging and manifest publication without a Docker daemon."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

import yaml


ROOT = Path(__file__).resolve().parents[4]
WORKFLOW = yaml.safe_load((ROOT / ".github/workflows/vlogs-images.yml").read_text())


class ImageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="vlogs-images-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.log = self.root / "commands.jsonl"
        self.bin = self.root / "bin"
        self.bin.mkdir()
        mock = self.bin / "mock"
        mock.write_text(
            "#!/usr/bin/env python3\n"
            "import json, os, pathlib, sys\n"
            "name = pathlib.Path(sys.argv[0]).name\n"
            "with open(os.environ['COMMAND_LOG'], 'a') as log:\n"
            "    log.write(json.dumps([name, *sys.argv[1:]]) + '\\n')\n"
            "if name == 'go' and sys.argv[1:] == ['env', 'GOOS']:\n"
            "    print('linux')\n"
            "if name == 'go' and sys.argv[1:] == ['env', 'GOARCH']:\n"
            "    print(os.environ.get('MOCK_NATIVE_ARCH', os.environ['ARCH']))\n"
            "if name == 'docker' and sys.argv[1:3] == ['manifest', 'inspect']:\n"
            "    if os.environ.get('MISSING_ARCH') and sys.argv[-1].endswith('-' + os.environ['MISSING_ARCH']):\n"
            "        sys.exit(1)\n"
            "if name == 'docker' and sys.argv[1:3] == ['manifest', 'push']:\n"
            "    sys.exit(int(os.environ.get('PUSH_EXIT_CODE', '0')))\n"
        )
        mock.chmod(0o755)
        for name in ("docker", "go", "sudo"):
            (self.bin / name).symlink_to(mock)
        self.env = {
            **os.environ,
            "PATH": str(self.bin) + os.pathsep + os.environ["PATH"],
            "COMMAND_LOG": str(self.log),
            "IMAGE_REPO": "ghcr.io/example/vlogs",
            "GHCR_RUNTIME_REPO": "ghcr.io/example/vlogs",
            "GHCR_CLUSTER_REPO": "ghcr.io/example/vlogs-cluster",
            "BUILD_TAG": "build-123-2",
            "GITHUB_REPOSITORY": "example/sealos",
            "GITHUB_SHA": "abcdef1234567890",
            "PUSH_IMAGE": "true",
            "ALIYUN_REPO_PREFIX": "",
            "MIRROR_REPO": "",
            "REPO_OWNER": "example",
            "GH_TOKEN": "mock-token",
            "DOCKER_METADATA_OUTPUT_TAGS": "ghcr.io/example/vlogs:latest\nghcr.io/example/vlogs:build-123-2",
        }

    def commands(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []

    def run_step(self, job, name):
        step = next(step for step in WORKFLOW["jobs"][job]["steps"] if step.get("name") == name)
        cwd = self.root / step.get("working-directory", ".")
        cwd.mkdir(parents=True, exist_ok=True)
        return subprocess.run(["bash", "-euo", "pipefail", "-c", step["run"]],
                              env=self.env, cwd=cwd, text=True, capture_output=True)

    def merge(self):
        return subprocess.run(["bash", str(ROOT / "service/vlogs/scripts/merge-images.sh")],
                              env=self.env, text=True, capture_output=True)

    def test_both_build_stages_have_native_runners(self):
        expected = {"amd64": "ubuntu-24.04", "arm64": "ubuntu-24.04-arm"}
        for job in ("runtime-build", "cluster-build"):
            matrix = WORKFLOW["jobs"][job]["strategy"]["matrix"]["include"]
            self.assertEqual({row["arch"]: row["runner"] for row in matrix}, expected)
        self.assertEqual(WORKFLOW["jobs"]["runtime-release"]["needs"], "runtime-build")
        self.assertEqual(WORKFLOW["jobs"]["cluster-build"]["needs"], "runtime-release")
        self.assertEqual(WORKFLOW["jobs"]["cluster-release"]["needs"], "cluster-build")
        self.assertNotIn("buildx", json.dumps(WORKFLOW).lower())
        self.assertNotIn("qemu", json.dumps(WORKFLOW).lower())

    def test_runtime_compiles_on_matching_arch_and_only_packages_with_docker(self):
        for arch in ("amd64", "arm64"):
            self.env["ARCH"] = arch
            result = self.run_step("runtime-build", "Compile native binary")
            self.assertEqual(result.returncode, 0, result.stderr)
            result = self.run_step("runtime-build", "Package and publish native runtime image")
            self.assertEqual(result.returncode, 0, result.stderr)
            commands = self.commands()
            self.assertTrue(any(cmd[:2] == ["go", "build"] for cmd in commands))
            self.assertIn(["docker", "push", f"ghcr.io/example/vlogs:build-123-2-{arch}"], commands)
            self.assertFalse(any("--platform" in cmd or "buildx" in cmd for cmd in commands))

    def test_wrong_native_arch_fails_before_compilation(self):
        self.env.update(ARCH="arm64", MOCK_NATIVE_ARCH="amd64")
        self.assertNotEqual(self.run_step("runtime-build", "Compile native binary").returncode, 0)
        self.assertFalse(any(cmd[:2] == ["go", "build"] for cmd in self.commands()))

    def test_pr_packages_without_pushing(self):
        self.env.update(ARCH="amd64", PUSH_IMAGE="false")
        result = self.run_step("runtime-build", "Package and publish native runtime image")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(any(cmd[:2] == ["docker", "push"] for cmd in self.commands()))

    def test_cluster_caches_only_the_runner_architecture(self):
        for arch in ("amd64", "arm64"):
            self.env["ARCH"] = arch
            chart = self.root / "service/vlogs/deploy/charts/vlogs-service"
            shutil.copytree(ROOT / "service/vlogs/deploy/charts/vlogs-service", chart, dirs_exist_ok=True)
            result = self.run_step("cluster-build", "Cache and package native cluster image")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(yaml.safe_load((chart / "values.yaml").read_text())["image"],
                             "ghcr.io/example/vlogs:build-123-2")
            saves = [cmd for cmd in self.commands() if cmd[:4] == ["sudo", "sealos", "registry", "save"]]
            self.assertEqual(saves[-1], ["sudo", "sealos", "registry", "save", "--registry-dir=registry",
                                        "--arch", arch, "--images=ghcr.io/example/vlogs:build-123-2"])

    def test_merge_publishes_both_architectures_and_mirror(self):
        self.env["MIRROR_REPO"] = "mirror.example.com/team/vlogs"
        self.env["DOCKER_METADATA_OUTPUT_TAGS"] += "\nmirror.example.com/team/vlogs:latest"
        result = self.merge()
        self.assertEqual(result.returncode, 0, result.stderr)
        commands = self.commands()
        for tag in self.env["DOCKER_METADATA_OUTPUT_TAGS"].splitlines():
            repo = tag.rsplit(":", 1)[0]
            self.assertIn(["docker", "manifest", "create", tag,
                           f"{repo}:build-123-2-amd64", f"{repo}:build-123-2-arm64"], commands)
            self.assertIn(["docker", "manifest", "push", "--purge", tag], commands)

    def test_missing_architecture_prevents_publication(self):
        self.env["MISSING_ARCH"] = "arm64"
        self.assertNotEqual(self.merge().returncode, 0)
        self.assertFalse(any(cmd[1:3] in (["manifest", "create"], ["manifest", "push"]) for cmd in self.commands()))

    def test_manifest_push_failure_is_returned(self):
        self.env["PUSH_EXIT_CODE"] = "19"
        self.assertEqual(self.merge().returncode, 19)


if __name__ == "__main__":
    unittest.main(verbosity=2)
