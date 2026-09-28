# Builds src/data/moscowDistricts.json, the map of Moscow for «Карта районов» and «Виртуальный мэр»:
# every district of the nine okrugs inside MKAD and just beyond it (no Zelenograd, no New Moscow) with its name,
# okrug and a label point; the Moskva and the big ponds, the large parks and forests, the metro lines in their colours.
#
#   python scripts/moscow-districts.py [--cache DIR]
#
# Needs shapely. Downloads four Overpass responses into the cache folder (kept for reruns).
# Data: © OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright).
#
# Coordinates are kilometres from the Kremlin in SVG orientation (x to the east, y to the south), rounded to 10 m.
import argparse, json, math, os, tempfile, time, urllib.error, urllib.parse, urllib.request
import shapely
from shapely.geometry import LineString, Polygon, box
from shapely.ops import linemerge, polygonize, polylabel, unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'src', 'data', 'moscowDistricts.json')
OKRUG_IDS = [162903, 226149, 446092, 1252558, 1278703, 1282181, 1304596, 1320234, 2162196]
BBOX = '[bbox:55.51,37.32,55.96,37.97]'
QUERIES = {
    'admin-geom.json': f'[out:json][timeout:300];rel(id:{",".join(map(str, OKRUG_IDS))})->.ok;.ok out geom;'
    '.ok map_to_area->.oka;rel(area.oka)["boundary"="administrative"]["admin_level"="8"];out geom;',
    'water.json': f'[out:json][timeout:400]{BBOX};(way["natural"="water"](if: length() > 800);relation["natural"="water"];'
    'way["waterway"="riverbank"](if: length() > 800);relation["waterway"="riverbank"];);out geom;',
    'green.json': f'[out:json][timeout:400]{BBOX};(way["leisure"="park"](if: length() > 1500);relation["leisure"="park"];'
    'way["landuse"="forest"](if: length() > 1500);relation["landuse"="forest"];way["natural"="wood"](if: length() > 1500);'
    'relation["natural"="wood"];);out geom;',
    'metro.json': '[out:json][timeout:300][bbox:55.49,37.3,55.97,37.97];relation["route"="subway"];out geom;',
}
LAT0, LON0 = 55.7520, 37.6175  # the Kremlin
KX = 111.320 * math.cos(math.radians(LAT0))
KY = 110.574


def proj(lon, lat):
    return ((lon - LON0) * KX, -(lat - LAT0) * KY)


SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']


def fetch(cache):
    os.makedirs(cache, exist_ok=True)
    for name, query in QUERIES.items():
        path = os.path.join(cache, name)
        if os.path.exists(path):
            continue
        data = urllib.parse.urlencode({'data': query}).encode()
        # Overpass limits how often one address may ask: wait and retry, then try the mirror.
        for attempt in range(8):
            server = SERVERS[attempt % len(SERVERS)]
            print('downloading', name, 'from', server, flush=True)
            try:
                req = urllib.request.Request(server, data, {'User-Agent': 'MosGorBudget map build'})
                with urllib.request.urlopen(req, timeout=900) as r:
                    body = r.read()
                with open(path, 'wb') as f:
                    f.write(body)
                break
            except urllib.error.HTTPError as err:
                if err.code not in (429, 502, 503, 504):
                    raise
                time.sleep(45)


def load(cache, name):
    return json.load(open(os.path.join(cache, name), encoding='utf-8'))['elements']


def polys(g):
    if g is None or g.is_empty:
        return []
    if g.geom_type == 'Polygon':
        return [g]
    if g.geom_type in ('MultiPolygon', 'GeometryCollection'):
        return [p for q in g.geoms for p in polys(q)]
    return []


def way_line(w):
    return LineString([proj(p['lon'], p['lat']) for p in w['geometry']]) if len(w.get('geometry', [])) > 1 else None


def element_polygon(e):
    """A way or a multipolygon relation as a shapely (multi)polygon."""
    if e['type'] == 'way':
        pts = [proj(p['lon'], p['lat']) for p in e.get('geometry', [])]
        return Polygon(pts).buffer(0) if len(pts) > 3 else None
    outer, inner = [], []
    for m in e.get('members', []):
        if m.get('type') != 'way' or len(m.get('geometry', [])) < 2:
            continue
        (inner if m.get('role') == 'inner' else outer).append(way_line(m))
    if not outer:
        return None
    shell = unary_union(list(polygonize(linemerge([l for l in outer if l]))))
    holes = unary_union(list(polygonize(linemerge([l for l in inner if l])))) if inner else None
    return (shell.difference(holes) if holes is not None and not holes.is_empty else shell).buffer(0)


