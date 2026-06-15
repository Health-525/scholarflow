import json, sys
d = json.loads(sys.stdin.read())
c = d.get('courses', [])
print(f'Total courses: {len(c)}')
wd = set()
for x in c:
    wd.add(x.get('weekday', 0))
print(f'Weekdays: {sorted(wd)}')
for w in sorted(wd):
    wc = [x for x in c if x.get('weekday') == w]
    print(f'  Day {w}: {len(wc)} courses')
    for x in wc:
        print(f'    {x.get("title","")} P{x.get("periods",[])} W{x.get("weeks","")} @ {x.get("location","")}')
