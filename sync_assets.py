import shutil
import os

repo_public_logo = 'public/logo.png'
ext_assets = 'extension/assets'
ext_sync_assets = '../annotated-extension-w-logos/annotated-extension-w-logos/assets'

# Copy to extension assets
for icon_name in ['icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png']:
    shutil.copyfile(repo_public_logo, os.path.join(ext_assets, icon_name))
    if os.path.exists(ext_sync_assets):
        shutil.copyfile(repo_public_logo, os.path.join(ext_sync_assets, icon_name))

print("Assets synced successfully!")
