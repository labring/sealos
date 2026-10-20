#!/usr/bin/env python3
"""Exercise legacy app cleanup ordering without accessing a cluster."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ENTRYPOINT = Path(__file__).with_name("user-controller-entrypoint.sh")
MOCK = r'''#!/usr/bin/env python3
import os
from pathlib import Path
import sys

command = Path(sys.argv[0]).name
args = sys.argv[1:]
with open(os.environ["TEST_LOG"], "a") as log:
    log.write(command + " " + " ".join(args) + "\n")
stage = None
if command == "helm" and args[0] == "upgrade":
    stage = "helm"
elif command == "helm" and args[0] == "show":
    print("mock CRDs")
elif command == "kubectl" and args[0] == "apply":
    sys.stdin.read()
    stage = "crds"
elif command == "kubectl" and args[:2] == ["rollout", "status"]:
    stage = "rollout"
elif command == "kubectl" and args[:3] == ["delete", "deployment", "app-controller-manager"]:
    # A missing legacy Deployment succeeds only when explicitly ignored.
    if os.environ.get("TEST_LEGACY_MISSING") == "1" and "--ignore-not-found" not in args:
        sys.exit(1)
if stage and os.environ.get("TEST_FAIL_STAGE") == stage:
    sys.exit(1)
'''


class EntrypointTest(unittest.TestCase):
    def run_entrypoint(self, fail_stage="", legacy_missing=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ("helm", "kubectl", "mkdir", "cp"):
                command = root / name
                command.write_text(MOCK)
                command.chmod(0o755)
            log = root / "commands.log"
            env = dict(os.environ)
            env.update(
                PATH=str(root) + os.pathsep + env["PATH"],
                TEST_LOG=str(log),
                TEST_FAIL_STAGE=fail_stage,
                TEST_LEGACY_MISSING="1" if legacy_missing else "0",
                SEALOS_CLOUD_DOMAIN="example.invalid",
                SEALOS_CLOUD_APISERVER_PORT="6443",
                RELEASE_NAME="custom-user",
                RELEASE_NAMESPACE="custom-system",
                HELM_OPTS="",
                HELM_OPTIONS="",
            )
            result = subprocess.run(["bash", str(ENTRYPOINT)], env=env,
                                    cwd=root, capture_output=True, text=True)
            return result, log.read_text().splitlines()

    def test_cleanup_follows_successful_install_and_rollout(self):
        result, commands = self.run_entrypoint()
        self.assertEqual(result.returncode, 0, result.stderr)
        crds = next(i for i, c in enumerate(commands) if c.startswith("kubectl apply "))
        rollout = next(i for i, c in enumerate(commands) if c.startswith("kubectl rollout "))
        cleanup = commands[-1]
        self.assertLess(crds, rollout)
        self.assertIn("-n custom-system", commands[rollout])
        self.assertIn("app.kubernetes.io/instance=custom-user", commands[rollout])
        self.assertEqual(cleanup, "kubectl delete deployment app-controller-manager -n app-system "
                         "--ignore-not-found --wait=true --timeout=60s")

    def test_failed_install_does_not_remove_legacy_controller(self):
        for stage in ("helm", "crds", "rollout"):
            with self.subTest(stage=stage):
                result, commands = self.run_entrypoint(fail_stage=stage)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(any(c.startswith("kubectl delete deployment ") for c in commands))

    def test_fresh_or_repeated_install_accepts_missing_legacy_controller(self):
        result, _ = self.run_entrypoint(legacy_missing=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
