# Сборка контуров районов для зон на карте (версия 2) → js/districts-zones.js
#
# Входные файлы — выгрузки Overpass API (OpenStreetMap), лежат рядом со скриптом:
#   spb_mo.json  — area["name"="Санкт-Петербург"]["admin_level"="4"]->.a;
#                  relation["boundary"="administrative"]["admin_level"="8"](area.a); out geom;
#   lo_mo.json   — relation["boundary"="administrative"]["admin_level"~"^(6|8)$"]["name"~"Муринское|Заневское|…"]
#                  (59.3,28.5,60.9,31.4); out geom;
#   water.json   — relation/way["natural"="water"], relation["natural"~"bay|strait"] в той же рамке; out geom;
# Запуск из папки с выгрузками: python tools/build-district-zones.py (нужна shapely);
# результат zones.json обернуть в js/districts-zones.js.
# Соответствие «муниципальный округ → район» задано вручную в MAP.

import json, math, os, subprocess
from shapely.geometry import LineString, Point, Polygon, MultiPolygon, box
from shapely.ops import polygonize, unary_union
from shapely import affinity

DISTRICTS_JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "js", "districts.js")
out = subprocess.run(["node","-e","global.window={};require(" + json.dumps(DISTRICTS_JS) + ");console.log(JSON.stringify(window.App.DISTRICTS.map(d=>({id:d.id,c:d.center,r:d.radius,g:d.group}))))"],capture_output=True,text=True).stdout
D = {d['id']: d for d in json.loads(out)}

# Муниципальный округ (OSM) → район(ы). Несколько районов — округ делится между ними по серединам.
MAP = {
 "Дворцовый округ":["nevsky"], "Литейный округ":["nevsky"], "округ Смольнинское":["smolny"],
 "Владимирский округ":["vladimirskaya"], "округ № 78":["vladimirskaya"], "округ Лиговка-Ямская":["ligovka"],
 "Сенной округ":["sennaya"], "Адмиралтейский округ":["sennaya"], "округ Коломна":["kolomna"], "Екатерингофский округ":["kolomna"],
 "округ Семёновский":["tekhnolozhka"], "округ Измайловское":["tekhnolozhka"],
 "Посадский округ":["petrogradka"], "округ Кронверкское":["petrogradka"], "Введенский округ":["petrogradka"],
 "округ Аптекарский остров":["petrogradka"], "Петровский округ":["petrogradka"], "округ Чкаловское":["krestovsky"],
 "Васильевский округ":["vaska"], "округ № 7":["vaska"], "округ Гавань":["primorskaya"], "округ Морской":["primorskaya"],
 "округ Остров Декабристов":["primorskaya"],
 "округ Сампсониевское":["vyborgskaya","lesnaya"], "Финляндский округ":["polyustrovo"], "округ Полюстрово":["polyustrovo"],
 "округ Академическое":["polytech","grazhdanka"], "округ Гражданка":["grazhdanka"], "округ Прометей":["grazhdanka"], "округ № 21":["grazhdanka"],
 "округ Светлановское":["udelnaya"], "округ Сосновское":["ozerki"], "округ Шувалово-Озерки":["ozerki"],
 "округ Суздальское":["prosveshcheniya"], "округ Северный":["prosveshcheniya"], "Парголово":["parnas"],
 "округ Коломяги":["shuvalovo"], "округ Ланское":["chernaya"], "округ Комендантский аэродром":["pionerskaya"],
 "округ Озеро Долгое":["komendantsky"], "округ Юнтолово":["yuntolovo"], "округ № 65":["begovaya"], "округ Лахта-Ольгино":["lakhta"],
 "округ Малая Охта":["malaya-okhta","ladozhskaya"], "округ Большая Охта":["bolshaya-okhta"], "округ Ржевка":["rzhevka"], "округ Пороховые":["rzhevka"],
 "округ Пискарёвка":["piskarevka"], "Невский округ":["bolshevikov"], "округ Правобережный":["bolshevikov"], "округ № 54":["dybenko"], "округ Оккервиль":["dybenko"],
 "Ивановский округ":["lomonosovskaya"], "округ Невская застава":["lomonosovskaya"], "Обуховский округ":["obukhovo"], "округ Рыбацкое":["rybatskoe"],
 "округ Волковское":["volkovskaya","bukharestskaya"], "Николаевский округ":["bukharestskaya"], "Балканский округ":["kupchino"],
 "округ Купчино":["kupchino"], "Георгиевский округ":["kupchino"], "Шушары":["shushary"],
 "округ Московская застава":["moskovskie-vorota"], "округ Новоизмайловское":["park-pobedy"],
 "округ Звёздное":["zvezdnaya"], "округ Гагаринское":["moskovskaya"],
 "Нарвский округ":["narvskaya"], "округ Морские ворота":["narvskaya"], "округ Автово":["avtovo"], "округ Княжево":["leninsky"],
 "округ Красненькая речка":["leninsky"], "округ Дачное":["veteranov"], "округ Ульянка":["ulyanka"], "округ Урицк":["ulyanka"],
 "Южно-Приморский округ":["yugo-zapad"], "округ Юго-Запад":["yugo-zapad"], "округ Константиновское":["sosnovaya"], "округ Сосновая поляна":["sosnovaya"],
 "Пушкин":["pushkin"], "Павловск":["pavlovsk"], "Тярлево":["pavlovsk"], "Колпино":["kolpino"], "Петергоф":["peterhof"], "Стрельна":["strelna"],
 "Ломоносов":["lomonosov"], "Кронштадт":["kronstadt"], "Сестрорецк":["sestroretsk"], "Зеленогорск":["zelenogorsk"], "Песочный":["pesochny"],
 "Красное Село":["krasnoe-selo"], "округ Горелово":["gorelovo"],
 # Ленобласть: поселение целиком велико — обрезаем по радиусу района
 "Муринское городское поселение":["murino"], "Новодевяткинское сельское поселение":["novoe-devyatkino"], "Бугровское городское поселение":["bugry"],
 "Заневское городское поселение":["kudrovo","yanino"], "Колтушское городское поселение":["koltushi"], "Токсовское городское поселение":["toksovo"],
 "Сертоловское городское поселение":["sertolovo"], "Тосненское городское поселение":["tosno"], "Отрадненское городское поселение":["otradnoe"],
 "Кировское городское поселение":["kirovsk"], "Шлиссельбургское городское поселение":["shlisselburg"], "Сосновоборский городской округ":["sosnovy-bor"],
}
KX=111.32*math.cos(math.radians(59.94)); KY=110.57

