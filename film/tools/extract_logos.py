# Cut each logo out of the sheet screenshots and turn it into a white knockout (alpha = distance from cell background).
import sys, numpy as np
from PIL import Image
up, out = sys.argv[1], sys.argv[2]
FIN = up + '/9772ebf9-image.png'; BNK = up + '/399d8a6d-image.png'; ENBD = sys.argv[3]
s = 1320/921
# (id, file, x0,y0,x1,y1 in 921-wide display coords)
crops = [
 ('01_albilad', BNK, 186,345,732,546), ('02_aljazira', BNK, 186,554,728,764), ('03_alinma', BNK, 186,772,706,976),
 ('04_anb', BNK, 186,986,600,1192), ('05_alrajhi', BNK, 186,1200,732,1404), ('06_snb', BNK, 188,1412,592,1620),
 ('07_riyad', BNK, 186,1630,732,1832),
 ('09_raya', FIN, 364,426,700,543), ('11_nama', FIN, 364,548,700,669), ('12_tarabut', FIN, 364,674,700,793),
 ('14_taajeer', FIN, 362,924,704,1042), ('15_nfh', FIN, 362,1047,704,1167), ('16_tamam', FIN, 364,1172,700,1291),
 ('17_tamweel', FIN, 364,1297,700,1416), ('18_alj', FIN, 364,1421,700,1541), ('19_yanal', FIN, 362,1546,704,1665),
 ('20_alyusr', FIN, 364,1670,701,1789),
]
def knock(im, name):
    a = np.asarray(im.convert('RGB')).astype(float)
    b = np.concatenate([a[:3].reshape(-1,3), a[-3:].reshape(-1,3), a[:, :3].reshape(-1,3), a[:, -3:].reshape(-1,3)])
    bg = np.median(b, axis=0)
    d = np.sqrt(((a-bg)**2).sum(-1))
    al = np.clip((d-18)/70, 0, 1)
    ys, xs = np.where(al > .15)
    al = al[ys.min():ys.max()+1, xs.min():xs.max()+1]
    o = np.zeros(al.shape+(4,), np.uint8); o[..., :3] = 255; o[..., 3] = (al*255).astype(np.uint8)
    Image.fromarray(o).save(f'{out}/{name}.png'); print(name, bg.astype(int), al.shape)
for n, f, x0, y0, x1, y1 in crops:
    knock(Image.open(f).crop(tuple(round(v*s) for v in (x0, y0, x1, y1))), n)
knock(Image.open(ENBD), '08_emiratesnbd')
