import json
from PIL import Image, ImageDraw, ImageChops
S='/tmp/claude-0/-home-user-qadisiyah-field/88dc8c01-5bd2-5aa6-b478-4bdfabedcbd9/scratchpad/fly/'
m=json.load(open(S+'layers.json'))
D=2; PAD=28*D
for q in m['pieces']:
    sec=m['sections'][q['sec']]['id']
    src=Image.open(f"{S}page/{sec}-L{q['lvl']}.png").convert('RGBA')
    x0,y0=round(q['x']*D),round(q['y']*D); w,h=round(q['w']*D),round(q['h']*D)
    crop=Image.new('RGBA',(w,h),(0,0,0,0)); crop.paste(src.crop((x0,y0,x0+w,y0+h)),(0,0))
    rad={'chip-hero':10,'quote':22}.get(q['kind'],q['rad'])*D; rad=min(rad,h/2,w/2)
    mk=Image.new('L',(w*4,h*4),0); ImageDraw.Draw(mk).rounded_rectangle((0,0,w*4-1,h*4-1),radius=rad*4,fill=255); mk=mk.resize((w,h),Image.LANCZOS)
    crop.putalpha(ImageChops.multiply(crop.split()[3],mk))
    out=Image.new('RGBA',(w+2*PAD,h+2*PAD),(0,0,0,0)); out.paste(crop,(PAD,PAD))
    out.save(f"{S}pieces/{q['name']}.png"); q['pw']=q['w']+56; q['ph']=q['h']+56
    q['cx']=q['x']+q['w']/2; q['cy']=q['y']+q['h']/2+m['sections'][q['sec']]['y']
json.dump(m,open(S+'layers.json','w'),indent=1)
print(len(m['pieces']))
