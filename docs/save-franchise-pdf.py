"""Create a portable PDF with standard fonts, without a browser or packages."""
from pathlib import Path
import html, re, textwrap

root=Path(__file__).resolve().parent
source=(root/'Company-Franchise-Blueprint.html').read_text(encoding='utf-8')
WIDTH,HEIGHT=595.28,841.89
M=42
commands=[]
rendered=[]
y=0
def plain(s):
    s=re.sub(r'<br\s*/?>','\n',s)
    s=html.unescape(re.sub('<[^>]+>','',s))
    return s.translate(str.maketrans({'→':'->','└':'+','├':'+','─':'-','│':'|','’':"'",'‘':"'",'“':'"','”':'"','–':'-','—':'-','₹':'INR '}))
def encoded(s):return s.encode('cp1252','replace').decode('cp1252').replace('\\','\\\\').replace('(','\\(').replace(')','\\)')
def text(s,x,yy,size=9,font='F1',color='0.11 0.24 0.22'):
    commands.append(f'BT /{font} {size} Tf {color} rg 1 0 0 1 {x:.2f} {yy:.2f} Tm ({encoded(s)}) Tj ET')
def rect(x,yy,w,h,color='0.95 0.97 0.93'):
    commands.append(f'{color} rg {x:.2f} {yy:.2f} {w:.2f} {h:.2f} re f')
def line(x,yy,w):commands.append(f'0.84 0.88 0.82 RG 0.6 w {x:.2f} {yy:.2f} m {x+w:.2f} {yy:.2f} l S')
def wrap(s,width):return [l for p in s.split('\n') for l in (textwrap.wrap(p,width=width,break_long_words=False,break_on_hyphens=False) or [''])]
def begin(title,label,subtitle):
    global commands,y
    commands=[]
    text('COMPANY & FRANCHISE LOGISTICS',M,HEIGHT-39,8.8,'F2')
    text('11 NOV 2026  /  BLUEPRINT v2.0',360,HEIGHT-39,7,'F1','0.45 0.53 0.43')
    line(M,HEIGHT-49,WIDTH-2*M)
    text(label,M,HEIGHT-71,8,'F2','0.36 0.49 0.29')
    titlelines=wrap(title,43)
    yy=HEIGHT-100
    for l in titlelines:text(l,M,yy,24,'F2');yy-=28
    yy-=1
    for l in wrap(subtitle,98):text(l,M,yy,9.2,'F1','0.43 0.50 0.40');yy-=13
    y=yy-12
