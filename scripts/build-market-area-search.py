"""Rebuild the shared market cards and regional search data together."""
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[1]
def build():
    subprocess.run(['node',str(ROOT/'scripts/build-market-directory.mjs')],cwd=ROOT,check=True)
if __name__=='__main__':
    build()
