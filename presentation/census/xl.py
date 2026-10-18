import openpyxl, warnings
warnings.filterwarnings("ignore")
def load(path):
    wb=openpyxl.load_workbook(path, data_only=True)
    def table(name, hdr):
        ws=[w for w in wb.worksheets if w.title.strip().startswith(name)][0]; rows=[list(r) for r in ws.iter_rows(values_only=True)]
        h=[(str(x).strip() if x is not None else f"c{i}") for i,x in enumerate(rows[hdr])]; out=[]
        for r in rows[hdr+1:]:
            if not any(c not in (None,"") for c in r): continue
            out.append({h[i]: r[i] for i in range(min(len(h),len(r)))})
        return h,out
    return wb, table
