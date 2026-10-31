import json, math, statistics as st
d = json.load(open('../../site/data.json'))['d']
pts = [(r[3], r[9], r[10], r[5] or 0) for r in d]
kx = math.cos(math.radians(24.77))
def hull(ps):
    ps = sorted(set(ps))
    def cr(o,a,b): return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    lo=[];up=[]
    for p in ps:
        while len(lo)>=2 and cr(lo[-2],lo[-1],p)<=0: lo.pop()
        lo.append(p)
    for p in reversed(ps):
        while len(up)>=2 and cr(up[-2],up[-1],p)<=0: up.pop()
        up.append(p)
    return lo[:-1]+up[:-1]
out=[]; hulls=[]
SC=min(640/(2.0731/111),600/(1.5665/111))
boxes = {0:(560,600,640,600), 1:(1360,600,640,600)}
for dist in (0,1):
    loc=[p for p in pts if p[0]==dist and p[1]]
    X=[p[2]*kx for p in loc]; Y=[-p[1] for p in loc]
    mx,my=st.median(X),st.median(Y)
    r=[math.hypot(x-mx,y-my) for x,y in zip(X,Y)]
    lim=sorted(r)[int(len(r)*.97)]
    keep=[i for i in range(len(loc)) if r[i]<=lim]
    print(dist, len(loc), 'kept', len(keep), 'span km', (max(X[i] for i in keep)-min(X[i] for i in keep))*111, (max(Y[i] for i in keep)-min(Y[i] for i in keep))*111)
    xs=[X[i] for i in keep]; ys=[Y[i] for i in keep]
    x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    cx,cy,W,H=boxes[dist]
    s=SC
    proj=lambda x,y:(cx+(x-(x0+x1)/2)*s, cy+(y-(y0+y1)/2)*s)
    P=[]
    for i,p in enumerate(loc):
        x,y=X[i],Y[i]
        if r[i]>lim:  # pull outliers to the edge of the trimmed cloud
            f=lim/r[i]; x=mx+(x-mx)*f; y=my+(y-my)*f
        px,py=proj(x,y); P.append([round(px,1),round(py,1),dist,int(p[3])])
    out+=P
    h=hull([(q[0],q[1]) for q in P]); hc=(sum(a for a,b in h)/len(h), sum(b for a,b in h)/len(h))
    h=[(hc[0]+(a-hc[0])*1.0+ (a-hc[0])/max(1,math.hypot(a-hc[0],b-hc[1]))*28, hc[1]+(b-hc[1])+(b-hc[1])/max(1,math.hypot(a-hc[0],b-hc[1]))*28) for a,b in h]
    hulls.append([[round(a,1),round(b,1)] for a,b in h]); print('hull', len(h), 'scale km/px', 111/s)
allinv = sorted([p[3] for p in pts if p[3]], reverse=True)
open('data.js','w').write('window.D='+json.dumps({'p':out,'h':hulls,'inv':allinv})+';')
print(len(out), sum(allinv), len(allinv), max(allinv))
