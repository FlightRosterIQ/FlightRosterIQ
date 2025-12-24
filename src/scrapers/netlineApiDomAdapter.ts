// =======================================
// FlightRosterIQ – NetLine Adapter
// API-first + DOM enrichment + Background Sync
// =======================================

import { loadRoster, saveRoster } from '../cache/rosterCache';

// ---------- TYPES ----------

export type DutyType = 'IADP' | 'FLIGHT' | 'OTHER';

export type CrewMember = {
  role: string;
  name: string;
  crewId?: string;
  phone?: string;
};

export type FlightLeg = {
  from: string;
  to: string;
  aircraft?: string;
  tail?: string;
};

export type Duty = {
  logicalId: string;
  type: DutyType;
  startUtc: string;
  endUtc: string;
  pairing?: string;
  legs: FlightLeg[];
  crew: CrewMember[];
  hotel?: string;
  enriched?: boolean;
};

// ---------- HASH (change detection) ----------

function rosterHash(duties: Duty[]) {
  return JSON.stringify(
    duties.map(d => ({
      id: d.logicalId,
      s: d.startUtc,
      e: d.endUtc,
      l: d.legs.length
    }))
  );
}

// ---------- STEP 1: API FETCH ----------

async function fetchRosterEvents(crewCode: string): Promise<Duty[]> {
  const res = await fetch(
    `/api/netline/crew/pems/rest/pems/idp/user/roster/${crewCode}/events`,
    { credentials: 'include' }
  );

  const json = await res.json();
  if (!json.success) throw new Error('NetLine /events failed');

  return json.result.map((e: any) => ({
    logicalId: e.logicalId,
    type: /IADP/i.test(e.logicalId) ? 'IADP' : 'FLIGHT',
    startUtc: e.fromDt,
    endUtc: e.toDt,
    pairing: e.logicalId?.split('@')[1],
    legs: e.legs?.map((l: any) => ({
      from: l.depAirport,
      to: l.arrAirport
    })) || [],
    crew: []
  }));
}

// ---------- STEP 2: DOM ENRICHMENT (ONE PASS) ----------

function buildDomIndex() {
  const index = new Map<string, Partial<Duty>>();

  document
    .querySelectorAll<HTMLElement>('[class*="duty"], [class*="pairing"]')
    .forEach(el => {
      const text = el.innerText;

      const pairing =
        text.match(/C\d{4,5}[A-Z]?\/\d{2}[A-Za-z]{3}/)?.[0];
      if (!pairing) return;

      const legs: FlightLeg[] = [];
      text.match(/[A-Z]{3}\s*(→|-)\s*[A-Z]{3}/g)?.forEach(l => {
        legs.push({
          from: l.slice(0, 3),
          to: l.slice(-3),
          aircraft: text.match(/B\d{3}/)?.[0],
          tail: text.match(/N\d+[A-Z]*/)?.[0]
        });
      });

      const crew: CrewMember[] = [];
      text.match(/(CAPT|FO|FE)[^\n]+/g)?.forEach(c => {
        crew.push({
          role: c.match(/CAPT|FO|FE/)![0],
          name: c.match(/[A-Z]{3,}/)?.[0] || ''
        });
      });

      index.set(pairing, {
        legs,
        crew,
        hotel: text.match(/Hotel[^\n]+/)?.[0]
      });
    });

  return index;
}

// ---------- STEP 3: MERGE ----------

async function fetchAndMerge(crewCode: string): Promise<Duty[]> {
  const apiDuties = await fetchRosterEvents(crewCode);
  const domIndex = buildDomIndex();

  return apiDuties.map(duty => {
    const enrichment = domIndex.get(duty.pairing || '');
    return {
      ...duty,
      enriched: Boolean(enrichment),
      legs: enrichment?.legs?.length ? enrichment.legs : duty.legs,
      crew: enrichment?.crew || [],
      hotel: enrichment?.hotel
    };
  });
}

// =======================================
// PUBLIC ENTRY – BACKGROUND SYNC
// =======================================

export async function getRosterWithBackgroundSync(
  crewCode: string,
  onUpdate?: (duties: Duty[]) => void
): Promise<Duty[]> {
  const cacheKey = `netline-${crewCode}`;
  const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

  // 1️⃣ Load cache immediately
  const cached = await loadRoster(cacheKey, CACHE_TTL);
  if (cached) {
    console.info('[FRIQ] Roster loaded from cache');
    onUpdate?.(cached);

    // 2️⃣ Background refresh (non-blocking)
    (async () => {
      try {
        const fresh = await fetchAndMerge(crewCode);
        if (rosterHash(fresh) !== rosterHash(cached)) {
          console.info('[FRIQ] Roster updated in background');
          await saveRoster(cacheKey, fresh);
          onUpdate?.(fresh);
        }
      } catch (e) {
        console.warn('[FRIQ] Background refresh failed', e);
      }
    })();

    return cached;
  }

  // 3️⃣ No cache → normal fetch
  const fresh = await fetchAndMerge(crewCode);
  await saveRoster(cacheKey, fresh);
  onUpdate?.(fresh);
  return fresh;
}

// ---------- LEGACY EXPORTS ----------

/**
 * @deprecated Use getRosterWithBackgroundSync() instead
 */
export async function scrapeNetLine(): Promise<Duty[]> {
  return fetchAndMerge('152780');
}

