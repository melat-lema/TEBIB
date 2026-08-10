import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase.config';
import { KnowledgeService } from '../knowledge/knowledge.service';


const SEED_DATA = [
  {
    serviceName: 'Passport Services',
    chunks: [
      {
        en: "To apply for a new 5-year Ethiopian passport, you must visit the Immigration and Citizenship Service office. Required documents: 1. Original Kebele ID, 2. Two recent passport-size photos with white background. Fee: 5,000 ETB (regular, 15 days) or 7,500 ETB (expedited, 5 days).",
        am: "አዲስ የ5 ዓመት ስፖርት ለማግኘት የህዝ ፍልሰት ቢሮ መገኘት አለብት። የሚያስልጉ ሰነች፡ 1. የቀበሌ መታወቂያ፣ 2. ሁለት ፎቶዎች ክፍያ፡ 5,000 ብር (መደበኛ) ወይም 7,500 ብር (ፈን)።"
      }
    ]
  },
  {
    serviceName: 'Kebele ID & Vital Events',
    chunks: [
      {
        en: "To get a new Kebele ID, visit your local Kebele office. Requirements: 1. Letter of support from your neighborhood leader, 2. Two passport-size photos, 3. Birth certificate. The fee is typically 50 ETB. Processing takes 1-2 weeks.",
        am: "አዲስ የቀበ መታወቂያ ለማግኘት የአካባቢዎን ቀበሌ ቢሮ ጎብኙ የሚያስፈል፡ 1. የፈር ሊቀመንበር ደብዳቤ፣ 2. ሁለት ፎቶዎች 3. የልደት ምስክር ወረቀት ክፍያ 50 ር ነው።"
      }
    ]
  },
  {
    serviceName: 'Business License Registration',
    chunks: [
      {
        en: "To register a new business, go to the Ministry of Trade and Regional Integration. You need: 1. Trade name reservation certificate, 2. Lease agreement for your office, 3. TIN (Tax Identification Number). Registration fee varies by business type.",
        am: "አዲስ ንግድ ለመመዝብ የንግድ ኒስቴር ሂዱ። የሚያስፈልጉ፡ 1. የንድ ስም ምገባ፣ 2. የቤት ኪይ ስምምነት 3. TIN (የግር መለያ ቁጥር)።"
      }
    ]
  },
  {
    serviceName: 'Driving License',
    chunks: [
      {
        en: "To apply for a driving license, you must pass a written and practical test at the Federal Transport Authority. Requirements: 1. Medical certificate from a government hospital, 2. Kebele ID, 3. Proof of driving school completion. Fee is around 1,500 ETB.",
        am: "የመንጃ ፈቃድ ማግኘት በትራንስፖርት ባለስልጣን ፈተና ማለፍ አለብዎት የሚያስፈል፡ 1. የህክምና ምስክር ወረቀት፣ 2. የቀበሌ መታወቂያ፣ 3. የድራይቪንግ ምህርት ቤት ስረጃ። ፍያ 1,500 ር ገደማ ው።"
      }
    ]
  },
  {
    serviceName: 'Birth Certificate',
    chunks: [
      {
        en: "To register a birth and get a certificate, go to the Vital Events Registration Agency within 30 days of birth. Requirements: 1. Hospital birth notification, 2. Parents' Kebele IDs, 3. Marriage certificate (if applicable). The service is free of charge.",
        am: "ልደት ለመመዝብ እና ምስክር ወረቀት ለማኘት ከልደት በኋላ በ30 ቀናት ውስጥ የስነ ህይወት ክስተቶች ምዝገ ኤጀንሲ ይሂዱ። የሚያስልጉ፡ 1. የሆስፒታል ሳወቂያ፣ 2. የወላጆች መታወቂያ። አገልግሎ ነፃ ነው"
      }
    ]
  }
];

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

      // 2. Add each chunk for this service
      for (const chunk of serviceData.chunks) {
        await this.knowledgeService.addKnowledgeChunk(
          service.id,
          chunk.en,
          chunk.am,
          'manual',
          'Tebib Admin Seed'
        );
        totalChunks++;
      }
      results.push({ service: serviceData.serviceName, status: 'Seeded successfully' });
    }

    return { 
      success: true, 
      message: `Successfully seeded ${totalChunks} knowledge chunks across all services!`, 
      details: results 
    };
  }
}