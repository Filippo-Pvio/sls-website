"""Apply only to a complete export of the currently deployed frag-sls source."""
import hashlib
import pathlib
import shutil
import sys

root = pathlib.Path(sys.argv[1]).resolve()
patch = pathlib.Path(__file__).parent
original = root / 'api/ask.js'
expected = '454701a9d00793642b5680941b3a0b5e7df75149'
if hashlib.sha1(original.read_bytes()).hexdigest() != expected:
    raise SystemExit('STOP: api/ask.js does not match the deployed source. Review before applying.')
if not (root / 'lib/answer.js').is_file() or not (root / 'data/knowledge.json').is_file():
    raise SystemExit('STOP: incomplete backend export.')
legacy = root / 'lib/legacy-handler.cjs'
if legacy.exists():
    raise SystemExit('STOP: legacy backup already exists. Do not overwrite it.')
shutil.copyfile(original, legacy)
for relative in ('api/ask.js', 'lib/sia-openai.mjs', 'lib/sia-conversation.mjs'):
    shutil.copyfile(patch / relative, root / relative)
print('Applied dialogue wrapper; existing company knowledge and handler preserved.')
