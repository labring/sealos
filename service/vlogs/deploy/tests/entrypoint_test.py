"""Exercise migration safety without a Kubernetes cluster or external packages."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

DEPLOY = Path(__file__).resolve().parents[1]
FAKE = '''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
cmd = Path(sys.argv[0]).name
args = sys.argv[1:]
with open(os.environ['CALL_LOG'], 'a') as f:
    f.write(json.dumps([cmd] + args) + '\\n')
if cmd == 'helm':
    if args[0] == 'template' and os.environ.get('INVALID_CHART'):
        sys.exit(1)
    if args[0] == 'upgrade' and os.environ.get('FAIL_UPGRADE'):
        sys.exit(1)
elif args[0] == 'get':
    resource = args[1]
    output = args[args.index('-o') + 1]
    if os.environ.get('GET_FAILURE'):
        sys.exit(1)
    if output == 'name':
        if not os.environ.get('FRESH_INSTALL'):
            print(resource)
    elif output == 'yaml':
        print('kind: List\\nitems: []')
    elif 'release-name' in output and resource.startswith('deployment/'):
        print(os.environ.get('OTHER_OWNER', ''), end='')
    elif 'spec.selector' in output:
        print(os.environ.get('SELECTOR', '{"matchLabels":{"app":"service-vlogs"}}'), end='')
'''


class EntrypointTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.values = root / 'values.yaml'
        self.values.write_text('serviceVlogsConfig: {}\n')
        self.log = root / 'calls.jsonl'
        self.backup = root / 'backup'
        bindir = root / 'bin'
        bindir.mkdir()
        for name in ('helm', 'kubectl'):
            p = bindir / name
            p.write_text(FAKE)
            p.chmod(0o755)
        self.env = dict(os.environ, PATH=f'{bindir}:{os.environ["PATH"]}',
                        USER_VALUES_PATH=str(self.values), BACKUP_DIR=str(self.backup),
                        CHART_PATH=str(DEPLOY / 'charts/vlogs'), CALL_LOG=str(self.log),
                        RELEASE_NAME='vlogs', RELEASE_NAMESPACE='sealos')

    def run_script(self, *args, **env):
        result = subprocess.run(['bash', str(DEPLOY / 'entrypoint.sh'), *args],
                                env=dict(self.env, **env), capture_output=True, text=True)
        calls = [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []
        return result, calls

    def assert_no_mutations(self, calls):
        self.assertFalse([c for c in calls if c[:2] in
                          [['kubectl', 'label'], ['kubectl', 'annotate'], ['helm', 'upgrade']]])

    def test_missing_values_creates_template_without_cluster_access(self):
        self.values.unlink()
        result, calls = self.run_script()
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(self.values.exists())
        self.assertEqual(self.values.stat().st_mode & 0o777, 0o600)
        self.assertEqual(calls, [])

    def test_conflict_on_last_resource_prevents_all_adoption(self):
        result, calls = self.run_script(OTHER_OWNER='other-release')
        self.assertNotEqual(result.returncode, 0)
        self.assert_no_mutations(calls)

    def test_incompatible_selector_prevents_adoption(self):
        result, calls = self.run_script(SELECTOR='{"matchLabels":{"app":"other"}}')
        self.assertNotEqual(result.returncode, 0)
        self.assert_no_mutations(calls)

    def test_api_failure_is_not_treated_as_resource_absence(self):
        result, calls = self.run_script(GET_FAILURE='1')
        self.assertNotEqual(result.returncode, 0)
        self.assert_no_mutations(calls)

    def test_render_failure_prevents_cluster_access(self):
        result, calls = self.run_script(INVALID_CHART='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual([c[0] for c in calls], ['helm'])

    def test_fresh_install_does_not_adopt_or_backup(self):
        result, calls = self.run_script(FRESH_INSTALL='1')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.backup.exists())
        self.assertEqual(calls[-1][:3], ['helm', 'upgrade', '--install'])

    def test_failed_upgrade_preserves_backup_without_deleting(self):
        result, calls = self.run_script('--set-string', 'podAnnotations.note=two words', FAIL_UPGRADE='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue((self.backup / 'resources.yaml').exists())
        self.assertEqual((self.backup / 'values.yaml').stat().st_mode & 0o777, 0o600)
        self.assertIn('podAnnotations.note=two words', calls[-1])
        self.assertFalse([c for c in calls if 'delete' in c or 'uninstall' in c or '--atomic' in c])
        backup_index = next(i for i, c in enumerate(calls) if 'yaml' in c)
        first_write = next(i for i, c in enumerate(calls) if c[1] == 'label')
        self.assertLess(backup_index, first_write)

    def test_unsafe_flags_are_rejected_before_cluster_access(self):
        for flag in ['--dry-run', '--atomic', '--force', '--namespace=other']:
            with self.subTest(flag=flag):
                result, calls = self.run_script(flag)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(calls, [])

    def test_existing_recovery_snapshot_is_not_overwritten(self):
        self.backup.mkdir()
        snapshot = self.backup / 'resources.yaml'
        snapshot.write_text('original snapshot')
        result, calls = self.run_script()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(snapshot.read_text(), 'original snapshot')
        self.assert_no_mutations(calls)


if __name__ == '__main__':
    unittest.main()
