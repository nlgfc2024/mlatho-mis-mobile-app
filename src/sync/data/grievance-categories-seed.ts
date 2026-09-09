export interface SeedCategory {
  name: string;
  timeline: number;
  types: string[];
}

export const grievanceCategoriesSeed: SeedCategory[] = [
  {
    name: "Malipo kwa walengwa wa mpango",
    timeline: 60,
    types: [
      "Kukosa Malipo ya Ruzuku ya msingi  (PCT)",
      "Kukosa Malipo ya ajira za muda (CS-PW)",
      "Kukosa Malipo ya Ruzuku ya Uzalishaji mali  (EEI )",
      "Malipo Pungufu ya Ruzuku ya msingi  ( PCT)",
      "Malipo pungufu ya ajira za muda (CS-PW)",
      "Malipo Pungufu ya Ruzuku ya uzalishaji mali ( EEI)",
      "Kuchelewa Malipo ya ruzuku ya msingi (PCT)",
      "Kuchelewa Malipo ya ajira za muda (CS-PW)",
      "Kuchelewa Malipo ya ruzuku ya uzalishaji mali  (EEI)",
      "Changamoto ya kupokea malipo",
      "Kaya kusimamishiwa malipo (suspended from payment)",
    ],
  },
  {
    name: "Malipo kwa wasio walengwa wa mpango",
    timeline: 45,
    types: ["Kukosa malipo/kutolipwa", "Kupokea malipo pungufu", "Kuchelewa kwa Malipo"],
  },
  {
    name: "Utambuzi na Uhakiki wa kaya",
    timeline: 21,
    types: [
      "Kaya kutotambuliwa kabisa",
      "Jina la kaya kutoingizwa kwenye orodha ya awali (TF3) yaliyopendekezwa",
      "Jina la kaya kuondolewa kwenye orodha ya mwisho (TF4) iliyopitishwa",
      "Kaya kutoingiziwa taarifa kwenye kishkwambi/kutododoswa kwa sababu yoyote ile",
      "Kuingizwa kwenye mpango kwa kaya isiyo na vigezo",
      "Kaya kutokuhakikiwa / kufanyiwa tathmini",
      "Kaya imehakikiwa haipo kwenye orodha ya malipo",
    ],
  },
  {
    name: "Kuhuisha taarifa za  walengwa",
    timeline: 21,
    types: [
      "Mtoto aliyezaliwa  kukosekana kwenye orodha ya kaya",
      "Wanafunzi kutokuwepo kwenye orodha ya kaya",
      "Mtoto kutokubadilishiwa kituo cha huduma",
      "Kutofanya mabadiliko ya hadhi ya wana kaya (mfano: kuhama kaya au kifo)",
      "Kutoingiza wanakaya wapya waliohamia",
      "Kutobadilisha mwakilishi wa kaya",
      "Kutorekebisha taarifa za wanakaya",
    ],
  },
  {
    name: "Huduma zisizoridhisha",
    timeline: 45,
    types: [
      "Malalamiko yasiyotatuliwa kwa wakati",
      "Kukosa ushauri wa kitaalamu kuhusu kilimo, ufugaji na ujasiriamali",
      "Utovu wa nidhamu wa watumishi",
      "Watumishi kutumia lugha chafu",
      "Kunyimwa haki au  huduma kutokana na ubaguzi",
    ],
  },
  {
    name: "Unyanyasaji wa kijinisia usiohusu Unyanyasaji/uonevu/udhalilishaji wa kingono",
    timeline: 60,
    types: [
      "Matukio ya kushambuliwa kimwili",
      "Matusi au unyanyasaji wa maneno",
      "Ubaguzi wa kijinsia",
      "Unyanyasaji wa kiuchumi",
      "Changamoto za urithi",
    ],
  },
  {
    name: "Unyanyasaji wa kijinisia unaohusu Unyanyasaji/uonevu/udhalilishaji wa kingono",
    timeline: 0,
    types: ["Unyanyasaji wa kingono", "Uonevu au udhalilishaji wa kingono"],
  },
  {
    name: "Mazingira",
    timeline: 21,
    types: [
      "Udhibiti duni wa uchafuzi wa vumbi",
      "Usimamizi duni wa taka",
      "Ukosefu wa vifaakinga vya kutosha (PPE)",
      "Kuumia wakati wa kazi na kutopata huduma stahiki za kitabibu",
    ],
  },
  {
    name: "Maswala ya Ardhi",
    timeline: 60,
    types: [
      "Migogoro ya umiliki wa ardhi iliyotwaliwa",
      "Migogoro kuhusu ukubwa wa ardhi",
      "Migogoro ya mipaka ya ardhi",
    ],
  },
  {
    name: "Maswali, mahitaji na maoni",
    timeline: 14,
    types: [
      "Maswali, mapendekezo, au mashaka kuhusu programu",
      "Kukosa kitambulisho au namba za NIDA",
      "Kukosa mikopo elimu ya juu",
      "Maulizo kuhusu taratibu za mpango",
      "Kusahau neno la siri la akaunti",
      "Kutopata kadi ya bima ya afya baada ya kukamilisha malipo",
      "Utapeli",
      "Kupoteza simu kadi au kadi ya benki",
    ],
  },
];
