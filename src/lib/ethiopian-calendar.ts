/**
 * Ethiopian calendar awareness for the AI concierge.
 * Handles holidays, fasting seasons, tourism peaks, and local events.
 */

export interface EthiopianEvent {
  name: string;
  nameAmharic: string;
  type: 'holiday' | 'fasting' | 'tourism_peak' | 'local_event';
  demandMultiplier: number;
  fbImpact: 'normal' | 'fasting_menu' | 'feast_menu';
  description: string;
}

const FIXED_EVENTS: Record<string, EthiopianEvent> = {
  '01-07': { name: 'Ethiopian Christmas (Genna)', nameAmharic: 'ገና', type: 'holiday', demandMultiplier: 1.6, fbImpact: 'feast_menu', description: 'Major holiday — high domestic travel, traditional feast demand' },
  '01-19': { name: 'Timkat (Epiphany)', nameAmharic: 'ጥምቀት', type: 'holiday', demandMultiplier: 1.8, fbImpact: 'feast_menu', description: 'Biggest festival — massive tourism spike, UNESCO-listed celebration' },
  '03-02': { name: 'Battle of Adwa', nameAmharic: 'የአድዋ ድል', type: 'holiday', demandMultiplier: 1.3, fbImpact: 'normal', description: 'National holiday — moderate domestic travel increase' },
  '04-11': { name: 'Ethiopian Good Friday (Siklet)', nameAmharic: 'ስቅለት', type: 'holiday', demandMultiplier: 1.4, fbImpact: 'fasting_menu', description: 'Orthodox fasting day — vegan menu required' },
  '04-13': { name: 'Ethiopian Easter (Fasika)', nameAmharic: 'ፋሲካ', type: 'holiday', demandMultiplier: 1.7, fbImpact: 'feast_menu', description: 'End of 55-day fast — huge feast celebration, high demand' },
  '05-01': { name: 'International Workers Day', nameAmharic: 'የሰራተኛ ቀን', type: 'holiday', demandMultiplier: 1.2, fbImpact: 'normal', description: 'Public holiday' },
  '05-05': { name: 'Ethiopian Patriots Day', nameAmharic: 'የአርበኞች ቀን', type: 'holiday', demandMultiplier: 1.2, fbImpact: 'normal', description: 'National holiday' },
  '05-28': { name: 'Downfall of the Derg', nameAmharic: 'ደርግ የወደቀበት', type: 'holiday', demandMultiplier: 1.2, fbImpact: 'normal', description: 'National holiday' },
  '09-11': { name: 'Ethiopian New Year (Enkutatash)', nameAmharic: 'እንቁጣጣሽ', type: 'holiday', demandMultiplier: 1.7, fbImpact: 'feast_menu', description: 'New Year — high domestic travel, spring flowers season' },
  '09-27': { name: 'Meskel (Finding of True Cross)', nameAmharic: 'መስቀል', type: 'holiday', demandMultiplier: 1.6, fbImpact: 'feast_menu', description: 'Major holiday — Meskel bonfire, tourism peak' },
};

const FASTING_PERIODS = [
  { start: '03-10', end: '04-13', name: 'Hudadi/Lent (Abiy Tsom)', nameAmharic: 'ሁዳዴ/ዐቢይ ጾም', demandMultiplier: 0.9 },
  { start: '07-17', end: '08-14', name: 'Filseta Fast', nameAmharic: 'ፍልሰታ', demandMultiplier: 0.85 },
];

const TOURISM_SEASONS = [
  { start: '10-01', end: '01-15', name: 'Peak Tourism Season (dry, post-Meskel)', multiplier: 1.4 },
  { start: '06-15', end: '09-10', name: 'Rainy Season (Kiremt) — low tourism', multiplier: 0.7 },
  { start: '01-16', end: '03-09', name: 'Shoulder Season', multiplier: 1.1 },
  { start: '04-14', end: '06-14', name: 'Belg Season (short rains)', multiplier: 0.9 },
];

function dateToMMDD(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isInRange(mmdd: string, start: string, end: string): boolean {
  if (start <= end) return mmdd >= start && mmdd <= end;
  return mmdd >= start || mmdd <= end;
}

export function getEthiopianEvents(date: Date): EthiopianEvent[] {
  const events: EthiopianEvent[] = [];
  const mmdd = dateToMMDD(date);
  const dayOfWeek = date.getDay();

  if (FIXED_EVENTS[mmdd]) events.push(FIXED_EVENTS[mmdd]);

  for (const fast of FASTING_PERIODS) {
    if (isInRange(mmdd, fast.start, fast.end)) {
      events.push({
        name: fast.name, nameAmharic: fast.nameAmharic, type: 'fasting',
        demandMultiplier: fast.demandMultiplier, fbImpact: 'fasting_menu',
        description: 'Orthodox fasting period — vegan/vegetarian menu emphasis',
      });
    }
  }

  if (dayOfWeek === 3 || dayOfWeek === 5) {
    events.push({
      name: dayOfWeek === 3 ? 'Wednesday Fast' : 'Friday Fast',
      nameAmharic: dayOfWeek === 3 ? 'ረቡዕ ጾም' : 'ዓርብ ጾም',
      type: 'fasting', demandMultiplier: 1.0, fbImpact: 'fasting_menu',
      description: 'Weekly Orthodox fasting day — offer vegan options prominently',
    });
  }

  return events;
}

export function getTourismSeason(date: Date): { name: string; multiplier: number } {
  const mmdd = dateToMMDD(date);
  for (const season of TOURISM_SEASONS) {
    if (isInRange(mmdd, season.start, season.end)) {
      return { name: season.name, multiplier: season.multiplier };
    }
  }
  return { name: 'Standard Season', multiplier: 1.0 };
}

export function getDemandMultiplier(date: Date): { multiplier: number; reasons: string[] } {
  const events = getEthiopianEvents(date);
  const season = getTourismSeason(date);
  const dayOfWeek = date.getDay();
  const reasons: string[] = [];

  let multiplier = season.multiplier;
  reasons.push(`${season.name} (base: ${season.multiplier}x)`);

  if (dayOfWeek === 5 || dayOfWeek === 6) {
    multiplier *= 1.15;
    reasons.push('Weekend demand (+15%)');
  }

  for (const event of events) {
    if (event.type === 'holiday' || event.type === 'tourism_peak') {
      multiplier *= event.demandMultiplier;
      reasons.push(`${event.name} (${event.demandMultiplier}x)`);
    }
  }

  return { multiplier: Math.round(multiplier * 100) / 100, reasons };
}