def path(g, digits=2):
    """SVG path data for a (multi)polygon: every ring closed, 10 m precision, relative moves to keep it short."""
    out = []
    for p in polys(g):
        for ring in [p.exterior, *p.interiors]:
            pts = [(round(x, digits), round(y, digits)) for x, y in ring.coords[:-1]]
            if len(pts) < 3:
                continue
            seg = [f'M{pts[0][0]:g} {pts[0][1]:g}']
            px, py = pts[0]
            rel = []
            for x, y in pts[1:]:
                dx, dy = round(x - px, digits), round(y - py, digits)
                if dx or dy:
                    rel.append(f'{dx:g} {dy:g}')
                px, py = x, y
            out.append(seg[0] + 'l' + ' '.join(rel) + 'z')
    return ''.join(out)


def line_path(g, digits=2):
    out = []
    for l in ([g] if g.geom_type == 'LineString' else list(getattr(g, 'geoms', []))):
        pts = [(round(x, digits), round(y, digits)) for x, y in l.coords]
        if len(pts) < 2:
            continue
        rel, (px, py) = [], pts[0]
        for x, y in pts[1:]:
            dx, dy = round(x - px, digits), round(y - py, digits)
            if dx or dy:
                rel.append(f'{dx:g} {dy:g}')
            px, py = x, y
        out.append(f'M{pts[0][0]:g} {pts[0][1]:g}l' + ' '.join(rel))
    return ''.join(out)


def main(cache):
    fetch(cache)
    okrugs, districts = [], []
    for e in load(cache, 'admin-geom.json'):
        t = e.get('tags', {})
        g = element_polygon(e)
        if g is None or g.is_empty:
            continue
        (okrugs if t.get('admin_level') == '5' else districts).append((t.get('name', ''), t.get('ref', ''), g))
    city = unary_union([g for _, _, g in okrugs])
    items = []
    for name, _, g in districts:
        inside = g.intersection(city)
        if inside.area < 0.5 * g.area or inside.area < 0.3:
            continue
        okrug = max(okrugs, key=lambda o: o[2].intersection(inside).area)
        short = name.replace('район ', '').replace(' район', '').replace('муниципальный округ ', '').strip()
        simple = inside.simplify(0.03, preserve_topology=True)
        label = inside.representative_point() if inside.geom_type != 'Polygon' else polylabel(inside, tolerance=0.05)
        items.append({'name': short, 'okrug': okrug[1] or okrug[0], 'd': path(simple), 'c': [round(label.x, 2), round(label.y, 2)], 'area': round(inside.area, 2)})
    items.sort(key=lambda d: d['name'])
    frame = box(*city.bounds).buffer(1.5)

    water = []
    for e in load(cache, 'water.json'):
        g = element_polygon(e)
        if g is None or g.is_empty:
            continue
        g = g.intersection(frame)
        if g.area > 0.02:
            water.append(g)
    water_all = unary_union(water).simplify(0.015, preserve_topology=True)

    green = []
    for e in load(cache, 'green.json'):
        g = element_polygon(e)
        if g is None or g.is_empty:
            continue
        g = g.intersection(city)
        if g.area > 0.25:
            green.append(g)
    green_all = unary_union(green).simplify(0.04, preserve_topology=True)

    metro = {}
    for e in load(cache, 'metro.json'):
        t = e.get('tags', {})
        color = (t.get('colour') or t.get('color') or '#888888').upper()
        ways = [way_line(m) for m in e.get('members', []) if m.get('type') == 'way' and m.get('role', '') in ('', 'route')]
        ways = [w for w in ways if w is not None]
        if not ways:
            continue
        metro.setdefault(color, []).extend(ways)
    lines = []
    for color, ws in metro.items():
        merged = linemerge(unary_union(ws)).intersection(frame).simplify(0.02)
        if not merged.is_empty:
            lines.append({'color': color, 'd': line_path(merged)})

    out = {
        'attribution': '© участники OpenStreetMap',
        'bounds': [round(v, 2) for v in city.bounds],
        'districts': items,
        'water': path(water_all),
        'green': path(green_all),
        'metro': lines,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('districts', len(items), 'metro lines', len(lines), 'bytes', os.path.getsize(OUT))
    for want in ('Хамовники', 'Сокольники', 'Тверской', 'Крылатское', 'Выхино-Жулебино'):
        print(' ', want, any(d['name'] == want for d in items))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', default=os.path.join(tempfile.gettempdir(), 'mgb-osm-cache'))
    main(parser.parse_args().cache)
