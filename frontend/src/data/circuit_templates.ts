/** Circuit templates — bibliothèque pré-construite pour le Travel Designer */

export interface CircuitTemplate {
  id: string
  name: string
  subtitle: string
  type: 'luxury' | 'cultural' | 'adventure' | 'leisure' | 'mice'
  duration_days: number
  hotel_category: '5*' | '4*' | '3*' | 'Mix'
  meal_plan: 'FB' | 'HB' | 'BB'
  destinations: string[]
  km_total: number
  cost_per_pax_mad: number      // cost at 20 pax
  sell_per_pax_mad: number      // sell at 20 pax (18% margin)
  highlights: string[]
  cover_emoji: string
  days: TemplateDay[]
}

export interface TemplateDay {
  day: number
  city: string
  title: string
  hotel: string
  meal_plan: string
  km: number
  activities: string[]
  notes?: string
}

export const CIRCUIT_TEMPLATES: CircuitTemplate[] = [
  {
    id: 'imperial-7d',
    name: 'Villes Impériales 7J',
    subtitle: 'Le grand classique du Maroc',
    type: 'cultural',
    duration_days: 7,
    hotel_category: '5*',
    meal_plan: 'HB',
    destinations: ['Casablanca','Rabat','Meknès','Fès','Marrakech'],
    km_total: 720,
    cost_per_pax_mad: 9800,
    sell_per_pax_mad: 11565,
    highlights: ['Médina de Fès UNESCO','Palais Bahia Marrakech','Volubilis romain','Souks de Marrakech','Hassan II Casablanca'],
    cover_emoji: '🕌',
    days: [
      { day:1, city:'Casablanca', title:'Arrivée & Hassan II', hotel:'Four Seasons Casablanca', meal_plan:'HB', km:0, activities:['Mosquée Hassan II','Corniche Atlantic'] },
      { day:2, city:'Rabat', title:'Capitale Royale', hotel:'Sofitel Rabat Jardin des Roses', meal_plan:'HB', km:87, activities:['Kasbah des Oudaïas','Mausolée Mohammed V','Tour Hassan'] },
      { day:3, city:'Meknès & Fès', title:'Volubilis & Médina', hotel:'Palais Faraj Fès', meal_plan:'HB', km:210, activities:['Volubilis (site romain)','Bab Mansour','Arrivée Fès'] },
      { day:4, city:'Fès', title:'Plongée dans la Médina', hotel:'Palais Faraj Fès', meal_plan:'HB', km:0, activities:['Tanneries Chouara','Mosquée Karaouiyine','Souk Nejjarine','Musée Batha'] },
      { day:5, city:'Route du Sud', title:'Ifrane & Azrou', hotel:'Riad Salam Ouarzazate', meal_plan:'HB', km:320, activities:['Forêt de cèdres Azrou','Col du Zad','Khenifra'] },
      { day:6, city:'Marrakech', title:'Perle du Sud', hotel:'La Mamounia', meal_plan:'HB', km:103, activities:['Jardins Majorelle','Palais Bahia','Souk central'] },
      { day:7, city:'Marrakech', title:'Jemaa el-Fna & Départ', hotel:'La Mamounia', meal_plan:'BB', km:0, activities:['Jemaa el-Fna','Shopping Mellah','Transfert aéroport'] },
    ],
  },
  {
    id: 'sahara-10d',
    name: 'Grand Tour Sahara 10J',
    subtitle: 'Du nord au désert — l\'essentiel du Maroc',
    type: 'adventure',
    duration_days: 10,
    hotel_category: '4*',
    meal_plan: 'HB',
    destinations: ['Casablanca','Fès','Midelt','Merzouga','Ouarzazate','Marrakech'],
    km_total: 1820,
    cost_per_pax_mad: 14200,
    sell_per_pax_mad: 16756,
    highlights: ['Erg Chebbi / Dunes Merzouga','Nuit sous la tente Sahara','Aït-Ben-Haddou UNESCO','Gorges du Dadès','Caravane chameau coucher de soleil'],
    cover_emoji: '🐪',
    days: [
      { day:1, city:'Casablanca', title:'Arrivée', hotel:'Hyatt Regency Casablanca', meal_plan:'HB', km:0, activities:['Transfert hôtel','Hassan II vue extérieure'] },
      { day:2, city:'Fès', title:'Cœur de l\'histoire', hotel:'Riad Laaroussa', meal_plan:'HB', km:290, activities:['Médina de Fès','Tanneries Chouara','Fondouk Nejjarine'] },
      { day:3, city:'Midelt', title:'Traversée du Moyen Atlas', hotel:'Hôtel Ayachi', meal_plan:'HB', km:295, activities:['Col Zad','Source Vittel Aïn Soltane','Midelt pommes'] },
      { day:4, city:'Erfoud / Merzouga', title:'Aux portes du Sahara', hotel:'Kasbah Mohayut', meal_plan:'HB', km:340, activities:['Source Bleue Meski','Tafilalt','Arrivée dunes Erg Chebbi'] },
      { day:5, city:'Merzouga', title:'Nuit des étoiles', hotel:'Sahara Luxury Camp', meal_plan:'FB', km:20, activities:['Caravane chameau coucher soleil','Bivouac berbère','Lever soleil sur les dunes'] },
      { day:6, city:'Boumalne / Dades', title:'Gorges extraordinaires', hotel:'Xaluca Dades', meal_plan:'HB', km:280, activities:['Gorges du Dadès','Roses de Kelaa M\'Gouna','Gorges du Todra'] },
      { day:7, city:'Ouarzazate', title:'Hollywood berbère', hotel:'Berbère Palace', meal_plan:'HB', km:165, activities:['Aït-Ben-Haddou (UNESCO)','Studios CLA','Kasbah Taourirt'] },
      { day:8, city:'Marrakech', title:'Col de Tichka', hotel:'La Mamounia', meal_plan:'HB', km:203, activities:['Col Tichka (2260m)','Télouet Kasbah','Arrivée Marrakech'] },
      { day:9, city:'Marrakech', title:'Journée libre', hotel:'La Mamounia', meal_plan:'HB', km:0, activities:['Majorelle','Palais Royal','Souk médina','Hammam'] },
      { day:10, city:'Marrakech', title:'Départ', hotel:'—', meal_plan:'BB', km:0, activities:['Transfert RAK aéroport'] },
    ],
  },
  {
    id: 'luxe-circuit-8d',
    name: 'Luxury Maroc 8J',
    subtitle: 'Palaces & expériences exclusives',
    type: 'luxury',
    duration_days: 8,
    hotel_category: '5*',
    meal_plan: 'FB',
    destinations: ['Casablanca','Rabat','Fès','Marrakech','Essaouira'],
    km_total: 850,
    cost_per_pax_mad: 28500,
    sell_per_pax_mad: 33630,
    highlights: ['Royal Mansour Marrakech','Dîner privé Riad Fès','Atelier cuisine Maison Arabe','Hammam traditionnel','Polo & golf Marrakech'],
    cover_emoji: '👑',
    days: [
      { day:1, city:'Casablanca', title:'Arrivée VIP', hotel:'Four Seasons Casablanca', meal_plan:'FB', km:0, activities:['Accueil personnalisé','Dîner gastronomique La Sqala'] },
      { day:2, city:'Rabat', title:'Cité Royale Classée UNESCO', hotel:'Sofitel Rabat Jardin des Roses', meal_plan:'FB', km:87, activities:['Visite privée Kasbah des Oudaïas','Mausolée Mohammed V','Chellah','Dîner Chef étoilé'] },
      { day:3, city:'Fès', title:'Immersion médiévale', hotel:'Riad Fès — Relais & Châteaux', meal_plan:'FB', km:186, activities:['Guide privé médina','Maison des arts Nejjarine','Tanneries vue privée','Fassi cooking class'] },
      { day:4, city:'Fès', title:'Journée culture & spa', hotel:'Riad Fès — Relais & Châteaux', meal_plan:'FB', km:0, activities:['Atelier zellige artisan','Dar Batha musée','Spa hammam royal','Dîner Riad Dar Roumana'] },
      { day:5, city:'Marrakech', title:'La Ville Rouge', hotel:'Royal Mansour Marrakech', meal_plan:'FB', km:340, activities:['Vol privé Fès-Marrakech','Arrivée Royal Mansour','Spa & piscine privée'] },
      { day:6, city:'Marrakech', title:'Palaces & Jardins', hotel:'Royal Mansour Marrakech', meal_plan:'FB', km:0, activities:['Jardin Majorelle privé AM','Atelier cuisine Maison Arabe','Dîner rooftop El Fenn'] },
      { day:7, city:'Essaouira', title:'Cité des Vents UNESCO', hotel:'Heure Bleue Palais', meal_plan:'FB', km:180, activities:['Médina Essaouira','Port artisanal','Gnawa music','Dîner poissons frais'] },
      { day:8, city:'Marrakech', title:'Départ Prestige', hotel:'—', meal_plan:'BB', km:180, activities:['Retour Marrakech','Shopping Majorelle','Transfert RAK'] },
    ],
  },
  {
    id: 'mice-5d',
    name: 'MICE Incentive 5J',
    subtitle: 'Team building & réunions exécutives',
    type: 'mice',
    duration_days: 5,
    hotel_category: '5*',
    meal_plan: 'FB',
    destinations: ['Marrakech','Ouarzazate'],
    km_total: 406,
    cost_per_pax_mad: 18500,
    sell_per_pax_mad: 21830,
    highlights: ['Séminaire Palmeraie Golf','Soirée Fantasia privée','Raid 4×4 Ouarzazate','Gala dinner Chez Ali','Cooking team challenge'],
    cover_emoji: '🎯',
    days: [
      { day:1, city:'Marrakech', title:'Arrivée & Welcome Cocktail', hotel:'Sofitel Marrakech', meal_plan:'FB', km:0, activities:['Check-in suite exécutive','Welcome cocktail rooftop','Gala dîner 1001 Nuits'] },
      { day:2, city:'Marrakech', title:'Séminaire & Team Building', hotel:'Sofitel Marrakech', meal_plan:'FB', km:0, activities:['Séminaire salle plénière','Cooking challenge équipes','Déjeuner Palmeraie Golf'] },
      { day:3, city:'Ouarzazate', title:'Raid 4×4 & Kasbah', hotel:'Berbère Palace', meal_plan:'FB', km:203, activities:['Convoi 4×4 Tichka','Aït-Ben-Haddou','Dîner kasba étoiles'] },
      { day:4, city:'Marrakech', title:'Libre & Gala Final', hotel:'Sofitel Marrakech', meal_plan:'FB', km:203, activities:['Spa & golf libre','Cérémonie remise prix','Soirée Fantasia Chez Ali'] },
      { day:5, city:'Marrakech', title:'Départ', hotel:'—', meal_plan:'BB', km:0, activities:['Transfert groupes RAK'] },
    ],
  },
  {
    id: 'nord-chefchaouen-5d',
    name: 'Nord Bleu 5J',
    subtitle: 'Tanger, Tétouan & Chefchaouen',
    type: 'leisure',
    duration_days: 5,
    hotel_category: '4*',
    meal_plan: 'HB',
    destinations: ['Tanger','Tétouan','Chefchaouen','Fès'],
    km_total: 480,
    cost_per_pax_mad: 7200,
    sell_per_pax_mad: 8496,
    highlights: ['Médina bleue Chefchaouen','Détroit de Gibraltar','Grottes d\'Hercule','Souk de Tétouan','Cap Spartel'],
    cover_emoji: '🔵',
    days: [
      { day:1, city:'Tanger', title:'Détroit de Gibraltar', hotel:'Hilton Tanger City Center', meal_plan:'HB', km:0, activities:['Cap Spartel','Grottes d\'Hercule','Médina Tanger','Café Hafa'] },
      { day:2, city:'Tétouan', title:'Médina Blanche', hotel:'Barceló Tetouan', meal_plan:'HB', km:55, activities:['Médina Tétouan (UNESCO)','Musée Archéologique','Souk couturiers'] },
      { day:3, city:'Chefchaouen', title:'La Perle Bleue', hotel:'Lina Ryad & Spa', meal_plan:'HB', km:65, activities:['Médina bleue libre','Fontaine Ras El Maa','Mosquée Grande','Souvenirsartisanat'] },
      { day:4, city:'Chefchaouen → Fès', title:'Jbala & Moyen Atlas', hotel:'Palais Faraj Fès', meal_plan:'HB', km:200, activities:['Route Jbala','Oued Laou paysage','Arrivée Fès médina'] },
      { day:5, city:'Fès', title:'Départ', hotel:'—', meal_plan:'BB', km:160, activities:['Médina matin libre','Tanneries','Transfert aéroport FEZ ou CMN'] },
    ],
  },
]

export const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  luxury: '⭐ Luxe',
  cultural: '🎭 Culturel',
  adventure: '🏔 Aventure',
  leisure: '🏖 Loisirs',
  mice: '🎯 MICE',
}

export const TEMPLATE_TYPE_COLORS: Record<string, string> = {
  luxury: 'bg-amber-100 text-amber-800 border-amber-300',
  cultural: 'bg-violet-100 text-violet-800 border-violet-300',
  adventure: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  leisure: 'bg-sky-100 text-sky-800 border-sky-300',
  mice: 'bg-rose-100 text-rose-800 border-rose-300',
}
