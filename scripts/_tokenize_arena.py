import io, sys, os, re

REPLACEMENTS = [
    ('#d7a84f', 'var(--warning)'),
    ('background: #090b0d;', 'background: var(--code-bg);'),
    ('color: #3c4248;', 'color: var(--code-gutter);'),
    ('color: #c9d1d9;', 'color: var(--code-text);'),
    ('background: rgba(255,255,255,.01);', 'background: rgba(var(--primary-rgb), 0.02);'),
    ('color: #444b52;', 'color: var(--code-gutter);'),
    ('background: rgba(80, 220, 140, 0.1);', 'background: var(--success-soft);'),
    ('background: rgba(80, 220, 140, 0.035);', 'background: var(--success-soft);'),
    ('color: #63df96;', 'color: var(--success);'),
    ('background: rgba(255, 90, 90, 0.1);', 'background: var(--danger-soft);'),
    ('background: rgba(255, 90, 90, 0.035);', 'background: var(--danger-soft);'),
    ('color: #ff7272;', 'color: var(--danger);'),
    ('background: #181818;', 'background: var(--bg-elevated);'),
    ('background:#08090c', 'background:var(--bg-sunken)'),
    ('background:#090a0d', 'background:var(--code-bg)'),
]

def process(path):
    with io.open(path, encoding='utf-8') as f:
        s = f.read()
    orig = s
    for a, b in REPLACEMENTS:
        s = s.replace(a, b)
    if s != orig:
        with io.open(path, 'w', encoding='utf-8') as f:
            f.write(s)
        print('updated', path)
    else:
        print('no change', path)

if __name__ == '__main__':
    for p in sys.argv[1:]:
        process(p)
