
export interface StarterFact {
  service: string; // must equal services.name_en
  category: 'fee' | 'requirement' | 'step' | 'contact' | 'office' | 'deadline' | 'update' | 'other';
  en: string;
  am?: string;
  url: string;
  label: string;
  note?: string;
}

export const STARTER_FACTS: StarterFact[] = [
  // ---- Kebele ID & Vital Events (Fayda national digital ID) ----
  {
    service: 'Kebele ID & Vital Events', category: 'step',
    en: 'Fayda, Ethiopia\'s national digital ID, is registered in person at a Fayda registration center, where you give your biometric data and approved documents.',
    url: 'https://id.gov.et/services', label: 'National ID Program (id.gov.et)',
    note: 'Fayda is the national digital ID. It is described on the official Fayda page, not the local Kebele ID card.',
  },
  {
    service: 'Kebele ID & Vital Events', category: 'step',
    en: 'After you register for Fayda, you receive your unique 12-digit Fayda Identification Number (FIN) by SMS on your mobile phone.',
    url: 'https://id.gov.et/services', label: 'National ID Program (id.gov.et)',
  },
  {
    service: 'Kebele ID & Vital Events', category: 'step',
    en: 'A Fayda digital copy can be offered through the telebirr mini app, and a physical Fayda card can be requested and printed through the Card Print service at id.gov.et/cardprint.',
    url: 'https://id.gov.et/services', label: 'National ID Program (id.gov.et)',
  },
  {
    service: 'Kebele ID & Vital Events', category: 'step',
    en: 'If you made a mistake in your Fayda demographic details during registration, you can correct it online at id.gov.et/update. Changes that differ from what you wrote on your registration consent form must be made in person at a Fayda update center with the required legal documents.',
    url: 'https://id.gov.et/services', label: 'National ID Program (id.gov.et)',
  },
  {
    service: 'Kebele ID & Vital Events', category: 'contact',
    en: 'Fayda National ID Program support: phone +251 113 720 006, email info@id.et, USSD hotline 9779. Office: Grand Palace Parking, Menelik II Avenue, 2nd floor, office 23, Addis Ababa.',
    url: 'https://id.gov.et/services', label: 'National ID Program (id.gov.et)',
  },

  // ---- Driving License (Addis Ababa DVLCA) ----
  {
    service: 'Driving License', category: 'step',
    en: 'In Addis Ababa, the Driver and Vehicle Licensing Control Authority (DVLCA) branch offices handle driver\'s license renewal, license replacement, verification of a license for drivers travelling abroad, transfer of a driver\'s file from Addis Ababa to a region, the theory exam and re-booking it after failing, lifting a license suspension, and driver information.',
    am: 'በአዲስ አበባ የአሽከርካሪ ተሽከርካሪ ፈቃድ ቁጥጥር ባለስልጣን (DVLCA) ቅርንጫፍ ጽ/ቤቶች የአሽከርካሪ ብቃት ማረጋገጫ ፈቃድ እድሳት፣ ምትክ፣ ወደ ውጪ ሃገር ለሚሄዱ አሽከርካሪዎች የፈቃድ ትክክለኛነት ማረጋገጫ፣ ከአዲስ አበባ ወደ ክልል የፋይል ዝውውር፣ የንድፈ ሃሳብ ምዘና እና ለወደቁ ድጋሚ ቀጠሮ፣ እንዲሁም የፈቃድ እግድ ማንሳት አገልግሎት ይሰጣሉ።',
    url: 'https://dvlca.gov.et', label: 'Addis Ababa DVLCA (dvlca.gov.et)',
    note: 'Applies to Addis Ababa. Other regions have their own offices.',
  },
  {
    service: 'Driving License', category: 'contact',
    en: 'Addis Ababa DVLCA contact: toll-free 7766, phones 0116672315 and 0116672329, email info@dvlca.gov.et. Address: Meklit Building, on the road to Megenagna, Addis Ababa.',
    am: 'የአዲስ አበባ አሽከርካሪ ተሽከርካሪ ፈቃድ ቁጥጥር ባለስልጣን፡ ነፃ መስመር 7766፣ ስልክ 0116672315 እና 0116672329፣ ኢሜይል info@dvlca.gov.et። አድራሻ፡ ወደ መገናኛ መንገድ፣ መክሊት ህንፃ።',
    url: 'https://dvlca.gov.et', label: 'Addis Ababa DVLCA (dvlca.gov.et)',
  },

  // ---- Passport (ICS) ----
  {
    service: 'Passport Services', category: 'step',
    en: 'Passport applications are made online through the Immigration and Citizenship Service (ICS) application portal at immigration.gov.et, and you can check your application status at passport.ics.gov.et.',
    url: 'https://ics.gov.et/information/', label: 'ICS Information Center (ics.gov.et)',
  },
  {
    service: 'Passport Services', category: 'requirement',
    en: 'The ICS Information Center publishes separate guides listing the documents needed to get a new passport, renew an expired passport, replace a lost passport, and correct passport details.',
    url: 'https://ics.gov.et/information/', label: 'ICS Information Center (ics.gov.et)',
    note: 'Pointer fact. Open each ICS guide with the scraper (Sources > ICS Information Center) to capture the actual document lists.',
  },
  {
    service: 'Passport Services', category: 'step',
    en: 'ICS offers an urgent passport renewal where you apply online and collect the passport in person.',
    url: 'https://ics.gov.et/information/', label: 'ICS Information Center (ics.gov.et)',
  },
  {
    service: 'Passport Services', category: 'fee',
    en: 'Immigration and Citizenship Service fees were revised by Council of Ministers Regulation 550/2024, and ICS publishes its current fee list in the Information Center.',
    url: 'https://ics.gov.et/information/', label: 'ICS Information Center (ics.gov.et)',
  },

  // ---- Business License (from official e-Trade Telegram posts, early 2025) ----
  {
    service: 'Business License Registration', category: 'step',
    en: 'Business licenses are renewed online through the e-Trade portal at etrade.gov.et.',
    url: 'https://t.me/etrade_gov_et', label: 'e-Trade official Telegram channel',
    note: 'From posts in early 2025. Confirm it is still current.',
  },
  {
    service: 'Business License Registration', category: 'step',
    en: 'Business license service fees can be paid with telebirr or through the Commercial Bank of Ethiopia. After paying, use the "Print Certificate" button on the e-Trade portal to get your certificate.',
    url: 'https://t.me/etrade_gov_et', label: 'e-Trade official Telegram channel',
    note: 'From posts in early 2025. Confirm it is still current.',
  },
  {
    service: 'Business License Registration', category: 'deadline',
    en: 'Renewing a business license after the renewal period has ended carries a late-renewal penalty, so renew within the period.',
    url: 'https://t.me/etrade_gov_et', label: 'e-Trade official Telegram channel',
    note: 'From posts in early 2025. The penalty amounts were not captured, so do not quote numbers.',
  },
];
