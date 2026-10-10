"""Compatibility entry point: the deployment uses the Node.js builder."""
import subprocess
from pathlib import Path
subprocess.run(['node', str(Path(__file__).with_suffix('.mjs'))], check=True)
