import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase.config';
import { KnowledgeService } from '../knowledge/knowledge.service';

/**
 * VERIFIED = checked against a source (see `source`).
 * UNVERIFIED = carried over from the old seed; confirm with the office before trusting it.
 * Amharic text is a clean rewrite and still needs review by a native speaker.
 */
const SEED_DATA = [
  {
    serviceName: 'Passport Services',
    chunks: [
      {
        // VERIFIED (Regulation No. 550/2024, via law-firm summary). Re-check on ICS before launch.
        source: 'Regulation No. 550/2024 summary (dmethiolawyers.com)',
        en: "Passport fees in Ethiopia: a new passport or renewal costs 5,000 ETB. Urgent issuance costs 20,000 ETB for delivery within 5 days or 25,000 ETB within 2 days. Replacing a lost passport costs 13,000 ETB. Applying from abroad costs 200 USD at an embassy, 250 USD online, and 350 USD for urgent requests. Fees can change, so confirm with the Immigration and Citizenship Service (ICS).",
        am: "የፓስፖርት ክፍያ፡ አዲስ ፓስፖርት ወይም እድሳት 5,000 ብር ነው። አስቸኳይ አገልግሎት በ5 ቀናት ውስጥ ለማግኘት 20,000 ብር፣ በ2 ቀናት ውስጥ ለማግኘት 25,000 ብር ነው። የጠፋ ፓስፖርት መተኪያ 13,000 ብር ነው። ከውጭ ሀገር ለሚያመለክቱ በኤምባሲ 200 የአሜሪካ ዶላር፣ በኦንላይን 250 ዶላር፣ አስቸኳይ ከሆነ 350 ዶላር ነው። ክፍያ ሊቀየር ስለሚችል ከኢሚግሬሽንና ዜግነት አገልግሎት (ICS) ያረጋግጡ።",
      },
         {
        // VERIFIED (ICS announcement, January 2026) for the online process; document list is from an older report.
        source: 'ICS announcement (ics.gov.et, Jan 2026) + Addis Fortune 2019 for documents',
        en: "Passport application in Ethiopia: new passports, renewals, lost or damaged passports, corrections, and both regular and urgent e-passport services are requested by registering on the ICS online portal (immigration.gov.et), and the service is available at all ICS branch offices including Addis Ababa. Applicants have typically been asked to present a Kebele ID and a birth certificate, along with passport-size photos. The exact document list may have changed, so confirm with ICS (free call 8133) before you go.",
        am: "በኢትዮጵያ አዲስ ፓስፖርት፣ እድሳት፣ የጠፋ ወይም የተበላሸ ፓስፖርት፣ እርማት እንዲሁም መደበኛና አስቸኳይ ኢ-ፓስፖርት አገልግሎቶች በኢሚግሬሽንና ዜግነት አገልግሎት (ICS) የኦንላይን ድረ ገጽ (immigration.gov.et) በመመዝገብ ይጠየቃሉ፤ አገልግሎቱ አዲስ አበባን ጨምሮ በሁሉም የICS ቅርንጫፍ ቢሮዎች ይሰጣል። ብዙውን ጊዜ የቀበሌ መታወቂያ፣ የልደት ምስክር ወረቀት እና የፓስፖርት መጠን ፎቶዎች ይጠየቃሉ። ዝርዝሩ ሊቀየር ስለሚችል ከመሄድዎ በፊት ከICS (ነፃ የስልክ መስመር 8133) ያረጋግጡ።",
      },
      {
        // VERIFIED (ICS website contact details)
        source: 'ICS official website (ics.gov.et)',
        en: "How to contact the Immigration and Citizenship Service (ICS): free call line 8133, or email info@ics.gov.et.",
        am: "የኢሚግሬሽንና ዜግነት አገልግሎት (ICS) ማግኛ፡ ነፃ የስልክ መስመር 8133፣ ወይም ኢሜይል info@ics.gov.et።",
      },
    ],
  },
  {
    serviceName: 'Kebele ID & Vital Events',
    chunks: [
      {
        // UNVERIFIED: carried over from the old seed.
        source: 'UNVERIFIED (old seed)',
        en: "To get a new Kebele ID, visit your local Kebele office. Requirements reported: 1. Letter of support from your neighborhood leader, 2. Two passport-size photos, 3. Birth certificate. The fee is typically around 50 ETB and processing can take 1-2 weeks. This information is unconfirmed and may have changed, so check with your Kebele office.",
        am: "አዲስ የቀበሌ መታወቂያ ለማግኘት የአካባቢዎን ቀበሌ ቢሮ ይጎብኙ። የሚያስፈልጉ ነገሮች፡ 1. ከሰፈር ሊቀመንበር የሚሰጥ የድጋፍ ደብዳቤ፣ 2. ሁለት የፓስፖርት መጠን ፎቶዎች፣ 3. የልደት ምስክር ወረቀት። ክፍያው በተለምዶ 50 ብር ገደማ ሲሆን ሂደቱ ከ1-2 ሳምንት ሊወስድ ይችላል። ይህ መረጃ ያልተረጋገጠ እና ሊቀየር የሚችል ስለሆነ ከቀበሌ ቢሮዎ ያረጋግጡ።",
      },
    ],
  },
  {
    serviceName: 'Business License Registration',
    chunks: [
           {
        // PARTLY VERIFIED: e-Trade portal (MoTRI) and the lease change come from news and guide sources. Re-check on etrade.gov.et.
        source: 'e-Trade portal (etrade.gov.et) + Addis Fortune 2022',
        en: "Business registration and licensing in Ethiopia are handled online through the Ministry of Trade and Regional Integration's e-Trade portal (etrade.gov.et). Office lease agreements were reported to no longer be required, but requirements can differ by business type and region, so confirm on the portal or with your trade bureau.",
        am: "በኢትዮጵያ የንግድ ምዝገባና ፈቃድ አገልግሎት በንግድና ቀጠናዊ ትስስር ሚኒስቴር የኢ-ትሬድ (e-Trade) ድረ ገጽ (etrade.gov.et) በኦንላይን ይሰጣል። የቢሮ የኪራይ ውል ማቅረብ እንደማይጠበቅ ተዘግቧል፤ ሆኖም መስፈርቶች እንደ ንግዱ ዓይነትና ክልል ሊለያዩ ስለሚችሉ በድረ ገጹ ወይም በአካባቢዎ የንግድ ቢሮ ያረጋግጡ።",
      },,
    ],
  },
  {
    serviceName: 'Driving License',
    chunks: [
      {
        // UNVERIFIED: carried over from the old seed (office name made generic on purpose).
        source: 'UNVERIFIED (old seed)',
        en: "To apply for a driving license, you must pass a written and practical test with the transport authority. Requirements reported: 1. Medical certificate from a government hospital, 2. Kebele ID, 3. Proof of driving school completion. The fee is reported to be around 1,500 ETB. This information is unconfirmed and may have changed, so check with the transport authority.",
        am: "የመንጃ ፈቃድ ለማግኘት የጽሑፍና የተግባር ፈተና ማለፍ ያስፈልጋል። የሚያስፈልጉ ነገሮች፡ 1. ከመንግስት ሆስፒታል የተሰጠ የጤና ምስክር ወረቀት፣ 2. የቀበሌ መታወቂያ፣ 3. የመንጃ ፈቃድ ትምህርት ቤት ማጠናቀቂያ ማስረጃ። ክፍያው 1,500 ብር ገደማ ነው ተብሏል። ይህ መረጃ ያልተረጋገጠ እና ሊቀየር የሚችል ስለሆነ ከትራንስፖርት ባለስልጣን ያረጋግጡ።",
      },
    ],
  },
  {
    serviceName: 'Birth Certificate',
    chunks: [
      {
        // UNVERIFIED: carried over from the old seed (office name made generic on purpose).
        source: 'UNVERIFIED (old seed)',
        en: "To register a birth and get a certificate, go to the vital events registration office within 30 days of the birth. Requirements reported: 1. Hospital birth notification, 2. Parents' Kebele IDs, 3. Marriage certificate (if applicable). The service is reported to be free. This information is unconfirmed and may have changed, so check with the vital events office.",
        am: "ልደትን ለመመዝገብና የምስክር ወረቀት ለማግኘት ከተወለደበት ቀን ጀምሮ በ30 ቀናት ውስጥ የወሳኝ ኩነት ምዝገባ ጽሕፈት ቤት ይሂዱ። የሚያስፈልጉ ነገሮች፡ 1. የሆስፒታል የልደት ማሳወቂያ፣ 2. የወላጆች የቀበሌ መታወቂያ፣ 3. የጋብቻ የምስክር ወረቀት (ካለ)። አገልግሎቱ ነፃ ነው ተብሏል። ይህ መረጃ ያልተረጋገጠ እና ሊቀየር የሚችል ስለሆነ ከወሳኝ ኩነት ጽሕፈት ቤት ያረጋግጡ።",
      },
    ],
  },
];