def finish():rendered.append(list(commands))
for page in re.findall(r'<section class="page">(.*?)</section>',source,re.S):
    title=plain(re.search(r'<h1>(.*?)</h1>',page,re.S)[1])
    label=plain(re.search(r'<div class="label">(.*?)</div>',page,re.S)[1])
    subtitle=plain(re.search(r'<p class="subtitle">(.*?)</p>',page,re.S)[1])
    begin(title,label,subtitle)
    body=page.split('<div class="body">',1)[1].split('<footer>',1)[0]
    blocks=re.findall(r'<pre class="tree">.*?</pre>|<div class="note">.*?</div>|<table>.*?</table>',body,re.S)
    for block in blocks:
        if block.startswith('<pre'):
            lines=plain(block).strip('\n').splitlines()
            height=len(lines)*11.2+18
            if y-height<52:raise RuntimeError('Tree exceeds page: '+title)
            rect(M,y-height,WIDTH-2*M,height)
            ty=y-13
            for l in lines:text(l,M+10,ty,8.6,'F3');ty-=11.2
            y-=height+9
        elif block.startswith('<div'):
            heading=plain(re.search(r'<strong>(.*?)</strong>',block,re.S)[1])
            content=plain(re.search(r'<p>(.*?)</p>',block,re.S)[1])
            lines=wrap(content,106)
            height=24+len(lines)*11.6
            if y-height<52:raise RuntimeError('Note exceeds page: '+title+' / '+heading)
            rect(M,y-height,WIDTH-2*M,height,'0.95 0.97 0.94');rect(M,y-height,2,height,'0.53 0.65 0.43')
            text(heading,M+9,y-12,9,'F2')
            ty=y-26
            for l in lines:text(l,M+9,ty,8.8);ty-=11.6
            y-=height+7
        else:
            rows=re.findall(r'<tr>(.*?)</tr>',block,re.S)
            cols=len(re.findall(r'<th>',rows[0]))
            widths=[(WIDTH-2*M)*v for v in ([.40,.30,.30] if cols==3 else [.29,.71])]
            for ri,row in enumerate(rows):
                cells=[plain(c) for c in re.findall(r'<t[hd]>(.*?)</t[hd]>',row,re.S)]
                wrapped=[wrap(c,max(14,int((widths[i]-12)/4.3))) for i,c in enumerate(cells)]
                height=max(map(len,wrapped))*11.3+11
                if y-height<52:raise RuntimeError('Table exceeds page: '+title)
                if ri==0 or ri%2==0:rect(M,y-height,WIDTH-2*M,height,'0.91 0.94 0.88' if ri==0 else '0.97 0.98 0.95')
                x=M
                for i,lines in enumerate(wrapped):
                    ty=y-12
                    for l in lines:text(l,x+6,ty,8.3,'F2' if ri==0 else 'F1');ty-=11.3
                    x+=widths[i]
                y-=height;line(M,y,WIDTH-2*M)
            y-=9
    finish()

objects=[]
def add(value):objects.append(value);return len(objects)
catalog=add('');pagesid=add('')
fonts=[add('<< /Type /Font /Subtype /Type1 /BaseFont /'+name+' /Encoding /WinAnsiEncoding >>') for name in ['Helvetica','Helvetica-Bold','Courier']]
pageids=[]
for n,cmds in enumerate(rendered,1):
    commands=cmds
    line(M,36,WIDTH-2*M)
    text('Company & franchise blueprint | Discussion draft',M,24,7,'F1','0.45 0.53 0.42')
    text(f'{n:02d} / {len(rendered):02d}',505,24,7,'F2')
    content='\n'.join(commands).encode('cp1252','replace')
    stream=add(b'<< /Length '+str(len(content)).encode()+b' >>\nstream\n'+content+b'\nendstream')
    pageids.append(add(f'<< /Type /Page /Parent {pagesid} 0 R /MediaBox [0 0 {WIDTH} {HEIGHT}] /Resources << /Font << /F1 {fonts[0]} 0 R /F2 {fonts[1]} 0 R /F3 {fonts[2]} 0 R >> >> /Contents {stream} 0 R >>'))
objects[catalog-1]=f'<< /Type /Catalog /Pages {pagesid} 0 R >>'
objects[pagesid-1]=f'<< /Type /Pages /Count {len(pageids)} /Kids ['+' '.join(f'{p} 0 R' for p in pageids)+'] >>'
pdf=bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');offsets=[0]
for i,obj in enumerate(objects,1):
    offsets.append(len(pdf));pdf.extend(f'{i} 0 obj\n'.encode());pdf.extend(obj if isinstance(obj,bytes) else obj.encode('ascii'));pdf.extend(b'\nendobj\n')
xref=len(pdf);pdf.extend(f'xref\n0 {len(objects)+1}\n0000000000 65535 f \n'.encode())
for offset in offsets[1:]:pdf.extend(f'{offset:010d} 00000 n \n'.encode())
pdf.extend(f'trailer\n<< /Size {len(objects)+1} /Root {catalog} 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
out=root.parent/'PDFs-To-Share'/'Company-Franchise-Blueprint.pdf';out.parent.mkdir(exist_ok=True);out.write_bytes(pdf)
assert len(pageids)==5 and out.read_bytes().startswith(b'%PDF-')
print(f'Saved actual PDF: {out}\nVerified: {len(pageids)} pages; {len(pdf)} bytes; all content fits inside page boundaries.')
