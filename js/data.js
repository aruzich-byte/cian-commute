/**
 * Датасет прототипа — 7 реальных квартир в долгосрочную аренду (Санкт-Петербург)
 * с spb.cian.ru, с нашими фото (photos/1…7). Изначально собирали 1324 объявления
 * через API поисковой выдачи (07.10.2026), остальные пока убраны.
 * Все поля — как на сайте: комнатность, площадь, этаж, цена, залог, комиссия
 * (clientFee, % от месячной цены), ЖК, адрес, ближайшее метро, координаты,
 * продавец, «Суперагент», есть ли у него фото, «Проверено в Росреестре», «Ранний доступ»,
 * ЖКУ (utilitiesIncluded — включены в цену, utilitiesPrice — сумма, metersExtra — счётчики отдельно).
 * ДАННЫЕ ПОДОГНАНЫ ПОД ЗАДАНИЯ UX-ТЕСТА (у каждого задания один правильный ответ):
 *   «без комиссии + залог частями» — только 229135673; «евроремонт + мебель» — только 334605857
 *   (на Циане у неё косметический ремонт); газ: у трёх домов магистральный (как на Циане) — по границе / в доме / просто «есть»,
 *   в тесте спрашиваем, где именно газ.
 * depositByParts (залог частями) — у аренды квартир ПОКА ФЕЙК, поля на Циане нет; реально только у 229135673
 *   (в описании: «залог можно разбить на 2 части»). Заменить, когда появится в данных.
 * Продажа домов: gas / heating / sewer / buildYear — с Циана, пропуски дополнены из описания объявления.
 * houseKind — тип дома по материалу с Циана («Каркасный дом»); у 333715474 материал из описания (газобетон).
 * Аренда домов: gas / heating / water / toiletInside — с Циана (отопление, санузел) + из описания (вода, газгольдер).
 * isGoodPrice — посчитано по тем 1324 объявлениям: цена ≤ 85% медианы среди
 * квартир той же комнатности (сейчас сравнивать не с чем, поэтому зафиксировано).
 */

