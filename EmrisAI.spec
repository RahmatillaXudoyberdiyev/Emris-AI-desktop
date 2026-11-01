a = Analysis(
    ['run_app.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('frontend/dist', 'frontend/dist'),
        ('backend/prompts', 'backend/prompts'),
        ('backend/favicon.ico', 'backend'),
        ('backend/favicon.ico', '.')
    ],
    hiddenimports=[
        'backend',
        'backend.main',
        'backend.agent',
        'backend.database',
        'backend.terminal',
        'backend.gateway',
        'backend.server',
        'backend.workspace_tools',
        'backend.retrievers',
        'backend.prompt_loader',
        'webview',
        'clr'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='EmrisAI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['backend/favicon.ico'],
    version='version_info.txt',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='EmrisAI',
)
