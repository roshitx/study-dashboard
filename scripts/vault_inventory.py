#!/usr/bin/env python3
"""Read-only ZIP inventory. No extraction, plugin execution, or provider calls."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import zipfile

MAX_ARCHIVE_BYTES = 128 * 1024 * 1024
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_ENTRIES = 20000

def inventory(path):
    records, warnings, seen = [], [], {}
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > MAX_ENTRIES or sum(i.file_size for i in entries) > MAX_ARCHIVE_BYTES:
            raise ValueError('ARCHIVE_LIMIT_EXCEEDED')
        for item in entries:
            name = item.filename
            parts = PurePosixPath(name).parts
            if name.startswith('/') or '\\' in name or '..' in parts or re.match(r'^[A-Za-z]:', name):
                raise ValueError('UNSAFE_ARCHIVE_PATH')
            if stat.S_ISLNK(item.external_attr >> 16):
                raise ValueError('SYMLINK_REJECTED')
            if item.is_dir() or '__MACOSX' in parts or name.endswith('.DS_Store'):
                continue
            if item.file_size > MAX_FILE_BYTES:
                raise ValueError('FILE_LIMIT_EXCEEDED')
            if not name.endswith('.md'):
                continue
            data = archive.read(item)
            digest = hashlib.sha256(data).hexdigest()
            if name in seen:
                if seen[name] != digest:
                    raise ValueError('DUPLICATE_PATH_CONFLICT')
                warnings.append({'path': name, 'code': 'IDENTICAL_DUPLICATE'})
                continue
            seen[name] = digest
            try:
                text = data.decode('utf-8-sig')
            except UnicodeDecodeError:
                warnings.append({'path': name, 'code': 'INVALID_UTF8'})
                continue
            fm = re.match(r'^---\r?\n(.*?)\r?\n---(?:\r?\n|$)', text, re.S)
            title = re.search(r'^# (.+)$', text, re.M)
            records.append({'path': name, 'sha256': digest, 'bytes': len(data),
                            'title': title.group(1) if title else PurePosixPath(name).stem,
                            'frontmatterRaw': fm.group(1) if fm else None})
    return {'schemaVersion': 1, 'source': 'snapshot', 'markdownCount': len(records),
            'courseHubCount': sum(r['path'].endswith('/00 - Course Hub.md') for r in records),
            'notes': records, 'warnings': warnings}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--output', type=Path, default=Path('.local/vault-inventory.json'))
    args = parser.parse_args()
    result = inventory(args.archive)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'markdownCount': result['markdownCount'], 'courseHubCount': result['courseHubCount'], 'warningCount': len(result['warnings'])}))

if __name__ == '__main__':
    main()
