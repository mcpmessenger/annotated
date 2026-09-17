import re

try:
    with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/app/about/page.tsx', 'r', encoding='utf-8') as f:
        text = f.read()

    text = text.replace("href=\"#\"", "href=\"mailto:magnetarsenti@gmail.com\"")

    with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/app/about/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
except:
    pass

try:
    with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/app/privacy/page.tsx', 'r', encoding='utf-8') as f:
        text = f.read()

    text = text.replace("href=\"#\"", "href=\"mailto:magnetarsenti@gmail.com\"")

    with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/app/privacy/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
except:
    pass
