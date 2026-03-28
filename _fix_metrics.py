p = '/Users/angel/Documents/Thallus/api/routers/metrics.py'
lines = open(p).readlines()
with open(p, 'w') as f:
    f.writelines(lines[:179])
print(f"Done. Wrote {len(lines[:179])} lines.")