(function () {
  // Реальные объявления: flatType 'rooms' | 'studio' | 'openPlan'; rooms — null у студий;
  // metroTransport 'walk' | 'transport' (минуты пешком или на транспорте);
  // metroColor — цвет линии метро (hex без #); agency — null, если имя продавца скрыто
  const RAW_OFFERS = [
  {"id":"317754009","dealType":"rent","propertyType":"flat","flatType":"studio","rooms":null,"isApartments":true,"area":29.0,"floor":14,"floorsTotal":23,"price":48000,"deposit":40000,"clientFee":0,"jk":null,"street":"проспект Просвещения","house":"83","metro":"Гражданский проспект","metroMin":10,"metroTransport":"walk","metroColor":"D70834","lat":60.036793,"lon":30.407317,"agency":"SVET hotel","isByHomeowner":false,"isSuperAgent":false,"addedDaysAgo":0,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":true,"isGoodPrice":false,"utilitiesIncluded":true,"utilitiesPrice":0,"metersExtra":false,"depositByParts":false},
  {"id":"334543276","dealType":"rent","propertyType":"flat","flatType":"rooms","rooms":1,"isApartments":false,"area":30.7,"floor":3,"floorsTotal":5,"price":26000,"deposit":15000,"clientFee":100,"jk":null,"street":"улица Карпинского","house":"24","metro":"Академическая","metroMin":5,"metroTransport":"transport","metroColor":"D70834","lat":60.008968,"lon":30.423244,"agency":"Иван Тарасов","isByHomeowner":false,"isSuperAgent":true,"addedDaysAgo":0,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":true,"utilitiesIncluded":false,"utilitiesPrice":3000,"metersExtra":true,"depositByParts":true},
  {"id":"229135673","dealType":"rent","propertyType":"flat","flatType":"rooms","rooms":2,"isApartments":false,"area":45.0,"floor":5,"floorsTotal":5,"price":64000,"deposit":60000,"clientFee":0,"jk":null,"street":"3-я Советская улица","house":"10","metro":"Площадь Восстания","metroMin":8,"metroTransport":"walk","metroColor":"D70834","lat":59.933609,"lon":30.367369,"agency":"BRIDGE APARTS","isByHomeowner":false,"isSuperAgent":false,"addedDaysAgo":0,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":true,"isGoodPrice":false,"utilitiesIncluded":false,"utilitiesPrice":7000,"metersExtra":true,"depositByParts":true},
  {"id":"324112325","dealType":"rent","propertyType":"flat","flatType":"studio","rooms":null,"isApartments":true,"area":22.4,"floor":10,"floorsTotal":12,"price":35000,"deposit":35000,"clientFee":0,"jk":"ЖК «Апарт-отель Kirovsky AVENIR»","street":"дорога На Турухтанные острова","house":"5к1","metro":"Автово","metroMin":10,"metroTransport":"walk","metroColor":"D70834","lat":59.870041,"lon":30.253552,"agency":"Магнит","isByHomeowner":false,"isSuperAgent":true,"addedDaysAgo":0,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":true,"isGoodPrice":false,"utilitiesIncluded":false,"utilitiesPrice":9000,"metersExtra":true,"depositByParts":false},
  {"id":"333074730","dealType":"rent","propertyType":"flat","flatType":"studio","rooms":null,"isApartments":true,"area":27.0,"floor":11,"floorsTotal":18,"price":58000,"deposit":29000,"clientFee":0,"jk":null,"street":"улица Салова","house":"61","metro":"Бухарестская","metroMin":3,"metroTransport":"walk","metroColor":"700579","lat":59.885503,"lon":30.367597,"agency":"Алексей «Вало-сервис»","isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"utilitiesIncluded":true,"utilitiesPrice":0,"metersExtra":false,"depositByParts":false},
  {"id":"306612788","dealType":"rent","propertyType":"flat","flatType":"studio","rooms":null,"isApartments":false,"area":35.0,"floor":6,"floorsTotal":11,"price":50000,"deposit":30000,"clientFee":0,"jk":null,"street":"Кременчугская улица","house":"13к1","metro":"Площадь Александра Невского","metroMin":15,"metroTransport":"walk","metroColor":"069857","lat":59.922201,"lon":30.371456,"agency":"SERGEEW APARTAMENTS","isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":true,"isGoodPrice":false,"utilitiesIncluded":false,"utilitiesPrice":7000,"metersExtra":false,"depositByParts":false},
  {"id":"333208528","dealType":"rent","propertyType":"flat","flatType":"rooms","rooms":2,"isApartments":false,"area":45.9,"floor":8,"floorsTotal":9,"price":38500,"deposit":0,"clientFee":50,"jk":null,"street":"Купчинская улица","house":"4К1","metro":"Купчино","metroMin":25,"metroTransport":"walk","metroColor":"087DCD","lat":59.844628,"lon":30.381876,"agency":"Степан Краснов","isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":true,"company":"Циан х ПИК-Аренда","utilitiesIncluded":false,"utilitiesPrice":8000,"metersExtra":true},
  {"id":"333727493","dealType":"sale","propertyType":"flat","flatType":"studio","rooms":null,"isApartments":false,"area":24.3,"floor":5,"floorsTotal":8,"price":6600000,"repair":"Косметический ремонт","repairGenerated":false,"repairYear":2016,"hasFurniture":true,"jk":"ЖК «Солнечный город»","street":"улица Бориса Шмелева","house":"7","metro":"Проспект Ветеранов","metroMin":15,"metroTransport":"transport","metroColor":"D70834","highway":null,"highwayKm":null,"lat":59.846902,"lon":30.097299,"isAgency":false,"agency":"Венера Чикина","company":"ПИА Недвижимость","isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false},
  {"id":"334460252","dealType":"sale","propertyType":"flat","flatType":"rooms","rooms":1,"isApartments":false,"area":30.9,"floor":5,"floorsTotal":9,"price":7650000,"repair":"Косметический ремонт","repairGenerated":false,"repairYear":2021,"hasFurniture":false,"jk":null,"street":"проспект Энергетиков","house":"54К1","metro":"Ладожская","metroMin":7,"metroTransport":"transport","metroColor":"DF6E08","highway":null,"highwayKm":null,"lat":59.967142,"lon":30.436162,"isAgency":true,"agency":"Вам к нам","company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false},
  {"id":"334420054","dealType":"sale","propertyType":"flat","flatType":"rooms","rooms":1,"isApartments":false,"area":35.9,"floor":8,"floorsTotal":11,"price":18500000,"repair":"Дизайнерский ремонт","repairGenerated":false,"repairYear":2018,"hasFurniture":true,"jk":null,"street":"Вяземский переулок","house":"6","metro":"Петроградская","metroMin":16,"metroTransport":"walk","metroColor":"087DCD","highway":null,"highwayKm":null,"lat":59.972839,"lon":30.298926,"isAgency":true,"agency":"Балтийская Коммерция","company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":true,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false},
  {"id":"334584058","dealType":"sale","propertyType":"flat","flatType":"rooms","rooms":2,"isApartments":false,"area":50.0,"floor":11,"floorsTotal":17,"price":14100000,"repair":"Косметический ремонт","repairGenerated":false,"repairYear":2021,"hasFurniture":false,"jk":"ЖК «ЦДС Юнтоловский»","street":"Туристская улица","house":"30к1","metro":"Комендантский проспект","metroMin":6,"metroTransport":"transport","metroColor":"700579","highway":null,"highwayKm":null,"lat":60.005036,"lon":30.21028,"isAgency":true,"agency":"ПИА Недвижимость","company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false},
  {"id":"332233080","dealType":"sale","propertyType":"flat","flatType":"rooms","rooms":2,"isApartments":true,"area":42.07,"floor":6,"floorsTotal":12,"price":14387940,"repair":"Чистовая отделка","repairGenerated":false,"repairYear":2024,"hasFurniture":false,"jk":"ЖК «YE'S Primorsky Комплекс Апартаментов (Йес Приморский)»","street":"Камышовая улица","house":"25","metro":"Комендантский проспект","metroMin":17,"metroTransport":"walk","metroColor":"700579","highway":null,"highwayKm":null,"lat":60.00805176275996,"lon":30.238204068843437,"isAgency":true,"agency":"РК-Газсетьсервис","company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false},
  {"id":"331478069","dealType":"sale","propertyType":"flat","flatType":"rooms","rooms":3,"isApartments":false,"area":61.6,"floor":5,"floorsTotal":9,"price":12000000,"repair":"Косметический ремонт","repairGenerated":false,"repairYear":2023,"hasFurniture":true,"jk":null,"street":"проспект Луначарского","house":"76","metro":"Озерки","metroMin":6,"metroTransport":"transport","metroColor":"087DCD","highway":null,"highwayKm":null,"lat":60.037333,"lon":30.362239,"isAgency":false,"agency":"Любовь Васильева","company":"Частный маклер","isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false},
  {"id":"334605857","dealType":"sale","propertyType":"flat","flatType":"rooms","rooms":2,"isApartments":false,"area":68.7,"floor":5,"floorsTotal":5,"price":16900000,"repair":"Евроремонт","repairGenerated":true,"repairYear":2017,"hasFurniture":true,"jk":null,"street":"улица Кустодиева","house":"17","metro":"Гражданский проспект","metroMin":7,"metroTransport":"transport","metroColor":"D70834","highway":null,"highwayKm":null,"lat":60.049217,"lon":30.363874,"isAgency":false,"agency":"Юлия Куракина","company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false},
  {"id":"334426511","dealType":"sale","propertyType":"house","houseKind":"Щитовой дом","area":96.0,"landArea":7.0,"houseFloors":1,"floor":1,"floorsTotal":1,"price":8500000,"jk":null,"locality":"Всеволожский р-н, д. Озерки","metro":"Ломоносовская","metroMin":24,"metroTransport":"transport","metroColor":"069857","highway":"Кола","highwayKm":14,"lat":59.895714,"lon":30.727413,"isAgency":false,"agency":null,"company":null,"isByHomeowner":true,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":"Магистральный газ по границе","heating":"Эл. отопление","sewer":"Септик","buildYear":2026},
  {"id":"326265609","dealType":"sale","propertyType":"house","houseKind":"Каркасный дом","area":154.0,"landArea":11.4,"houseFloors":2,"floor":1,"floorsTotal":2,"price":14500000,"jk":null,"locality":"Всеволожский р-н, Ладога Ленд кп, улица Солнечная","metro":null,"metroMin":null,"metroTransport":null,"metroColor":null,"highway":"Дорога Жизни","highwayKm":27,"lat":59.996677,"lon":31.048112,"isAgency":true,"agency":"Sajva development group","company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":"Магистральный газ","heating":null,"sewer":"Канализация","buildYear":null},
  {"id":"334253821","dealType":"sale","propertyType":"house","houseKind":"Деревянный дом","area":138.7,"landArea":15.0,"houseFloors":2,"floor":1,"floorsTotal":2,"price":13990000,"jk":null,"locality":"Ломоносовский р-н, Имение Оржицкого кп, улица Ахтырского Полка, 17","metro":null,"metroMin":null,"metroTransport":null,"metroColor":null,"highway":"Нарва","highwayKm":32,"lat":59.726787,"lon":29.743093,"isAgency":true,"agency":"THE KEYS","company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":"Без газа","heating":"Камин","sewer":"Септик","buildYear":2020},
  {"id":"334343346","dealType":"sale","propertyType":"house","houseKind":"Газобетонный дом","area":130.0,"landArea":9.0,"houseFloors":1,"floor":1,"floorsTotal":1,"price":19800000,"jk":null,"locality":"Выборгский р-н, Симагинские просторы СНТ, проезд Ласточкин","metro":null,"metroMin":null,"metroTransport":null,"metroColor":null,"highway":"Скандинавское","highwayKm":31,"lat":60.277039,"lon":29.823421,"isAgency":true,"agency":"Невский Градъ","company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":"Магистральный газ в доме","heating":"Газовое отопление","sewer":"Септик","buildYear":2026},
  {"id":"332022679","dealType":"sale","propertyType":"house","houseKind":"Каркасный дом","area":233.8,"landArea":12.0,"houseFloors":2,"floor":1,"floorsTotal":2,"price":31500000,"jk":null,"locality":"Всеволожский р-н, Коттеджный поселок Дворянская усадьба, 57","metro":null,"metroMin":null,"metroTransport":null,"metroColor":null,"highway":"ЗСД","highwayKm":15,"lat":60.159564,"lon":30.038801,"isAgency":true,"agency":"Вам к нам","company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":"Без газа","heating":"Эл. отопление","sewer":"Септик","buildYear":2024},
  {"id":"333715474","dealType":"sale","propertyType":"house","houseKind":"Газобетонный дом","area":170.0,"landArea":16.0,"houseFloors":2,"floor":1,"floorsTotal":2,"price":45000000,"jk":null,"locality":"Ломоносовский р-н, Лебяжье городской поселок, улица Степаняна","metro":null,"metroMin":null,"metroTransport":null,"metroColor":null,"highway":"Санкт-Петербург — Большая Ижора","highwayKm":15,"lat":59.965667,"lon":29.408623,"isAgency":false,"agency":"Елена Юрьевская","company":"BARNES International Realty","isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":null,"heating":"Газовое отопление","sewer":null,"buildYear":2012},
  {"id":"333549619","dealType":"sale","propertyType":"house","houseKind":"Деревянный дом","area":70.0,"landArea":9.75,"houseFloors":2,"floor":1,"floorsTotal":2,"price":3800000,"jk":null,"locality":"Приозерский р-н, Наука СНТ, улица Профессорская","metro":null,"metroMin":null,"metroTransport":null,"metroColor":null,"highway":"Сортавала","highwayKm":48,"lat":60.479175,"lon":30.229156,"isAgency":false,"agency":"Ольга Кучерова","company":"ВЕСТА","isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":null,"heating":"Печь и камин","sewer":null,"buildYear":1997},
  {"id":"334357136","dealType":"rent","propertyType":"house","houseKind":"Деревянный дом","area":90.0,"landArea":8.0,"houseFloors":1,"floor":1,"floorsTotal":1,"price":60000,"deposit":60000,"clientFee":50,"utilitiesIncluded":true,"utilitiesPrice":0,"metersExtra":true,"jk":null,"locality":"Всеволожский р-н, Тавры СНТ, улица Дерибасовская, 145","metro":"Улица Дыбенко","metroMin":21,"metroTransport":"transport","metroColor":"DF6E08","highway":"Кола","highwayKm":11,"lat":59.91563,"lon":30.68212,"isAgency":true,"agency":"Ринкон","company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":null,"heating":"Эл. отопление","water":"Колодец","toiletInside":true},
  {"id":"293652842","dealType":"rent","propertyType":"house","houseKind":"Деревянный дом","area":160.0,"landArea":10.5,"houseFloors":2,"floor":1,"floorsTotal":2,"price":90000,"deposit":95000,"clientFee":0,"utilitiesIncluded":false,"utilitiesPrice":5000,"metersExtra":true,"jk":null,"locality":"Ломоносовский р-н, Фаворит кп, 338","metro":null,"metroMin":null,"metroTransport":null,"metroColor":null,"highway":"Нарва","highwayKm":31,"lat":59.701119,"lon":29.715237,"isAgency":false,"agency":null,"company":null,"isByHomeowner":true,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":null,"heating":"Эл. отопление","water":null,"toiletInside":true},
  {"id":"334540014","dealType":"rent","propertyType":"house","houseKind":"Каркасный дом","area":96.0,"landArea":10.0,"houseFloors":1,"floor":1,"floorsTotal":1,"price":85500,"deposit":70000,"clientFee":0,"utilitiesIncluded":true,"utilitiesPrice":0,"metersExtra":false,"jk":null,"locality":"Приозерский р-н, д. Васильево, улица Кедровая, 12А","metro":null,"metroMin":null,"metroTransport":null,"metroColor":null,"highway":"ЗСД","highwayKm":80,"lat":60.506967,"lon":29.79251,"isAgency":false,"agency":null,"company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":null,"heating":"Эл. отопление","water":"Скважина","toiletInside":true},
  {"id":"334103703","dealType":"rent","propertyType":"house","houseKind":"Газобетонный дом","area":257.0,"landArea":11.0,"houseFloors":2,"floor":1,"floorsTotal":2,"price":175000,"deposit":null,"clientFee":0,"utilitiesIncluded":true,"utilitiesPrice":0,"metersExtra":true,"jk":null,"locality":"Всеволожский р-н, Коркинские Просторы кп, 57а","metro":"Проспект Большевиков","metroMin":27,"metroTransport":"transport","metroColor":"DF6E08","highway":"Кола","highwayKm":16,"lat":59.920537,"lon":30.70615,"isAgency":false,"agency":null,"company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":null,"heating":"Газовое отопление","water":null,"toiletInside":true},
  {"id":"292031022","dealType":"rent","propertyType":"house","houseKind":"Каркасный дом","area":100.0,"landArea":5.0,"houseFloors":1,"floor":1,"floorsTotal":1,"price":110000,"deposit":110000,"clientFee":0,"utilitiesIncluded":false,"utilitiesPrice":0,"metersExtra":true,"jk":null,"locality":"Всеволожский р-н, Рублево кп, 100","metro":"Улица Дыбенко","metroMin":22,"metroTransport":"transport","metroColor":"DF6E08","highway":"Кола","highwayKm":12,"lat":59.914737,"lon":30.696026,"isAgency":true,"agency":"Кантри Клуб Таврический","company":null,"isByHomeowner":false,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":null,"heating":"Газовое отопление","water":"Скважина","toiletInside":null},
  {"id":"333446700","dealType":"rent","propertyType":"house","houseKind":"Каркасный дом","area":200.0,"landArea":12.0,"houseFloors":1,"floor":1,"floorsTotal":1,"price":95000,"deposit":95000,"clientFee":0,"utilitiesIncluded":false,"utilitiesPrice":0,"metersExtra":true,"jk":null,"locality":"Всеволожский р-н, Пять холмов ДНП","metro":null,"metroMin":null,"metroTransport":null,"metroColor":null,"highway":"Сортавала","highwayKm":24,"lat":60.265545,"lon":30.436296,"isAgency":false,"agency":null,"company":null,"isByHomeowner":true,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":null,"heating":"Эл. отопление","water":"Скважина","toiletInside":true},
  {"id":"331080137","dealType":"rent","propertyType":"house","houseKind":"Деревянный дом","area":140.0,"landArea":16.0,"houseFloors":2,"floor":1,"floorsTotal":2,"price":140000,"deposit":50000,"clientFee":0,"utilitiesIncluded":true,"utilitiesPrice":0,"metersExtra":true,"jk":null,"locality":"Выборгский р-н, Морские Террасы кп","metro":null,"metroMin":null,"metroTransport":null,"metroColor":null,"highway":"Приморское","highwayKm":57,"lat":60.167335,"lon":29.285231,"isAgency":false,"agency":null,"company":null,"isByHomeowner":true,"isSuperAgent":false,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":false,"gas":null,"heating":"Газовое отопление","water":null,"toiletInside":true}
];

  // ---------- Фото, подписи, промо и условия проживания (photos/1…7) ----------
  // promo — промо-лейбл с короной: только заголовок объявления с Циана (почищенный).
  // Нет заголовка или он без смысла — промо-лейбла нет.
  // order — порядок в выдаче. Порядок фото: интерьер → планировка (если есть)
  // → кухня → санузлы → комнаты (балкон, коридор) → дом. caption — подпись на фото со 2-го:
  // только факты с Циана (характеристики, описание, планировка). kidsAllowed/petsAllowed — из
  // «Условий проживания» на странице объявления; промо-лейбл таким не придумываем.
  const CURATED = {
    "317754009": {
      promo: "Просторная новая студия у метро", // заголовок объявления
      order: 1,
      hasLayout: false,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544456-1.webp", caption: null },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544454-1.webp", caption: "Кухня · варочная панель" },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544466-1.webp", caption: "Рабочая зона · кондиционер" },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544498-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544394-1.webp", caption: "Двуспальная кровать" },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544497-1.webp", caption: "Окна на улицу и двор" },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544477-1.webp", caption: "Wi-Fi и цифровое ТВ" },
      ],
    },
    "334543276": {
      order: 2,
      hasLayout: true,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088668-1.webp", caption: null },
        { src: "photos/2/Снимок экрана 2026-10-07 в 15.38.51.png", caption: "Потолки 2,5 м" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088663-1.webp", caption: "Кухня · 6,5 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088675-1.webp", caption: "Кухня · 6,5 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978085350-1.webp", caption: "Кухня · 6,5 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088661-1.webp", caption: "Кухня · 6,5 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088664-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088666-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088660-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088669-1.webp", caption: "Комната · 17,4 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088679-1.webp", caption: "Комната · 17,4 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088670-1.webp", caption: "Комната · 17,4 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088684-1.webp", caption: "Балкон" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088681-1.webp", caption: "Балкон" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088665-1.webp", caption: "Балкон" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088674-1.webp", caption: "Коридор · 4,1 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088671-1.webp", caption: "Коридор · 4,1 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088658-1.webp", caption: "Коридор · 4,1 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088659-1.webp", caption: "Коридор · 4,1 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088680-1.webp", caption: null },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088682-1.webp", caption: "Дом · построен в 1965 г" },
      ],
    },
    "229135673": {
      promo: "Тихий центр у пл. Восстания", // заголовок объявления
      order: 3,
      hasLayout: false,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639451-1.webp", caption: null },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658332-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639593-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658304-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639543-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658333-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639637-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639653-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639662-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639699-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639708-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658356-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639682-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658335-1.webp", caption: "Гостиная · диван и ТВ" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592653663-1.webp", caption: "Гостиная · диван и ТВ" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658339-1.webp", caption: "Гостиная · диван и ТВ" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639492-1.webp", caption: "Гостиная · диван и ТВ" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658331-1.webp", caption: "Гостиная · диван и ТВ" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658334-1.webp", caption: "Гостиная · диван и ТВ" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639501-1.webp", caption: "Кровать 180×200" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639521-1.webp", caption: "Кровать 180×200" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639535-1.webp", caption: "Кровать 180×200" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639508-1.webp", caption: "Кровать 180×200" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658320-1.webp", caption: "Общая площадь · 45 м²" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592837166-1.webp", caption: "Общая площадь · 45 м²" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658340-1.webp", caption: "Общая площадь · 45 м²" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639764-1.webp", caption: "Общая площадь · 45 м²" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639789-1.webp", caption: "Дом 1914 г · без лифта" },
      ],
    },
    "324112325": {
      order: 4,
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480468-1.webp", caption: null },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706436162-1.webp", caption: "Студия · 22,4 м²" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480433-1.webp", caption: "Кухонная зона · холодильник" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480475-1.webp", caption: "Кухонная зона · холодильник" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480441-1.webp", caption: "Кухонная зона · холодильник" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480439-1.webp", caption: "Кухонная зона · холодильник" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706434294-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480446-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480440-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480443-1.webp", caption: "Жилая зона · 14,7 м²" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480442-1.webp", caption: "Кровать 180×200" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480444-1.webp", caption: "Студия · 22,4 м²" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706433911-1.webp", caption: "Студия · 22,4 м²" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706434067-1.webp", caption: "Шкафы для хранения" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480445-1.webp", caption: "Шкафы для хранения" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706434141-1.webp", caption: "Шкафы для хранения" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706434609-1.webp", caption: "Ресепшн и охрана 24/7" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480474-1.webp", caption: "Лобби и кофейня" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480438-1.webp", caption: "2 пассажирских лифта" },
      ],
    },
    "333074730": {
      order: 5,
      hasLayout: false,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/5/2946584594-1.webp", caption: null },
        { src: "photos/5/2946584600-1.webp", caption: "Кухня · посудомойка" },
        { src: "photos/5/2946584601-1.webp", caption: "Кухня · посудомойка" },
        { src: "photos/5/2946584605-1.webp", caption: "Ванна и стиральная машина" },
        { src: "photos/5/2946584603-1.webp", caption: "Ванна и стиральная машина" },
        { src: "photos/5/2946584597-1.webp", caption: "Жилая зона · 19 м²" },
        { src: "photos/5/2946584609-1.webp", caption: "Ресепшн 24/7" },
        { src: "photos/5/2946584611-1.webp", caption: null },
        { src: "photos/5/2946584619-1.webp", caption: "Апарт-комплекс VALO City" },
      ],
    },
    "306612788": {
      promo: "Квартира в ЖК «Царская столица»", // заголовок объявления
      order: 6,
      hasLayout: false,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915538-1.webp", caption: null },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915535-1.webp", caption: "Кухня · плита и духовка" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915578-1.webp", caption: "Стиральная машина" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311920469-1.webp", caption: "Стиральная машина" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915536-1.webp", caption: null },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311889749-1.webp", caption: null },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311889753-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311889575-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915554-1.webp", caption: "Студия · 35 м²" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915555-1.webp", caption: "Ортопедический матрас" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915557-1.webp", caption: "Потолки 2,72 м" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915558-1.webp", caption: "Ортопедический матрас" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915549-1.webp", caption: "Диван-кровать" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915579-1.webp", caption: "Диван-кровать" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915560-1.webp", caption: "Диван-кровать" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915580-1.webp", caption: "Студия · 35 м²" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915577-1.webp", caption: "Лоджия · панорамные окна" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311889812-1.webp", caption: "6 этаж из 11" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915543-1.webp", caption: "Вместительный шкаф" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915570-1.webp", caption: "Вместительный шкаф" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915581-1.webp", caption: "Дом · построен в 2015 г" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311889834-1.webp", caption: "ЖК «Царская столица»" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915559-1.webp", caption: "Закрытый двор" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311889885-1.webp", caption: "Закрытый двор" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915574-1.webp", caption: "Консьерж" },
        { src: "photos/6/kvartira-sanktpeterburg-kremenchugskaya-ulica-2311915556-1.webp", caption: "Есть лифт" },
      ],
    },
    "333208528": {
      promo: "Без депозита, рядом ТЦ", // заголовок объявления
      order: 7,
      hasLayout: false,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/7/2949346327-1.webp", caption: null },
        { src: "photos/7/2949346376-1.webp", caption: "Кухня · 13 м²" },
        { src: "photos/7/2949346377-1.webp", caption: "Кухня · 13 м²" },
        { src: "photos/7/2949346378-1.webp", caption: "Раздельный санузел" },
        { src: "photos/7/2949346379-1.webp", caption: "Раздельный санузел" },
        { src: "photos/7/2949346329-1.webp", caption: "Окна на улицу" },
        { src: "photos/7/2949346334-1.webp", caption: "Потолки 2,8 м" },
        { src: "photos/7/2949346338-1.webp", caption: "Окна на улицу" },
        { src: "photos/7/2949346355-1.webp", caption: "Комната · 11 м²" },
        { src: "photos/7/2949346363-1.webp", caption: "Комната · 11 м²" },
        { src: "photos/7/2949346384-1.webp", caption: "Лоджия и балкон" },
        { src: "photos/7/2949346385-1.webp", caption: "Лоджия и балкон" },
        { src: "photos/7/2949346393-2.webp", caption: "Окна на улицу" },
        { src: "photos/7/2949346380-1.webp", caption: "Общая площадь · 45,9 м²" },
        { src: "photos/7/2949346382-2.webp", caption: "Общая площадь · 45,9 м²" },
        { src: "photos/7/2949346394-1.webp", caption: "Дом · построен в 1973 г" },
        { src: "photos/7/2949346387-1.webp", caption: "Есть лифт" },
        { src: "photos/7/2949346392-2.webp", caption: "Есть лифт" },
        { src: "photos/7/2949346388-2.webp", caption: "Есть лифт" },
      ],
    },
    "333727493": {
      // https://spb.cian.ru/sale/flat/333727493/ — фото положить в photos/buy-flat/1/
      category: "buy-flat",
      order: 1,
      promo: "Уютная студия с мебелью", // заголовок объявления
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-flat/1/2960769498-1.webp", caption: null },
        { src: "photos/buy-flat/1/2960769500-1.webp", layout: true, caption: "Студия · 24,3 м²" },
        { src: "photos/buy-flat/1/2960769533-1.webp", caption: "Кухонная зона · 6 м²" },
        { src: "photos/buy-flat/1/2960769540-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/1/2960769542-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/1/2960769547-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/1/2960769514-1.webp", caption: "Жилая зона · 12 м²" },
        { src: "photos/buy-flat/1/2960769517-1.webp", caption: "Мебель остаётся" },
        { src: "photos/buy-flat/1/2960769518-1.webp", caption: "Жилая зона · 12 м²" },
        { src: "photos/buy-flat/1/2960769525-1.webp", caption: "Жилая зона · 12 м²" },
        { src: "photos/buy-flat/1/2960769581-1.webp", caption: "Балкон · 4,2 м²" },
        { src: "photos/buy-flat/1/2960769591-1.webp", caption: "Балкон · 4,2 м²" },
        { src: "photos/buy-flat/1/2960769566-1.webp", caption: "Мебель и техника остаются" },
        { src: "photos/buy-flat/1/2960769596-1.webp", caption: "Дом · построен в 2022 г" },
        { src: "photos/buy-flat/1/2960769600-1.webp", caption: "ЖК «Солнечный город»" },
        { src: "photos/buy-flat/1/2960769608-1.webp", caption: null },
        { src: "photos/buy-flat/1/2960769612-1.webp", caption: null },
        { src: "photos/buy-flat/1/2960769617-1.webp", caption: null },
        { src: "photos/buy-flat/1/2960769622-1.webp", caption: "ЖК «Солнечный город»" },
      ],
    },
    "334460252": {
      // https://spb.cian.ru/sale/flat/334460252/ — фото положить в photos/buy-flat/2/
      category: "buy-flat",
      order: 2,
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-flat/2/2976340865-1.webp", caption: null },
        { src: "photos/buy-flat/2/2976343677-1.webp", layout: true, caption: "Потолки 2,5 м" },
        { src: "photos/buy-flat/2/2976340431-1.webp", caption: "Кухня · 8,1 м²" },
        { src: "photos/buy-flat/2/2976353992-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/2/2976353977-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/2/2976353979-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/2/2976353990-1.webp", caption: "Комната · 15,4 м²" },
        { src: "photos/buy-flat/2/2976353991-1.webp", caption: "Окна во двор" },
        { src: "photos/buy-flat/2/2976353980-1.webp", caption: "Комната · 15,4 м²" },
        { src: "photos/buy-flat/2/2976353997-1.webp", caption: "Общая площадь · 30,9 м²" },
        { src: "photos/buy-flat/2/2976353987-1.webp", caption: "Общая площадь · 30,9 м²" },
        { src: "photos/buy-flat/2/2976353988-1.webp", caption: "Общая площадь · 30,9 м²" },
        { src: "photos/buy-flat/2/2976353981-1.webp", caption: "Окна во двор" },
        { src: "photos/buy-flat/2/2976341701-1.webp", caption: "Окна во двор" },
        { src: "photos/buy-flat/2/2976353985-1.webp", caption: "Дом · построен в 1967 г" },
        { src: "photos/buy-flat/2/2976353978-1.webp", caption: "Есть лифт" },
        { src: "photos/buy-flat/2/2976353108-1.webp", caption: "Есть лифт" },
        { src: "photos/buy-flat/2/2976353986-1.webp", caption: "Есть лифт" },
        { src: "photos/buy-flat/2/2976353993-1.webp", caption: "Парковка у дома" },
        { src: "photos/buy-flat/2/2976353994-1.webp", caption: "Парковка у дома" },
      ],
    },
    "334420054": {
      // https://spb.cian.ru/sale/flat/334420054/ — фото положить в photos/buy-flat/3/
      category: "buy-flat",
      order: 3,
      promo: "Дизайнерская однушка на Петроградке", // заголовок объявления
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-flat/3/2975668595-1.webp", caption: null },
        { src: "photos/buy-flat/3/2975644984-1.webp", layout: true, caption: "Потолки 2,6 м" },
        { src: "photos/buy-flat/3/2975668586-1.webp", caption: "Кухня · 7,4 м²" },
        { src: "photos/buy-flat/3/2975668592-1.webp", caption: "Кухня · 7,4 м²" },
        { src: "photos/buy-flat/3/2975623399-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/3/2975668588-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/3/2975668584-1.webp", caption: "Комната · 17,1 м²" },
        { src: "photos/buy-flat/3/2975668602-1.webp", caption: "Комната · 17,1 м²" },
        { src: "photos/buy-flat/3/2975668591-1.webp", caption: "Комната · 17,1 м²" },
        { src: "photos/buy-flat/3/2975622617-1.webp", caption: "Дизайнерский ремонт" },
        { src: "photos/buy-flat/3/2975668589-1.webp", caption: "Окна во двор" },
        { src: "photos/buy-flat/3/2975668587-1.webp", caption: "Дом · построен в 1970 г" },
        { src: "photos/buy-flat/3/2975668590-1.webp", caption: "Кирпичный дом · есть лифт" },
        { src: "photos/buy-flat/3/2975668585-1.webp", caption: "Рядом Вяземский парк" },
        { src: "photos/buy-flat/3/2975668593-1.webp", caption: "Петроградская сторона" },
      ],
    },
    "334584058": {
      // https://spb.cian.ru/sale/flat/334584058/ — фото положить в photos/buy-flat/4/
      category: "buy-flat",
      order: 4,
      promo: "Двушка у парка", // заголовок объявления
      hasLayout: false,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-flat/4/2978980298-1.webp", caption: null },
        { src: "photos/buy-flat/4/2978980401-1.webp", caption: "Кухня · 8,4 м²" },
        { src: "photos/buy-flat/4/2978980434-1.webp", caption: "Выход на балкон из кухни" },
        { src: "photos/buy-flat/4/2978980459-1.webp", caption: "Кухня · 8,4 м²" },
        { src: "photos/buy-flat/4/2978980516-1.webp", caption: "Раздельный санузел" },
        { src: "photos/buy-flat/4/2978980565-1.webp", caption: "Раздельный санузел" },
        { src: "photos/buy-flat/4/2978980322-1.webp", caption: "Комнаты · 15 и 12 м²" },
        { src: "photos/buy-flat/4/2978980352-1.webp", caption: "Комнаты · 15 и 12 м²" },
        { src: "photos/buy-flat/4/2978980369-1.webp", caption: "Комнаты · 15 и 12 м²" },
        { src: "photos/buy-flat/4/2978980582-1.webp", caption: "2 балкона" },
        { src: "photos/buy-flat/4/2978980614-1.webp", caption: "2 балкона" },
        { src: "photos/buy-flat/4/2978980471-1.webp", caption: "Есть гардеробная" },
        { src: "photos/buy-flat/4/2978980492-1.webp", caption: "Есть гардеробная" },
        { src: "photos/buy-flat/4/2978980286-1.webp", caption: "Дом · построен в 2011 г" },
        { src: "photos/buy-flat/4/2978980274-1.webp", caption: "ЖК «ЦДС Юнтоловский»" },
        { src: "photos/buy-flat/4/2978980704-1.webp", caption: "Кирпично-монолитный дом" },
        { src: "photos/buy-flat/4/2978980646-1.webp", caption: "5 квартир на этаже" },
        { src: "photos/buy-flat/4/2978980664-1.webp", caption: "2 лифта" },
        { src: "photos/buy-flat/4/2978980673-1.webp", caption: "5 квартир на этаже" },
        { src: "photos/buy-flat/4/2978980731-1.webp", caption: "25 мин пешком до метро" },
      ],
    },
    "332233080": {
      // https://spb.cian.ru/sale/flat/332233080/ — фото положить в photos/buy-flat/5/
      category: "buy-flat",
      order: 5,
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-flat/5/2928046006-1.webp", caption: null },
        { src: "photos/buy-flat/5/2928045980-1.webp", layout: true, caption: "Потолки 2,7 м" },
        { src: "photos/buy-flat/5/2928046455-1.webp", caption: "Визуализация · отделка" },
        { src: "photos/buy-flat/5/2928046027-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046088-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046095-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928045994-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046014-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046353-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046404-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046466-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046472-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046058-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046068-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046044-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046113-1.webp", caption: "Комплекс YE'S Primorsky" },
        { src: "photos/buy-flat/5/2928046143-1.webp", caption: "Визуализация · 12 этажей" },
        { src: "photos/buy-flat/5/2928046244-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046291-1.webp", caption: "Визуализация" },
        { src: "photos/buy-flat/5/2928046344-1.webp", caption: "Визуализация · двор" },
      ],
    },
    "331478069": {
      // https://spb.cian.ru/sale/flat/331478069/ — фото положить в photos/buy-flat/6/
      category: "buy-flat",
      order: 6,
      promo: "Трёшка с кухней 10 м²", // заголовок объявления
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-flat/6/2911015204-1.webp", caption: null },
        { src: "photos/buy-flat/6/2910991999-1.webp", layout: true, caption: "Потолки 2,5 м" },
        { src: "photos/buy-flat/6/2911015225-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/buy-flat/6/2911015212-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/buy-flat/6/2911015209-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/buy-flat/6/2911015210-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/buy-flat/6/2910994490-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/buy-flat/6/2911015216-1.webp", caption: "Раздельный санузел" },
        { src: "photos/buy-flat/6/2911015203-1.webp", caption: "Раздельный санузел" },
        { src: "photos/buy-flat/6/2911015215-1.webp", caption: "Комнаты · 17, 12 и 10 м²" },
        { src: "photos/buy-flat/6/2910993344-1.webp", caption: "Комнаты · 17, 12 и 10 м²" },
        { src: "photos/buy-flat/6/2910993346-1.webp", caption: "Две изолированные комнаты" },
        { src: "photos/buy-flat/6/2910993343-1.webp", caption: "Две изолированные комнаты" },
        { src: "photos/buy-flat/6/2911015205-1.webp", caption: "Две изолированные комнаты" },
        { src: "photos/buy-flat/6/2911015208-1.webp", caption: "Две изолированные комнаты" },
        { src: "photos/buy-flat/6/2911015200-1.webp", caption: "Две изолированные комнаты" },
        { src: "photos/buy-flat/6/2911015207-1.webp", caption: "Две изолированные комнаты" },
        { src: "photos/buy-flat/6/2911015213-1.webp", caption: "Лоджия" },
        { src: "photos/buy-flat/6/2911015214-1.webp", caption: "Общая площадь · 61,6 м²" },
        { src: "photos/buy-flat/6/2911015206-1.webp", caption: "Общая площадь · 61,6 м²" },
      ],
    },
    "334605857": {
      // https://spb.cian.ru/sale/flat/334605857/ — фото положить в photos/buy-flat/7/
      category: "buy-flat",
      order: 7,
      promo: "Просторная видовая двушка", // заголовок объявления
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-flat/7/2979426877-1.webp", caption: null },
        { src: "photos/buy-flat/7/2979426836-1.webp", layout: true, caption: "Потолки 2,75 м" },
        { src: "photos/buy-flat/7/2979439449-1.webp", caption: "Кухня · 12,7 м²" },
        { src: "photos/buy-flat/7/2979426866-1.webp", caption: "Кухня · 12,7 м²" },
        { src: "photos/buy-flat/7/2979439438-1.webp", caption: "Кухня · 12,7 м²" },
        { src: "photos/buy-flat/7/2979439448-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/7/2979439471-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/7/2979439440-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/7/2979439452-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/buy-flat/7/2979439466-1.webp", caption: "Жилая площадь · 38,6 м²" },
        { src: "photos/buy-flat/7/2979439450-1.webp", caption: "Жилая площадь · 38,6 м²" },
        { src: "photos/buy-flat/7/2979426871-1.webp", caption: "Жилая площадь · 38,6 м²" },
        { src: "photos/buy-flat/7/2979426874-1.webp", caption: "Жилая площадь · 38,6 м²" },
        { src: "photos/buy-flat/7/2979439447-1.webp", caption: "Жилая площадь · 38,6 м²" },
        { src: "photos/buy-flat/7/2979439445-1.webp", caption: "Спальня · 18 м²" },
        { src: "photos/buy-flat/7/2979439470-1.webp", caption: "Спальня · 18 м²" },
        { src: "photos/buy-flat/7/2979426879-1.webp", caption: "Спальня · 18 м²" },
        { src: "photos/buy-flat/7/2979439453-1.webp", caption: "Спальня · 18 м²" },
        { src: "photos/buy-flat/7/2979439455-1.webp", caption: "Общая площадь · 68,7 м²" },
        { src: "photos/buy-flat/7/2979426848-1.webp", caption: "Общая площадь · 68,7 м²" },
      ],
    },
    "334426511": {
      // https://spb.cian.ru/sale/suburban/334426511/ — фото положить в photos/buy-house/1/
      category: "buy-house",
      order: 1,
      promo: "Уютный современный дом", // заголовок объявления
      hasLayout: false,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-house/1/2975776683-1.webp", caption: null },
        { src: "photos/buy-house/1/2975783894-1.webp", caption: "Тёплый пол" },
        { src: "photos/buy-house/1/2975783886-1.webp", caption: "Тёплый пол" },
        { src: "photos/buy-house/1/2975783904-1.webp", caption: "Тёплый пол" },
        { src: "photos/buy-house/1/2975783905-1.webp", caption: "Тёплый пол" },
        { src: "photos/buy-house/1/2975783857-1.webp", caption: "Спальня · 3 в доме" },
        { src: "photos/buy-house/1/2975776685-1.webp", caption: "Спальня · 3 в доме" },
        { src: "photos/buy-house/1/2975783887-1.webp", caption: "Спальня · 3 в доме" },
        { src: "photos/buy-house/1/2975783872-1.webp", caption: "Кондиционер" },
        { src: "photos/buy-house/1/2975776670-1.webp", caption: "Кондиционер" },
        { src: "photos/buy-house/1/2975783909-1.webp", caption: "Щитовой дом · 2026 г" },
        { src: "photos/buy-house/1/2975776643-1.webp", caption: "Щитовой дом · 2026 г" },
        { src: "photos/buy-house/1/2975776689-1.webp", caption: "Щитовой дом · 2026 г" },
        { src: "photos/buy-house/1/2975776639-1.webp", caption: "Газ и водопровод по границе" },
        { src: "photos/buy-house/1/2975776655-1.webp", caption: "Щитовой дом · 2026 г" },
        { src: "photos/buy-house/1/2975783914-1.webp", caption: "Септик" },
        { src: "photos/buy-house/1/2975783906-1.webp", caption: "Щитовой дом · 2026 г" },
        { src: "photos/buy-house/1/2975783899-1.webp", caption: "Электричество 15 кВт" },
        { src: "photos/buy-house/1/2975776697-1.webp", caption: "Газ и водопровод по границе" },
        { src: "photos/buy-house/1/2975776704-1.webp", caption: "Щитовой дом · 2026 г" },
      ],
    },
    "326265609": {
      // https://spb.cian.ru/sale/suburban/326265609/ — фото положить в photos/buy-house/2/
      category: "buy-house",
      order: 2,
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-house/2/2786671523-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671543-1.webp", layout: true, caption: "3 санузла в доме" },
        { src: "photos/buy-house/2/2786671557-1.webp", layout: true, caption: "2 этаж · 4 спальни" },
        { src: "photos/buy-house/2/2786671529-1.webp", caption: "Каркасный дом · зимний" },
        { src: "photos/buy-house/2/2786671536-1.webp", caption: "Каркасный дом · зимний" },
        { src: "photos/buy-house/2/2786671587-1.webp", caption: "Посёлок Ладога Ленд" },
        { src: "photos/buy-house/2/2786671606-1.webp", caption: "Посёлок Ладога Ленд" },
        { src: "photos/buy-house/2/2786671623-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671637-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671646-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671652-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671666-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671675-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671683-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671693-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671704-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671712-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671720-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671728-1.webp", caption: null },
        { src: "photos/buy-house/2/2786671735-1.webp", caption: null },
      ],
    },
    "334253821": {
      // https://spb.cian.ru/sale/suburban/334253821/ — фото положить в photos/buy-house/3/
      category: "buy-house",
      order: 3,
      promo: "Дом из бруса с баней", // заголовок объявления
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-house/3/2972269463-1.webp", caption: null },
        { src: "photos/buy-house/3/2972267223-1.webp", layout: true, caption: "Кухня-гостиная · 24,7 м²" },
        { src: "photos/buy-house/3/2972267222-1.webp", layout: true, caption: "2 этаж · 4 спальни" },
        { src: "photos/buy-house/3/2972269460-1.webp", caption: "Кухня-гостиная · 24,7 м²" },
        { src: "photos/buy-house/3/2972267050-1.webp", caption: "Кухня-гостиная · 24,7 м²" },
        { src: "photos/buy-house/3/2972269464-1.webp", caption: "Санузел · 2 в доме" },
        { src: "photos/buy-house/3/2972269461-1.webp", caption: "Камин в гостиной" },
        { src: "photos/buy-house/3/2972267003-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/3/2972269467-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/3/2972269476-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/3/2972269449-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/3/2972269477-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/3/2972269486-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/3/2972269452-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/3/2972269489-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/3/2972269481-1.webp", caption: "Скважина 30 м" },
        { src: "photos/buy-house/3/2972269480-1.webp", caption: "Электричество 15 кВт" },
        { src: "photos/buy-house/3/2972269466-1.webp", caption: "Дом из бруса · 2020 г" },
        { src: "photos/buy-house/3/2972267089-1.webp", caption: "Дом из бруса · 2020 г" },
        { src: "photos/buy-house/3/2972269465-1.webp", caption: "Дренаж на участке" },
      ],
    },
    "334343346": {
      // https://spb.cian.ru/sale/suburban/334343346/ — фото положить в photos/buy-house/4/
      category: "buy-house",
      order: 4,
      promo: "Дом с панорамным видом на лес", // заголовок объявления
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-house/4/2974230043-1.webp", caption: null },
        { src: "photos/buy-house/4/2974213423-1.webp", layout: true, caption: "Дом · 4 спальни" },
        { src: "photos/buy-house/4/2974176458-1.webp", caption: "Газобетонный дом · 2026 г" },
        { src: "photos/buy-house/4/2974176068-1.webp", caption: "Газобетонный дом · 2026 г" },
        { src: "photos/buy-house/4/2974230051-1.webp", caption: "Газобетонный дом · 2026 г" },
        { src: "photos/buy-house/4/2974230039-1.webp", caption: "Газобетонный дом · 2026 г" },
        { src: "photos/buy-house/4/2974230045-1.webp", caption: "Визуализация" },
        { src: "photos/buy-house/4/2974238731-1.webp", caption: "Визуализация" },
        { src: "photos/buy-house/4/2974230046-1.webp", caption: "Визуализация" },
        { src: "photos/buy-house/4/2974230050-1.webp", caption: "Посёлок «Север градъ»" },
        { src: "photos/buy-house/4/2974230038-1.webp", caption: null },
        { src: "photos/buy-house/4/2974212198-1.webp", caption: "31 км от КАД" },
        { src: "photos/buy-house/4/2974212261-1.webp", caption: null },
        { src: "photos/buy-house/4/2974210797-1.webp", caption: "Курорт «Лесная рапсодия»" },
        { src: "photos/buy-house/4/2974212798-1.webp", caption: null },
        { src: "photos/buy-house/4/2974219148-1.webp", caption: "30 минут до Петербурга" },
      ],
    },
    "332022679": {
      // https://spb.cian.ru/sale/suburban/332022679/ — фото положить в photos/buy-house/5/
      category: "buy-house",
      order: 5,
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-house/5/2923289034-1.webp", caption: null },
        { src: "photos/buy-house/5/2923278897-1.webp", layout: true, caption: "Дом · 233,8 м²" },
        { src: "photos/buy-house/5/2923278896-1.webp", layout: true, caption: "2 этаж · 4 спальни" },
        { src: "photos/buy-house/5/2923289025-1.webp", caption: "Дизайнерская отделка" },
        { src: "photos/buy-house/5/2923289050-1.webp", caption: "Дизайнерская отделка" },
        { src: "photos/buy-house/5/2923289028-1.webp", caption: "Панорамные окна" },
        { src: "photos/buy-house/5/2923289046-1.webp", caption: "Панорамные окна" },
        { src: "photos/buy-house/5/2923289003-1.webp", caption: "Второй свет" },
        { src: "photos/buy-house/5/2923289044-1.webp", caption: "Второй свет" },
        { src: "photos/buy-house/5/2923289007-1.webp", caption: "Второй свет" },
        { src: "photos/buy-house/5/2923289006-1.webp", caption: "Второй свет" },
        { src: "photos/buy-house/5/2923289043-1.webp", caption: "Второй свет" },
        { src: "photos/buy-house/5/2923289027-1.webp", caption: null },
        { src: "photos/buy-house/5/2923289012-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/5/2923276323-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/5/2923289016-1.webp", caption: "Второй свет" },
        { src: "photos/buy-house/5/2923289042-1.webp", caption: "Каркасный дом · 2024 г" },
        { src: "photos/buy-house/5/2923289024-1.webp", caption: "Терраса" },
        { src: "photos/buy-house/5/2923289031-1.webp", caption: "Участок · сохранён лес" },
        { src: "photos/buy-house/5/2923274165-1.webp", caption: "Участок · сохранён лес" },
      ],
    },
    "333715474": {
      // https://spb.cian.ru/sale/suburban/333715474/ — фото положить в photos/buy-house/6/
      category: "buy-house",
      order: 6,
      promo: "Дом в 300 м от Финского залива", // заголовок объявления
      hasLayout: false,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-house/6/2960535121-1.webp", caption: null },
        { src: "photos/buy-house/6/2960535174-1.webp", caption: "Дом полностью меблирован" },
        { src: "photos/buy-house/6/2960535208-1.webp", caption: "Дом полностью меблирован" },
        { src: "photos/buy-house/6/2960535149-1.webp", caption: "Дом полностью меблирован" },
        { src: "photos/buy-house/6/2960535186-1.webp", caption: "2 этажа · 170 м²" },
        { src: "photos/buy-house/6/2960535196-1.webp", caption: "Дом полностью меблирован" },
        { src: "photos/buy-house/6/2960534896-1.webp", caption: "Дом · 4 спальни" },
        { src: "photos/buy-house/6/2960534932-1.webp", caption: "Дом · 4 спальни" },
        { src: "photos/buy-house/6/2960534915-1.webp", caption: "300 м до Финского залива" },
        { src: "photos/buy-house/6/2960534951-1.webp", caption: "Участок в соснах" },
        { src: "photos/buy-house/6/2960534969-1.webp", caption: "Участок в соснах" },
        { src: "photos/buy-house/6/2960534983-1.webp", caption: "Участок в соснах" },
        { src: "photos/buy-house/6/2960535007-1.webp", caption: "Участок в соснах" },
        { src: "photos/buy-house/6/2960535017-1.webp", caption: "Участок в соснах" },
        { src: "photos/buy-house/6/2960535031-1.webp", caption: "Дом · построен в 2012 г" },
        { src: "photos/buy-house/6/2960535044-1.webp", caption: "Навес на 2 машины" },
        { src: "photos/buy-house/6/2960535055-1.webp", caption: "Навес на 2 машины" },
        { src: "photos/buy-house/6/2960535073-1.webp", caption: "Беседка с мангальной зоной" },
        { src: "photos/buy-house/6/2960535089-1.webp", caption: "Участок в соснах" },
        { src: "photos/buy-house/6/2960535115-1.webp", caption: "Беседка с мангальной зоной" },
      ],
    },
    "333549619": {
      // https://spb.cian.ru/sale/suburban/333549619/ — фото положить в photos/buy-house/7/
      category: "buy-house",
      order: 7,
      hasLayout: false,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/buy-house/7/2957085990-1.webp", caption: null },
        { src: "photos/buy-house/7/2957086008-1.webp", caption: "Камин на 1 этаже" },
        { src: "photos/buy-house/7/2957086026-1.webp", caption: "Отопление · печь и камин" },
        { src: "photos/buy-house/7/2957086040-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/7/2957086069-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/buy-house/7/2957086094-1.webp", caption: "Веранда" },
        { src: "photos/buy-house/7/2957085900-1.webp", caption: "Деревянный дом · 1997 г" },
        { src: "photos/buy-house/7/2957086155-1.webp", caption: "Деревянный дом · 1997 г" },
        { src: "photos/buy-house/7/2957085934-1.webp", caption: "Деревянный дом · 1997 г" },
        { src: "photos/buy-house/7/2957085917-1.webp", caption: "Баня на участке" },
        { src: "photos/buy-house/7/2957085977-1.webp", caption: "Деревянный дом · 1997 г" },
        { src: "photos/buy-house/7/2957086187-1.webp", caption: "Деревянный дом · 1997 г" },
        { src: "photos/buy-house/7/2957086075-1.webp", caption: "Деревянный дом · 1997 г" },
        { src: "photos/buy-house/7/2957086109-1.webp", caption: "Баня с бойлером" },
        { src: "photos/buy-house/7/2957086127-1.webp", caption: "Баня с бойлером" },
        { src: "photos/buy-house/7/2957086139-1.webp", caption: "Дровяник" },
        { src: "photos/buy-house/7/2957086208-1.webp", caption: "Летний водопровод" },
        { src: "photos/buy-house/7/2957086227-1.webp", caption: "СНТ «Наука»" },
        { src: "photos/buy-house/7/2957086239-1.webp", caption: "СНТ «Наука»" },
        { src: "photos/buy-house/7/2957086253-1.webp", caption: "СНТ «Наука»" },
      ],
    },
    "334357136": {
      // https://spb.cian.ru/rent/suburban/334357136/ — фото положить в photos/rent-house/1/
      category: "rent-house",
      order: 1,
      promo: "Кухня-гостиная 46 м²", // заголовок объявления
      hasLayout: false,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/rent-house/1/2974468387-1.webp", caption: null },
        { src: "photos/rent-house/1/2974468391-1.webp", caption: "Кухня-гостиная · 46 м²" },
        { src: "photos/rent-house/1/2974467012-1.webp", caption: "Кухня-гостиная · 46 м²" },
        { src: "photos/rent-house/1/2974468394-1.webp", caption: "Душевая в доме" },
        { src: "photos/rent-house/1/2974467025-1.webp", caption: "Евроремонт" },
        { src: "photos/rent-house/1/2974468392-1.webp", caption: "Евроремонт" },
        { src: "photos/rent-house/1/2974468390-1.webp", caption: "Вода из колодца" },
        { src: "photos/rent-house/1/2974467013-1.webp", caption: "Дом из бруса · 2022 г" },
        { src: "photos/rent-house/1/2974468410-1.webp", caption: "Дом из бруса · 2022 г" },
        { src: "photos/rent-house/1/2974467015-1.webp", caption: "Парковка на 2 машины" },
        { src: "photos/rent-house/1/2974468397-1.webp", caption: "Парковка на 2 машины" },
        { src: "photos/rent-house/1/2974468393-1.webp", caption: "Парковка на 2 машины" },
        { src: "photos/rent-house/1/2974468395-1.webp", caption: "Парковка на 2 машины" },
        { src: "photos/rent-house/1/2974468380-1.webp", caption: "Улица · чистят круглый год" },
      ],
    },
    "293652842": {
      // https://spb.cian.ru/rent/suburban/293652842/ — фото положить в photos/rent-house/2/
      category: "rent-house",
      order: 2,
      promo: "Уютный барн-хаус", // заголовок объявления
      hasLayout: false,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/rent-house/2/2023479107-1.webp", caption: null },
        { src: "photos/rent-house/2/2023479129-1.webp", caption: "Кухня-гостиная · 34 м²" },
        { src: "photos/rent-house/2/2023478992-1.webp", caption: "Кухня-гостиная · 34 м²" },
        { src: "photos/rent-house/2/2023479049-1.webp", caption: "Посудомоечная машина" },
        { src: "photos/rent-house/2/2023479045-1.webp", caption: "Кухня-гостиная · 34 м²" },
        { src: "photos/rent-house/2/2263264832-1.webp", caption: "Кухня-гостиная · 34 м²" },
        { src: "photos/rent-house/2/2023448490-1.webp", caption: "Душевая кабина" },
        { src: "photos/rent-house/2/2023478991-1.webp", caption: "Кухня-гостиная · 34 м²" },
        { src: "photos/rent-house/2/2023478984-1.webp", caption: "Кухня-гостиная · 34 м²" },
        { src: "photos/rent-house/2/2023479121-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/rent-house/2/2023479111-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/rent-house/2/2023478997-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/rent-house/2/2023479140-1.webp", caption: "Спальня · 4 в доме" },
        { src: "photos/rent-house/2/2023479043-1.webp", caption: "Дизайнерский ремонт" },
        { src: "photos/rent-house/2/2023441931-1.webp", caption: "Дизайнерский ремонт" },
        { src: "photos/rent-house/2/2263219275-1.webp", caption: "Дизайнерский ремонт" },
        { src: "photos/rent-house/2/2023479132-1.webp", caption: "Дизайнерский ремонт" },
        { src: "photos/rent-house/2/2023479093-1.webp", caption: null },
        { src: "photos/rent-house/2/2263417146-1.webp", caption: "Барн-хаус · 2023 г" },
        { src: "photos/rent-house/2/2023479096-1.webp", caption: "Барн-хаус · 2023 г" },
      ],
    },
    "334540014": {
      // https://spb.cian.ru/rent/suburban/334540014/ — фото положить в photos/rent-house/3/
      category: "rent-house",
      order: 3,
      promo: "Финский дом с сауной у леса", // заголовок объявления
      hasLayout: false,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/rent-house/3/2977997769-1.webp", caption: null },
        { src: "photos/rent-house/3/2977432004-1.webp", caption: "Кухня-гостиная" },
        { src: "photos/rent-house/3/2977997776-1.webp", caption: "Кофемашина" },
        { src: "photos/rent-house/3/2977997718-1.webp", caption: "Посудомоечная машина" },
        { src: "photos/rent-house/3/2977997771-1.webp", caption: "Кухня-гостиная" },
        { src: "photos/rent-house/3/2977428422-1.webp", caption: "Кухня-гостиная" },
        { src: "photos/rent-house/3/2977429000-1.webp", caption: "Санузел · своя сауна" },
        { src: "photos/rent-house/3/2977997715-1.webp", caption: "Санузел · своя сауна" },
        { src: "photos/rent-house/3/2977428998-1.webp", caption: "Душевая в доме" },
        { src: "photos/rent-house/3/2977429870-1.webp", caption: "Своя сауна" },
        { src: "photos/rent-house/3/2978307020-1.webp", caption: "Спальня · 3 в доме" },
        { src: "photos/rent-house/3/2977430859-1.webp", caption: "Спальня · 3 в доме" },
        { src: "photos/rent-house/3/2977430879-1.webp", caption: "Спальня · 3 в доме" },
        { src: "photos/rent-house/3/2978303611-1.webp", caption: "Спальня · 3 в доме" },
        { src: "photos/rent-house/3/2977428412-1.webp", caption: "Тёплый пол" },
        { src: "photos/rent-house/3/2977428406-1.webp", caption: "Кондиционер" },
        { src: "photos/rent-house/3/2977426919-1.webp", caption: "Каркасный дом · 2025 г" },
        { src: "photos/rent-house/3/2977427406-1.webp", caption: "Дом · 30 м до леса" },
        { src: "photos/rent-house/3/2977997770-1.webp", caption: "Зона для костра" },
        { src: "photos/rent-house/3/2977997775-1.webp", caption: "Видовая терраса" },
      ],
    },
    "334103703": {
      // https://spb.cian.ru/rent/suburban/334103703/ — фото положить в photos/rent-house/4/
      category: "rent-house",
      order: 4,
      promo: "Семейный дом у озера", // заголовок объявления
      hasLayout: false,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/rent-house/4/2968912992-1.webp", caption: null },
        { src: "photos/rent-house/4/2968912982-1.webp", caption: "Кухня · посудомойка" },
        { src: "photos/rent-house/4/2968914536-1.webp", caption: "Кухня · посудомойка" },
        { src: "photos/rent-house/4/2968906808-1.webp", caption: null },
        { src: "photos/rent-house/4/2968912991-1.webp", caption: null },
        { src: "photos/rent-house/4/2968906759-1.webp", caption: "Санузел · 2 в доме" },
        { src: "photos/rent-house/4/2968912975-1.webp", caption: "Газовое отопление" },
        { src: "photos/rent-house/4/2968906931-1.webp", caption: "Спальня · 5 в доме" },
        { src: "photos/rent-house/4/2968906762-1.webp", caption: "Спальня · 5 в доме" },
        { src: "photos/rent-house/4/2968912995-1.webp", caption: "Спальня · 5 в доме" },
        { src: "photos/rent-house/4/2968912980-1.webp", caption: "Спальня · 5 в доме" },
        { src: "photos/rent-house/4/2968912993-1.webp", caption: "Спальня · 5 в доме" },
        { src: "photos/rent-house/4/2968912988-1.webp", caption: "Спальня · 5 в доме" },
        { src: "photos/rent-house/4/2968913003-1.webp", caption: "Спальня · 5 в доме" },
        { src: "photos/rent-house/4/2968906837-1.webp", caption: "Спальня · 5 в доме" },
        { src: "photos/rent-house/4/2968912968-1.webp", caption: "Спальня · 5 в доме" },
        { src: "photos/rent-house/4/2968912981-1.webp", caption: null },
        { src: "photos/rent-house/4/2968906770-1.webp", caption: "Дом · 257 м²" },
        { src: "photos/rent-house/4/2968906805-1.webp", caption: "Газобетонный дом · 2017 г" },
        { src: "photos/rent-house/4/2968906875-1.webp", caption: "КП Коркинские Просторы" },
      ],
    },
    "292031022": {
      // https://spb.cian.ru/rent/suburban/292031022/ — фото положить в photos/rent-house/5/
      category: "rent-house",
      order: 5,
      promo: "Дом 100 м² в клубном посёлке", // заголовок объявления
      hasLayout: true,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/rent-house/5/1920013822-1.webp", caption: null },
        { src: "photos/rent-house/5/1919994984-1.webp", layout: true, caption: "Дом · 100 м²" },
        { src: "photos/rent-house/5/1920013793-1.webp", caption: "Кухня · посудомойка" },
        { src: "photos/rent-house/5/1920013804-1.webp", caption: "Кухня · посудомойка" },
        { src: "photos/rent-house/5/1920013797-1.webp", caption: "Кухня-гостиная" },
        { src: "photos/rent-house/5/1920015954-1.webp", caption: "Кухня-гостиная" },
        { src: "photos/rent-house/5/1920013795-1.webp", caption: "Кухня-гостиная" },
        { src: "photos/rent-house/5/1920013811-1.webp", caption: "Душевая и своя сауна" },
        { src: "photos/rent-house/5/1920013827-1.webp", caption: "Своя сауна" },
        { src: "photos/rent-house/5/1920013836-1.webp", caption: "Санузел в доме" },
        { src: "photos/rent-house/5/1920013808-1.webp", caption: "Санузел в доме" },
        { src: "photos/rent-house/5/1920013831-1.webp", caption: "Спальня · 2 в доме" },
        { src: "photos/rent-house/5/1920013809-1.webp", caption: "Спальня · 2 в доме" },
        { src: "photos/rent-house/5/1920013819-1.webp", caption: "Спальня · 2 в доме" },
        { src: "photos/rent-house/5/1920013796-1.webp", caption: "Дом обслуживает УК" },
        { src: "photos/rent-house/5/1920013810-1.webp", caption: "Дом обслуживает УК" },
        { src: "photos/rent-house/5/1920013830-1.webp", caption: null },
        { src: "photos/rent-house/5/1920013800-1.webp", caption: "Газовое отопление" },
        { src: "photos/rent-house/5/2100599356-1.webp", caption: "Рублёво · 2 км до озера" },
        { src: "photos/rent-house/5/2100599349-1.webp", caption: "Закрытый посёлок" },
      ],
    },
    "333446700": {
      // https://spb.cian.ru/rent/suburban/333446700/ — фото положить в photos/rent-house/6/
      category: "rent-house",
      order: 6,
      promo: "Новый дом, никто не проживал", // заголовок объявления
      hasLayout: true,
      kidsAllowed: true,
      petsAllowed: false,
      photos: [
        { src: "photos/rent-house/6/2954797820-1.webp", caption: null },
        { src: "photos/rent-house/6/2954797439-1.webp", layout: true, caption: "Дом · 3 спальни" },
        { src: "photos/rent-house/6/2954811607-1.webp", caption: "Кухня из массива дуба" },
        { src: "photos/rent-house/6/2954798079-1.webp", caption: "Кухня из массива дуба" },
        { src: "photos/rent-house/6/2954797922-1.webp", caption: "Кухня из массива дуба" },
        { src: "photos/rent-house/6/2954811605-1.webp", caption: "Кухня из массива дуба" },
        { src: "photos/rent-house/6/2954811603-1.webp", caption: "Кухня из массива дуба" },
        { src: "photos/rent-house/6/2954798248-1.webp", caption: "Кухня из массива дуба" },
        { src: "photos/rent-house/6/2954811600-1.webp", caption: "Санузел с ванной" },
        { src: "photos/rent-house/6/2954811599-1.webp", caption: "Санузел с ванной" },
        { src: "photos/rent-house/6/2954815625-1.webp", caption: "Умный дом" },
        { src: "photos/rent-house/6/2954815627-1.webp", caption: "Спальня · 3 в доме" },
        { src: "photos/rent-house/6/2954811604-1.webp", caption: "Каркасный дом · 2025 г" },
        { src: "photos/rent-house/6/2954811602-1.webp", caption: "Новый дом · 2025 г" },
        { src: "photos/rent-house/6/2954811596-1.webp", caption: "Новый дом · 2025 г" },
        { src: "photos/rent-house/6/2954811588-1.webp", caption: null },
        { src: "photos/rent-house/6/2954797433-1.webp", caption: "Дренаж и водоотвод" },
        { src: "photos/rent-house/6/2954815617-1.webp", caption: "Вода из скважины" },
        { src: "photos/rent-house/6/2954811595-1.webp", caption: "Видеонаблюдение" },
      ],
    },
    "331080137": {
      // https://spb.cian.ru/rent/suburban/331080137/ — фото положить в photos/rent-house/7/
      category: "rent-house",
      order: 7,
      promo: "Дом в соснах", // заголовок объявления
      hasLayout: false,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/rent-house/7/2901750699-1.webp", caption: null },
        { src: "photos/rent-house/7/2901760461-1.webp", caption: "Кухня · посудомойка" },
        { src: "photos/rent-house/7/2901750431-1.webp", caption: "Душевая в доме" },
        { src: "photos/rent-house/7/2901750428-1.webp", caption: "Душевая в доме" },
        { src: "photos/rent-house/7/2901760458-1.webp", caption: "Кухня-гостиная" },
        { src: "photos/rent-house/7/2901750520-1.webp", caption: "Газовое отопление" },
        { src: "photos/rent-house/7/2901750627-1.webp", caption: "Спальня · 3 в доме" },
        { src: "photos/rent-house/7/2901750571-1.webp", caption: "Спальня · 3 в доме" },
        { src: "photos/rent-house/7/2901760452-1.webp", caption: "Спальня · 3 в доме" },
        { src: "photos/rent-house/7/2901750620-1.webp", caption: "2 этажа · 140 м²" },
        { src: "photos/rent-house/7/2901750436-1.webp", caption: "Деревянный дом · 2015 г" },
        { src: "photos/rent-house/7/2901750691-1.webp", caption: "Деревянный дом · 2015 г" },
        { src: "photos/rent-house/7/2901750572-1.webp", caption: "Деревянный дом · 2015 г" },
        { src: "photos/rent-house/7/2901750713-1.webp", caption: "15 минут пешком до залива" },
        { src: "photos/rent-house/7/2901750640-1.webp", caption: "Мангальная зона" },
      ],
    },
  };

  // ---------- Лейблы под фото ----------
  // Только реальные факты: флаги Циана, isGoodPrice и «Условия проживания» из CURATED.
  function buildLabels(raw) {
    const labels = [];
    const curated = CURATED[raw.id];
    if (raw.isEarlyAccess) labels.push("Ранний доступ");
    if (raw.isGoodPrice) labels.push("Хорошая цена");
    if (curated && curated.kidsAllowed) labels.push("Можно с детьми");
    if (curated && curated.petsAllowed) labels.push("Можно с животными");
    if (raw.isRosreestrChecked) labels.push("Проверено в Росреестре");
    return labels;
  }

  // Детерминированное «случайное» число 0…1 от строки — для выбора аватарки
  function hashId(id, salt) {
    let h = 2166136261;
    for (const ch of id + salt) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return (h >>> 0) / 4294967296;
  }

  // ---------- Аватарки продавцов (photos/avatars) ----------
  // Агентства — свой логотип (AGENCY_LOGOS), у кого его нет — «Лабецкий Недвижимость».
  // Люди, у которых на Циане есть фото (hasAvatar), — одно из фото риелторов того же пола
  // (пол по имени), без фото и скрытые продавцы — заглушка. Выбор — от имени продавца,
  // чтобы у одного продавца везде была одна и та же аватарка.
  const AVATAR_DIR = "photos/avatars/";
  // Логотипы агентств по названию; кому своего нет — «Лабецкий Недвижимость»
  const AGENCY_LOGOS = [
    [/этажи/i, "Снимок экрана 2026-10-07 в 21.23.26.png"],
    [/svet/i, "Снимок экрана 2026-10-07 в 22.20.49.png"],
    [/bridge/i, "Снимок экрана 2026-10-07 в 22.21.01.png"],
    [/магнит/i, "Снимок экрана 2026-10-07 в 22.21.11.png"],
    [/sergeew/i, "Снимок экрана 2026-10-07 в 22.32.06.png"],
    [/пик/i, "Снимок экрана 2026-10-07 в 22.34.33.png"],
  ];
  const AGENCY_LOGO_DEFAULT = "Снимок экрана 2026-10-07 в 21.23.55.png";
  const REALTOR_PHOTOS = {
    female: ["Риелтор 1 · Анна.png", "Риелтор 3 · Мария.png", "Риелтор 5 · Дарья.png"],
    male: ["Риелтор 2 · Максим.png", "Риелтор 4 · Артём.png"],
  };
  const AVATAR_STUBS = ["^^.png"];
  const AGENCY_WORDS = /недвиж|агентств|бюро|риэлт|риелт|апарт|отель|сеть|групп|инвест|estate|realty/i;
  const MALE_NAMES_ON_A = ["никита", "илья", "кузьма", "фома", "лука", "савва", "данила"];

  function normalizeName(name) {
    return name.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  }

  // Человек: 2–4 слова кириллицей, все с заглавной или все строчные (бывает «анна пирогова»),
  // допускаются «ИП» и инициалы. Всё остальное («Сенатор», «SVET hotel», «Морской фасад») — агентство.
  function isPersonName(name) {
    const clean = normalizeName(name).replace(/^ИП /, "");
    // Латиница, цифры, кавычки и прочие символы — признак названия компании
    if (AGENCY_WORDS.test(clean) || /[^А-ЯЁа-яё.\- ]/.test(clean)) return false;
    const words = clean.split(" ");
    if (words.length < 2 || words.length > 4) return false;
    // «Анна», «Крейсс-Белова», инициалы «О.А.» / «О.»
    const capitalized = words.every((w) => /^([А-ЯЁ][а-яё]+(-[А-ЯЁа-яё][а-яё]+)*|[А-ЯЁ]\.([А-ЯЁ]\.?)?)$/.test(w));
    const lower = words.every((w) => /^[а-яё-]+$/.test(w));
    return capitalized || lower;
  }

  function isFemaleName(name) {
    const first = normalizeName(name).replace(/^ИП /, "").split(" ")[0].toLowerCase();
    return /[ая]$/.test(first) && !MALE_NAMES_ON_A.includes(first);
  }

  function pickBy(list, key) {
    return list[Math.floor(hashId(key, "avatar") * list.length)];
  }

  function findLogo(name) {
    const logo = name && AGENCY_LOGOS.find(([pattern]) => pattern.test(name));
    return logo ? AVATAR_DIR + logo[1] : null;
  }

  // Агентство: если Циан отдал тип аккаунта — по нему (isAgency), иначе по названию
  function isAgencySeller(raw) {
    if (typeof raw.isAgency === "boolean") return raw.isAgency;
    return Boolean(raw.agency) && !isPersonName(raw.agency);
  }

  function buildAvatar(raw) {
    // Агент компании (raw.company, напр. «Циан х ПИК-Аренда») — логотип компании
    const companyLogo = findLogo(raw.company);
    if (companyLogo) return companyLogo;
    const name = raw.agency;
    if (name && isAgencySeller(raw)) {
      return findLogo(name) || AVATAR_DIR + AGENCY_LOGO_DEFAULT;
    }
    const key = name || raw.id;
    if (name && raw.hasAvatar) {
      return AVATAR_DIR + pickBy(REALTOR_PHOTOS[isFemaleName(name) ? "female" : "male"], key);
    }
    return AVATAR_DIR + pickBy(AVATAR_STUBS, key);
  }

  // Роль продавца для строки контактов: агентство / собственник / агент
  function sellerRole(raw) {
    if (isAgencySeller(raw)) return "Агентство";
    return raw.isByHomeowner ? "Собственник" : "Агент";
  }

  function buildListings(rawOffers) {
    // order — порядок внутри категории (снять/купить × квартира/дом)
    const sorted = [...rawOffers].sort((x, y) => CURATED[x.id].order - CURATED[y.id].order);
    return sorted.map((raw) => ({
      ...raw,
      photos: CURATED[raw.id].photos, // [{ src, caption }]
      hasLayout: CURATED[raw.id].hasLayout,
      // Дома — населённый пункт/посёлок (locality), квартиры — улица и дом
      address: raw.locality || [raw.street, raw.house].filter(Boolean).join(", "),
      avatar: buildAvatar(raw),
      sellerRole: sellerRole(raw),
      promoLabel: CURATED[raw.id].promo || null,
      labels: buildLabels(raw),
      // Цена за м²: у продажи — за м² (выводится в сниппете), у аренды — годовая ставка
      // за м² (только для режима «за м²» в фильтре цены)
      pricePerSqm:
        raw.dealType === "sale" ? Math.round(raw.price / raw.area) : Math.max(100, Math.round((raw.price * 12) / raw.area / 100) * 100),
      // Класс — поле старого офисного фильтра, у жилья его нет
      officeClass: null,
    }));
  }

  const LISTINGS = buildListings(RAW_OFFERS);

  window.App = window.App || {};
  Object.assign(window.App, { RAW_OFFERS, CURATED, buildListings, LISTINGS });
})();
