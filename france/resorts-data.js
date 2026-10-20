// Official resort/operator facts checked 20 October 2026.
// Qualitative trip-fit, snow, intermediate and crowd judgments are our editorial assessment.
const FRENCH_RESORTS = [
 {
  id:'val-thorens',name:'Val Thorens',domain:'Val Thorens–Orelle · Les 3 Vallées',
  fit:'Snow-first skiing & lively après',fitNote:'Highest village of these three; convenient for a slopeside week.',
  village:'2,300 m',summit:'3,230 m',altitudeNote:'Village height is not the lowest piste altitude.',
  localKm:'150 km',localLabel:'Local · Val Thorens–Orelle',linkedKm:'600 km',linkedLabel:'Linked · Les 3 Vallées',
  intermediateRating:'Strong',intermediate:'Long blue/red cruising in high, open terrain.',gradeNote:'Current local blue/red split not verified consistently.',
  snowRating:'Strong',snow:'Strongest altitude buffer here: operator says 99% above 2,000 m.',
  apresRating:'Strong',apres:'Lively resort and a mountain Folie Douce.',
  folieLabel:'Ski / snowboard only',folie:'Plein Sud / Pionniers sector. Official venue and resort guidance excludes pedestrians.',pedestrian:false,
  returnNote:'No pedestrian Folie return is promised. Ski access and the route home depend on open pistes and operating times.',
  crowd:'Watch the hubs',crowdNote:'Popular lift bases and the Folie area can be busy; no verified queue-time ranking.',
  tradeoff:'High, open slopes mean wind and flat light can matter. Folie is a poor fit for non-skiers.',
  stays:['l-oxalys','koh-i-nor'],
  notes:['150 km is the Val Thorens–Orelle local-pass area, already included within the 600 km Les 3 Vallées total. Do not add the two figures.','The village is at 2,300 m and the ski summit is 3,230 m. Lower runs exist; 2,300 m is not presented as the terrain minimum.','The snow label is a typical late-January planning judgment from altitude, not a forecast or guarantee. Cold, wind, visibility and lift closures still matter.'],
  sources:[
   {label:'Resort · ski area & terrain scope',url:'https://www.valthorens.com/en/ski/domaine-skiable/'},
   {label:'Lift operator · altitude & high terrain',url:'https://ski.valthorens.com/en/val-thorens/'},
   {label:'Resort FAQ · no pedestrian Folie access',url:'https://www.valthorens.com/questions-frequentes/'},
   {label:'Folie Douce · ski-only access',url:'https://www.lafoliedouce.com/en/val-thorens-contacts-booking.html'}
  ]
 },
 {
  id:'meribel',name:'Méribel',domain:'Méribel valley · Les 3 Vallées',
  fit:'Central base for roaming the 3 Vallées',fitNote:'Chalet atmosphere, with routes towards both neighbouring valleys.',
  village:'1,450 m',summit:'2,952 m',altitudeNote:'Méribel Centre · Mottaret is 1,750 m. Summit: Mont Vallon.',
  localKm:'≈ 150 km',localLabel:'Local · Méribel valley',linkedKm:'600 km',linkedLabel:'Linked · Les 3 Vallées',
  intermediateRating:'Strong',intermediate:'Varied blue/red skiing, with central access to other valleys.',gradeNote:'Current local blue/red split not verified consistently.',
  snowRating:'Good',snow:'High sectors help; tourist office says 85% of the area is above 1,800 m.',
  apresRating:'Strong',apres:'Village bars plus Folie Douce above the resort.',
  folieLabel:'Pedestrian lift access',folie:'Saulire Express intermediate station, from Chaudanne in Méribel Centre.',pedestrian:true,
  returnNote:'A pedestrian return ticket is offered. Check the final descent; Mottaret and other valleys need onward planning.',
  crowd:'Watch the connections',crowdNote:'Base lifts, cross-valley links and afternoon return routes can concentrate traffic.',
  tradeoff:'Lower returns are more temperature-sensitive than Val Thorens; roaming needs a last-lift plan.',
  stays:['chalet-snowbel','le-merilys'],
  notes:['About 150 km covers the Méribel valley; the linked 600 km includes that valley. The larger number is not terrain immediately above one chalet.','Centre is at 1,450 m and Mottaret at 1,750 m. Mont Vallon is the 2,952 m summit; it is not Saulire. Village and ski summit heights are different measurements.','The snow label refers to typical late January, not known January 2027 conditions. High terrain is an advantage, while lower home runs remain more sensitive to warm spells.'],
  sources:[
   {label:'3 Vallées · Méribel villages & local / linked scope',url:'https://reservation.les3vallees.com/en/les-3-vallees-resorts/meribel'},
   {label:'Méribel tourism · terrain & high-altitude share',url:'https://www.meribel.net/en/ski-area/'},
   {label:'Official piste map · Mont Vallon summit',url:'https://www.les3vallees.com/media/download/plan-meribel.pdf'},
   {label:'Folie Douce · pedestrian Saulire Express access',url:'https://www.lafoliedouce.com/en/meribel-courchevel-contact-booking.html'}
  ]
 },
 {
  id:'alpe-d-huez',name:'Alpe d’Huez',domain:'Connected Espace Alpe d’Huez',
  fit:'High-mountain variety & chalet choices',fitNote:'A broad connected domain with a sunny resort base.',
  village:'1,860 m',summit:'3,330 m',altitudeNote:'Alpe d’Huez resort, not Huez village. Connected area: 1,300–3,330 m.',
  localKm:'250 km',localLabel:'Connected · Espace Alpe d’Huez',linkedKm:null,linkedLabel:'Five linked resorts; not just the Alpe d’Huez sector.',
  intermediateRating:'Strong',intermediate:'31 blue + 30 red runs in the connected domain.',gradeNote:'Official run counts, not kilometres. Summit classics can be black runs.',
  snowRating:'Good',snow:'High-altitude options help; sunny and lower slopes can soften faster.',
  apresRating:'Strong',apres:'Mountain Folie Douce plus bars back in the resort.',
  folieLabel:'Pedestrian lift access',folie:'Marmottes plateau, reached by the Marmottes telemix from Les Bergers.',pedestrian:true,
  returnNote:'A pedestrian lift pass is required. Reconfirm the final descent; the exact non-ski route to each property is unverified.',
  crowd:'Watch the main hubs',crowdNote:'Busy base lifts and summit access are the main planning pinch points; no measured queue forecast.',
  tradeoff:'Lower and south-facing slopes are more thaw-sensitive; the highest headline runs are not all blue/red cruising.',
  stays:['chalet-rebeque','chalet-valentine','milou'],
  notes:['250 km is the entire connected Espace Alpe d’Huez, including Oz, Vaujany, Auris and Villard-Reculas. A separate Alpe d’Huez-only kilometre subtotal was not verified.','The operator gives a connected ski-area range of 1,300–3,330 m, separate from the 1,860 m resort altitude. Les Deux Alpes and La Grave are not added as ski-linked terrain.','The operator lists 31 blue and 30 red runs. These counts are not piste kilometres and should not be compared as mileage. Higher summit terrain does not mean every summit descent suits intermediates.'],
  sources:[
   {label:'Lift operator · terrain scope & blue / red run counts',url:'https://skipass.alpedhuez.com/en/winter/alpe-dhuez-ski-holidays/'},
   {label:'Official piste map · ski-area altitude range',url:'https://skipass.alpedhuez.com/hiver/domaine-skiable/plan-des-pistes/'},
   {label:'Tourist office · resort facts',url:'https://reservation.alpedhuez.com/infos-domaine/station/'},
   {label:'Folie Douce · Marmottes pedestrian access',url:'https://www.lafoliedouce.com/fr/alpe-huez-contact-reservation.html'}
  ]
 }
];
