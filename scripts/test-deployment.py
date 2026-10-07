"""Exercise release state and rollback with a fake Docker CLI, never a live VPS."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
NEW = "a" * 40
OLD = "b" * 40


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.release = self.root / "releases" / NEW
        self.release.mkdir(parents=True)
        shutil.copy(ROOT / "deploy/deploy.sh", self.release / "deploy.sh")
        (self.root / ".env").write_text("POSTGRES_PASSWORD=test\n")
        for version in (NEW, OLD):
            directory = self.root / "releases" / version
            directory.mkdir(exist_ok=True)
            (directory / "release.env").write_text("BACKEND_IMAGE=test\n")
            (directory / "compose.yml").write_text("services: {}\n")
        self.bin = self.root / "bin"
        self.bin.mkdir()
        docker = self.bin / "docker"
        docker.write_text(
            '#!/bin/bash\nset -eu\n'
            'echo "$*" >> "$DEPLOY_TEST_LOG"\n'
            'if [[ "$1" == login ]]; then cat >/dev/null; fi\n'
            'if [[ "${FAIL_NEW:-}" == 1 && "$*" == *"releases/$NEW_SHA"* '
            '&& "$*" == *" up "* ]]; then exit 1; fi\n'
        )
        docker.chmod(0o755)
        self.env = {
            **os.environ,
            "PATH": f"{self.bin}:{os.environ['PATH']}",
            "TMPDIR": str(self.root),
            "DEPLOY_TEST_LOG": str(self.root / "docker.log"),
            "NEW_SHA": NEW,
        }

    def run_deploy(self):
        return subprocess.run(
            ["bash", str(self.release / "deploy.sh"), "test-owner"],
            input="temporary-test-token",
            text=True,
            capture_output=True,
            env=self.env,
            check=False,
        )

    def test_healthy_release_becomes_current_and_removes_login(self):
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / "current-release").read_text().strip(), NEW)
        self.assertFalse(list(self.root.glob("tmp.*")))

    def test_failed_update_restores_previous_release(self):
        (self.root / "current-release").write_text(OLD + "\n")
        self.env["FAIL_NEW"] = "1"
        result = self.run_deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / "current-release").read_text().strip(), OLD)
        calls = (self.root / "docker.log").read_text().splitlines()
        self.assertTrue(any(OLD in call and " up " in call for call in calls))
        self.assertFalse(list(self.root.glob("tmp.*")))

    def test_failed_first_release_does_not_claim_success(self):
        self.env["FAIL_NEW"] = "1"
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertFalse((self.root / "current-release").exists())

    def test_missing_configuration_does_not_start_containers(self):
        (self.root / ".env").unlink()
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertFalse((self.root / "docker.log").exists())


if __name__ == "__main__":
    unittest.main()
