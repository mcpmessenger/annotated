with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/app/install/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("href=\"#\"", "href=\"https://github.com/mcpmessenger/annotated\" target=\"_blank\"")

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/app/install/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
