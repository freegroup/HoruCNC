# -*- mode: python ; coding: utf-8 -*-
options = [('u', None, 'OPTION')]

block_cipher = None


a = Analysis(['./src/main.py'],
             pathex=[
                '/Users/d023280/Documents/workspace/HoruCNC'
                ],
             binaries=[],
             datas=[
                ('resources', 'resources')
             ],
             hiddenimports= [
                "PySide2.QtXml",
                "PySide2.QtUiTools",
                "shiboken2",
                "scipy.special.cython_special"
             ],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher,
             noarchive=False)

pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          options,
          exclude_binaries=True,
          name='HoruCNC',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          console=False )

coll = COLLECT(exe,
               a.binaries,
               a.zipfiles,
               a.datas,
               strip=False,
               upx=True,
               upx_exclude=[],
               name='HoruCNC')

app = BUNDLE(coll,
         name='HoruCNC.app',
         icon='./resources/HoruCNC.icns',
         bundle_identifier=None)