const SEED_TAG = 'Tebib Admin Seed';

@Injectable()
export class SeedService {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  async seedAllServices() {
    const results: Array<{ service: string; status: string }> = [];
    let totalChunks = 0;

    for (const serviceData of SEED_DATA) {
      // 1. Find the service ID in the database
      const { data: service, error } = await supabase
        .from('services')
        .select('id')
        .eq('name_en', serviceData.serviceName)
        .single();

      if (error || !service) {
        results.push({ service: serviceData.serviceName, status: 'Skipped (Not found in DB)' });
        continue;
      }

      // 2. Remove this service's earlier seed rows so re-running never creates duplicates
      await supabase
        .from('knowledge_base')
        .delete()
        .eq('service_id', service.id)
        .like('source_details', `${SEED_TAG}%`);

      // 3. Add each chunk (the source is stored in source_details)
      for (const chunk of serviceData.chunks) {
        if(!chunk) continue;
        await this.knowledgeService.addKnowledgeChunk(
          service.id,
          chunk.en,
          chunk.am,
          'manual',
          `${SEED_TAG} | ${chunk.source}`,
        );
        totalChunks++;
      }
      results.push({ service: serviceData.serviceName, status: 'Seeded successfully' });
    }

    return {
      success: true,
      message: `Successfully seeded ${totalChunks} knowledge chunks across all services!`,
      details: results,
    };
  }
}