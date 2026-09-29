# Builds src/data/moscowDistricts.json, the map of Moscow for «Карта районов» and «Виртуальный мэр»:
# every district of the nine okrugs inside MKAD and just beyond it (no Zelenograd, no New Moscow) with its name,
# okrug and a label point; the Moskva and the big ponds, the large parks and forests.
#
# The map is drawn as soft tiles, not as a survey: the borders lose their wiggle (shared edges are simplified together,
# so neighbours still fit), every district is shrunk to leave an even gap and gets rounded corners, the river runs
# between the tiles, and only the big parks stay, painted on the tiles.
#
#   python scripts/moscow-districts.py [--cache DIR]
#
# Needs shapely 2.1+ (GEOS 3.12+ for coverage_simplify). Downloads three Overpass responses into the cache folder
# (kept for reruns).
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
}
TOLERANCE = 0.25  # km: the wiggle a border loses
SMOOTH = 3  # rounds of corner cutting
REACH = 19.5  # km from the Kremlin: districts further out are left off
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


def rounded(g, r_in, r_out):
    """Inner corners rounded with r_in, outer ones with r_out; parts narrower than the outer rounding go."""
    q = 8
    return g.buffer(r_in, quad_segs=q).buffer(-r_in - r_out, quad_segs=q).buffer(r_out, quad_segs=q)


def chaikin(pts, rounds=SMOOTH):
    """Corner cutting: a polyline becomes a smooth curve. Open lines keep their ends, so borders still meet."""
    pts = list(pts)
    closed = pts[0] == pts[-1]
    for _ in range(rounds):
        ring = pts[:-1] if closed else pts
        pairs = list(zip(ring, ring[1:] + ring[:1])) if closed else list(zip(ring, ring[1:]))
        cut = [p for (x0, y0), (x1, y1) in pairs for p in ((0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1), (0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1))]
        pts = cut + cut[:1] if closed else [pts[0], *cut, pts[-1]]
    return pts


def smooth_polys(g, rounds=SMOOTH, min_area=0.0):
    """Every ring of a (multi)polygon smoothed on its own; for shapes that share no borders."""
    out = []
    for p in polys(g):
        if p.area < min_area:
            continue
        shell = chaikin(p.exterior.coords, rounds)
        holes = [chaikin(r.coords, rounds) for r in p.interiors if Polygon(r).area > min_area]
        out.append(Polygon(shell, holes).buffer(0))
    return unary_union(out)


def smooth_coverage(shapes):
    """Smooth curves for polygons that tile the plane: the network of borders is smoothed once, edge by edge
    (every edge keeps its ends at the junctions), then cut back into faces, each given to the polygon it lies in."""
    net = linemerge(unary_union([g.boundary for g in shapes]))
    edges = list(getattr(net, 'geoms', [net]))
    faces = list(polygonize([LineString(chaikin(e.coords)) for e in edges]))
    tree = shapely.STRtree(shapes)
    owned = [[] for _ in shapes]
    for f in faces:
        pt = f.representative_point()
        for i in tree.query(pt, predicate='within'):
            owned[i].append(f)
            break
    return [unary_union(fs).buffer(0) if fs else g for fs, g in zip(owned, shapes)]


def main(cache, out_path=OUT):
    fetch(cache)
    okrugs, districts = [], []
    for e in load(cache, 'admin-geom.json'):
        t = e.get('tags', {})
        g = element_polygon(e)
        if g is None or g.is_empty:
            continue
        (okrugs if t.get('admin_level') == '5' else districts).append((t.get('name', ''), t.get('ref', ''), g))
    city = unary_union([g for _, _, g in okrugs])
    frame = box(*city.bounds).buffer(1.5)

    kept = []
    for name, _, g in districts:
        inside = g.intersection(city)
        if inside.area < 0.5 * g.area or inside.area < 0.3:
            continue
        # Moscow in MKAD and just beyond it: the far districts (Vnukovo, Molzhaninovsky, Kurkino…) would stick out.
        c = inside.representative_point()
        if math.hypot(c.x, c.y) > REACH:
            print('  beyond the ring:', name)
            continue
        far = [p for p in polys(inside) if math.hypot(p.centroid.x, p.centroid.y) > REACH + 2]
        if far:
            print('  exclave dropped:', name)
            inside = unary_union([p for p in polys(inside) if p not in far])
        okrug = max(okrugs, key=lambda o: o[2].intersection(inside).area)
        short = name.replace('район ', '').replace(' район', '').replace('муниципальный округ ', '').strip()
        kept.append((short, okrug[1] or okrug[0], inside))
    # Shared borders lose their wiggle together, then turn into smooth curves together, so neighbours still fit.
    simple = [g.buffer(0) for g in shapely.coverage_simplify([g for _, _, g in kept], TOLERANCE)]
    soft = smooth_coverage(simple)

    # The city as one slab: the outline of all districts, holes filled, crumbs dropped.
    land = unary_union([Polygon(p.exterior) for p in polys(unary_union(soft)) if p.area > 1])

    # The Moskva and the big ponds as smooth water on the slab; the districts stop at the banks.
    water = []
    for e in load(cache, 'water.json'):
        g = element_polygon(e)
        if g is None or g.is_empty:
            continue
        g = g.intersection(frame)
        if g.area > 0.02:
            water.append(g)
    water_big = unary_union([p for p in polys(unary_union(water)) if p.area > 0.15])
    river = smooth_polys(rounded(water_big.simplify(0.04), 0.2, 0.03), 2, 0.05).intersection(land)

    items = []
    for (name, okrug, raw), g in zip(kept, soft):
        t = g.difference(river)
        t = unary_union([p for p in polys(t) if p.area > 0.08 * g.area]).simplify(0.004)
        main_part = max(polys(t), key=lambda p: p.area)
        label = polylabel(main_part, tolerance=0.05)
        # Where a name tag above the district points: the edge straight above the label point.
        top = LineString([(label.x, t.bounds[1] - 1), (label.x, label.y)]).intersection(main_part).bounds[1]
        items.append({'name': name, 'okrug': okrug, 'd': path(t), 'c': [round(label.x, 2), round(label.y, 2)], 'top': round(top, 2), 'area': round(raw.area, 2)})
        if abs(t.area - raw.area) > 0.25 * raw.area:
            print('  area changed a lot:', name, round(raw.area, 2), '->', round(t.area, 2))
    items.sort(key=lambda d: d['name'])

    # The big parks and forests painted on the slab.
    green = []
    for e in load(cache, 'green.json'):
        g = element_polygon(e)
        if g is None or g.is_empty:
            continue
        g = g.intersection(city)
        if g.area > 0.25:
            green.append(g)
    green_all = rounded(unary_union(green).simplify(0.05), 0.15, 0.2).difference(river).intersection(land)
    green_all = smooth_polys(green_all, 2, 0.4).simplify(0.006)

    out = {
        'attribution': '© участники OpenStreetMap',
        'bounds': [round(v, 2) for v in land.bounds],
        'land': path(land.simplify(0.004)),
        'districts': items,
        'water': path(river.simplify(0.004)),
        'green': path(green_all),
    }
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('districts', len(items), 'bytes', os.path.getsize(out_path))
    for want in ('Хамовники', 'Сокольники', 'Тверской', 'Крылатское', 'Выхино-Жулебино'):
        print(' ', want, any(d['name'] == want for d in items))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', default=os.path.join(tempfile.gettempdir(), 'mgb-osm-cache'))
    parser.add_argument('--out', default=OUT)
    args = parser.parse_args()
    main(args.cache, args.out)
