#!/usr/bin/env python3
"""Build the static handbook from its canonical Markdown; no runtime dependencies."""
import hashlib
import html
import json
import math
import re
import shutil
from pathlib import Path
import mistune
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'docs'
GROUPS = [(1,6,'Start with your work'),(7,11,'Understand the hardware'),(12,16,'Live with the laptop'),(17,19,'Make the purchase'),(20,24,'Own it well'),(25,30,'Make your decision')]

def build():
    source = (ROOT/'laptop-buying-guide.md').read_text()
    refs = json.loads((ROOT/'research.json').read_text())['sources']
    parts = re.split(r'<a id="chapter-(\d{2})"></a>\s*\n## \d{2} — ([^\n]+)\n', source)
    assert len(parts) == 91, 'Expected exactly thirty chapters'
    md = mistune.create_markdown(escape=False, plugins=['table','task_lists','url'])
    intro = BeautifulSoup(md(parts[0]), 'html.parser')
    for heading in intro.select('h1,h2'):
        heading.name = 'h3' if heading.name == 'h2' else 'h2'
    chapters, search, fragments = [], [], []
    for i in range(1,len(parts),3):
        num,title,body = parts[i:i+3]
        cid = f'chapter-{num}'
        soup = BeautifulSoup(md(body), 'html.parser')
        words = len(soup.get_text(' ',strip=True).split())
        group = next(g[2] for g in GROUPS if g[0] <= int(num) <= g[1])
        meta = dict(id=cid,num=num,title=title,minutes=max(1,math.ceil(words/220)),group=group)
        chapters.append(meta)
        section = dict(id=cid,chapter=cid,title=title,chapterTitle=title,text='')
        search.append(section)
        for j,element in enumerate(list(soup.children)):
            if getattr(element,'name',None) in ('h3','h4'):
                sid = f'{cid}-section-{j}'
                element['id'] = sid
                section = dict(id=sid,chapter=cid,title=element.get_text(' ',strip=True),chapterTitle=title,text='')
                search.append(section)
            if hasattr(element,'get_text'):
                section['text'] += element.get_text(' ',strip=True)+' '
        for table in soup.find_all('table'):
            wrapper = soup.new_tag('div',attrs={'class':'table-scroll','tabindex':'0','role':'region','aria-label':f'Table in {title}'})
            table.wrap(wrapper)
        for checkbox in soup.select('input[type=checkbox]'):
            parent = checkbox.find_parent('li')
            checkbox['aria-label'] = parent.get_text(' ',strip=True) if parent else 'Checklist item'
        fragments.append(f'<section class="chapter" id="{cid}" aria-labelledby="{cid}-title"><div class="chapter-kicker">CHAPTER {num} / {html.escape(group.upper())} / {meta["minutes"]} MIN READ</div><h2 id="{cid}-title" tabindex="-1">{html.escape(title)}</h2><div class="prose">{soup}</div></section>')
    def link(c):
        return f'<a href="#{c["id"]}"><span>{c["num"]}</span>{html.escape(c["title"])}</a>'
    catalog=[]
    for idx,(start,end,title) in enumerate(GROUPS,1):
        links=''.join('<li>'+link(c)+'</li>' for c in chapters if start<=int(c['num'])<=end)
        catalog.append(f'<div class="chapter-group"><span class="group-number">PART 0{idx}</span><h3>{html.escape(title)}</h3><ul>{links}</ul></div>')
    plain=BeautifulSoup(md(source),'html.parser').get_text(' ',strip=True)
    count=len(plain.split())
    data=json.dumps(dict(chapters=chapters,search=search,words=count),ensure_ascii=False).replace('<','\\u003c')
    output=(ROOT/'index.template.html').read_text()
    replacements={'INTRO':str(intro),'NAV':''.join(link(c) for c in chapters),'CATALOG':''.join(catalog),'CHAPTERS':'\n'.join(fragments),'DATA':data,'WORD_COUNT':f'{round(count/1000)}k'}
    for key,value in replacements.items():output=output.replace('{{'+key+'}}',value)
    assert not re.search(r'\{\{[A-Z_]+\}\}',output),'Unfilled template placeholder'
    page=BeautifulSoup(output,'html.parser')
    ids=[el['id'] for el in page.select('[id]')]
    assert len(ids)==len(set(ids)),'Duplicate HTML IDs'
    for a in page.select('a[href^="#"]'):
        assert a['href'][1:] in ids,a['href']
    for s in refs:assert s['id'].lower() in ids
    assert len(page.select('.chapter'))==30
    OUT.mkdir(exist_ok=True)
    (OUT/'index.html').write_text(output)
    for name in ('styles.css','app.js','laptop-buying-guide.md','research.json'):
        shutil.copyfile(ROOT/name,OUT/name)
    (OUT/'.nojekyll').write_text('')
    (OUT/'favicon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="5" fill="#193f35"/><path d="M7 7h18v15H7zM3 26h26M11 12h10M11 17h7" fill="none" stroke="#e6ecdf" stroke-width="2"/></svg>')
    report=dict(chapters=30,sources=len(refs),words=count,search_sections=len(search),markdown_sha256=hashlib.sha256(source.encode()).hexdigest(),html_bytes=len(output.encode()))
    (OUT/'build-info.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':build()
