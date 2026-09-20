"""Package current local artifacts, then verify every ZIP entry against disk."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
EXCLUDE = {'__pycache__', 'node_modules', '.git', '.DS_Store'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def package(path, entries):
    # Write a sibling temporary file; an interrupted build never truncates a ZIP.
    temp = path.with_suffix('.zip.tmp')
    with ZipFile(temp, 'w', ZIP_DEFLATED, compresslevel=9) as archive:
        for source, name in entries:
            archive.write(source, name)
    with ZipFile(temp) as archive:
        assert archive.testzip() is None, 'Corrupt ZIP entry'
        for source, name in entries:
            assert archive.read(name) == source.read_bytes(), name
    temp.replace(path)
    return {'path': path.name, 'files': len(entries), 'bytes': path.stat().st_size, 'sha256': digest(path)}


def main():
    version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
    name = f'ai-atlas-v{version}'
    files = sorted(p for p in ROOT.rglob('*') if p.is_file() and not any(part in EXCLUDE for part in p.relative_to(ROOT).parts))
    source = [(p, (Path(name) / p.relative_to(ROOT)).as_posix()) for p in files]
    deploy = [(p, p.relative_to(ROOT / 'deploy').as_posix()) for p in files if ROOT / 'deploy' in p.parents]
    reports = [package(ROOT.parent / f'{name}.zip', source), package(ROOT.parent / f'{name}-deploy.zip', deploy)]
    proof = {'version': version, 'zipEntriesVerifiedAgainstDisk': True, 'packages': reports,
             'products': {str(p.relative_to(ROOT)): {'bytes': p.stat().st_size, 'sha256': digest(p)}
                          for p in [ROOT / 'index.html', *sorted((ROOT / 'deploy/site').rglob('*'))] if p.is_file()}}
    target = ROOT.parent / f'{name}-delivery-check.json'
    target.write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(proof, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