def rel_geom(e):
    lines=lambda role: [LineString([(p['lon'],p['lat']) for p in m['geometry']]) for m in e['members']
                        if m['type']=='way' and 'geometry' in m and (m.get('role')=='inner')==(role=='inner')]
    g=unary_union(list(polygonize(unary_union(lines('outer')))))
    inner=lines('inner')
    if inner: g=g.difference(unary_union(list(polygonize(unary_union(inner)))))
    return g.buffer(0)

def circle(d, k):
    lat,lon=d['c']; r=d['r']*k
    return affinity.scale(Point(lon,lat).buffer(1,64), r/KX, r/KY)

def halfplane(own, other, size=2.0):
    # полуплоскость со стороны own от серединного перпендикуляра (в км-пространстве)
    ox,oy=own[1]*KX,own[0]*KY; tx,ty=other[1]*KX,other[0]*KY
    mx,my=(ox+tx)/2,(oy+ty)/2; dx,dy=tx-ox,ty-oy; L=math.hypot(dx,dy); dx,dy=dx/L,dy/L
    px,py=-dy,dx; S=500
    pts=[(mx+px*S,my+py*S),(mx-px*S,my-py*S),(mx-px*S-dx*S,my-py*S-dy*S),(mx+px*S-dx*S,my+py*S-dy*S)]
    return Polygon([(x/KX,y/KY) for x,y in pts])

parts={}
els=json.load(open("spb_mo.json"))["elements"]+json.load(open("lo_mo.json"))["elements"]
for e in els:
    name=e['tags'].get('name'); ids=MAP.get(name)
    if not ids: continue
    g=rel_geom(e)
    for i in ids:
        piece=g
        for j in ids:
            if j!=i: piece=piece.intersection(halfplane(D[i]['c'],D[j]['c']))
        parts.setdefault(i,[]).append(piece)

# Вода: реки, каналы, заливы и крупные озёра — зоны их не закрашивают
water=[]
for e in json.load(open("water.json"))["elements"]:
    t=e.get('tags',{})
    if e['type']=='way':
        if 'geometry' not in e or len(e['geometry'])<4: continue
        g=Polygon([(p['lon'],p['lat']) for p in e['geometry']]).buffer(0)
    else:
        try: g=rel_geom(e)
        except Exception: continue
    if g.is_empty: continue
    big = g.area*KX*KY > 0.3
    if t.get('natural') in ('bay','strait') or t.get('water') in ('river','canal','oxbow','reservoir') or big:
        water.append(g)
W=unary_union(water)

def rings(poly):
    s=poly.simplify(0.00012)
    if s.is_empty or s.area*KX*KY<0.05: return None
    ext=[[round(y,5),round(x,5)] for x,y in s.exterior.coords]
    holes=[[[round(y,5),round(x,5)] for x,y in h.coords] for h in s.interiors if Polygon(h).area*KX*KY>0.05]
    return [ext]+holes

# Как у Авиасейлс — зоны только там, где граница что-то говорит о районе: в городе.
# У пригородов и области округа и поселения огромные (с лесами и полями), обрезка по кругу
# даёт выдуманные дуги — им зоны не рисуем, остаются подписи. Шушары и Кудрово — по той же причине.
SKIP = {"shushary", "kudrovo"}

result={}
for i,ps in parts.items():
    d=D[i]
    if d['g']=='suburb' or i in SKIP: continue
    g=unary_union(ps).difference(W).buffer(0)
    polys=[g] if isinstance(g,Polygon) else list(getattr(g,'geoms',[]))
    polys=[p for p in polys if isinstance(p,Polygon)]
    rs=[r for r in (rings(p) for p in polys) if r]
    if rs: result[i]=rs
json.dump(result, open("zones.json","w"), ensure_ascii=False, separators=(',',':'))
print(len(result), "districts;", sum(len(v) for v in result.values()), "parts")
print("без зоны:", sorted(set(D)-set(result)))
import os; print(os.path.getsize("zones.json")//1024, "KB")
