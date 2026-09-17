with open('app/[username]/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import { useState, useEffect, use } } from "react";', 'import { useState, useEffect, use } from "react";')

with open('app/[username]/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
