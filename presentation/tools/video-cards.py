MARK='<svg viewBox="0 0 28 28" fill="none"><path d="M14 1.6 20.3 8 14 14.4 7.7 8 14 1.6Z" fill="#FF6A00"/><path d="M6.4 9.3 12.7 15.7 6.4 22.1.1 15.7 6.4 9.3Z" fill="#FF3D00"/><path d="M21.6 9.3 27.9 15.7 21.6 22.1 15.3 15.7 21.6 9.3Z" fill="#FF9A2E"/></svg>'
BIG=MARK.replace('<svg ','<svg style="width:96px;height:96px" ')
HEAD='''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=Inter:wght@400;500&family=Instrument+Serif:ital@1&family=IBM+Plex+Mono:wght@500&display=block">
<style>
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#070200;color:#fff;font-family:Inter,sans-serif}
.bg{position:absolute;inset:-10%;background:radial-gradient(60% 55% at 50% 58%,rgba(255,110,30,.22),transparent 70%),radial-gradient(40% 40% at 80% 20%,rgba(255,60,0,.10),transparent 70%);animation:drift 7s ease-in-out both}
@keyframes drift{from{transform:scale(1.12) translateY(20px)}to{transform:scale(1) translateY(0)}}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.kick{font:500 22px/1 "IBM Plex Mono",monospace;letter-spacing:.32em;text-transform:uppercase;color:#ff9a4a;opacity:0;animation:up .9s cubic-bezier(.22,1,.36,1) .25s both}
h1{margin:34px 0 0;font:700 118px/1.02 "Inter Tight",sans-serif;letter-spacing:-.045em;max-width:1760px}
h1 span{display:inline-block;opacity:0;transform:translateY(60px);filter:blur(12px);animation:rise 1.1s cubic-bezier(.16,1,.3,1) both}
h1 em{font-family:"Instrument Serif",serif;font-weight:400;font-style:italic;letter-spacing:-.02em}h1 em span{background:linear-gradient(90deg,#ffc58a,#ff6a00);-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.06em}
.sub{margin-top:40px;font:400 30px/1.4 Inter,sans-serif;color:rgba(255,255,255,.72);opacity:0;animation:up 1s cubic-bezier(.22,1,.36,1) both}
.line{width:0;height:2px;margin-top:48px;background:linear-gradient(90deg,transparent,#ff6a00,transparent);animation:line 1.6s cubic-bezier(.22,1,.36,1) both}
.brand{position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:16px;font:600 30px/1 "Inter Tight",sans-serif;letter-spacing:-.02em;opacity:0;animation:up .8s ease .1s both}
.brand svg{width:44px;height:44px}.brand small{display:block;font:500 17px/1.3 Inter;color:rgba(255,255,255,.55);letter-spacing:0;margin-top:4px}
@keyframes up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes rise{to{opacity:1;transform:none;filter:none}}
@keyframes line{to{width:820px}}
</style></head><body><div class="bg"></div>'''
def words(t, d0, step):
    return " ".join(f'<span style="animation-delay:{d0+k*step:.2f}s">{w}</span>' for k, w in enumerate(t.split(" ")))
intro = HEAD + ('<div class="brand">' + MARK + '<div>Sub-Dealer Portfolio<small>Riyadh · KSA field census</small></div></div>'
  '<div class="wrap"><p class="kick">Field census 001 · Riyadh · 2026</p>'
  '<h1>' + words("520 showrooms. Two districts.", .55, .12) + '<br><em>' + words("Every door, counted.", 1.25, .14) + '</em></h1>'
  '<div class="line" style="animation-delay:1.9s"></div>'
  '<p class="sub" style="animation-delay:2.2s">Al Qadisiyah &amp; Al Shifa · Riyadh’s independent car market</p></div></body></html>')
outro = HEAD + ('<div class="wrap"><div style="opacity:0;animation:up .9s cubic-bezier(.22,1,.36,1) .2s both">' + BIG + '</div>'
  '<h1 style="font-size:96px;margin-top:36px">' + words("Riyadh Sub-Dealer Portfolio", .45, .1) + '</h1>'
  '<p class="sub" style="animation-delay:1.2s">Al Qadisiyah &amp; Al Shifa field census · 520 showrooms · 31,869 cars</p>'
  '<div class="line" style="animation-delay:1.6s"></div>'
  '<p class="kick" style="animation-delay:2.1s;margin-top:44px;font-size:18px;color:rgba(255,255,255,.55)">Every figure from our own count · sources in the data room</p></div></body></html>')
open("portfolio/card-intro.html","w").write(intro); open("portfolio/card-outro.html","w").write(outro)
