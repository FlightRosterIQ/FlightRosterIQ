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
  const url = `/api/netline/roster/events?crewCode=${crewCode}`;
  console.log('[FRIQ][FETCH] Calling:', url);
  
  const res = await fetch(url, { credentials: 'include' });
  
  console.log('[FRIQ][FETCH] Response status:', res.status);
  console.log('[FRIQ][FETCH] Response headers:', Object.fromEntries(res.headers.entries()));

  const json = await res.json();
  console.log('[FRIQ][NetLine API RAW]', json);
  
  // Handle session expiry or auth required
  if (!json.success && json.requiresAuth) {
    console.error('[FRIQ][FETCH] Session expired or auth required');
    
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('netline-auth-required', {
      detail: { error: json.error, crewCode: json.crewCode }
    }));
    
    throw new Error('Authentication required');
  }
  
  if (!json.success) {
    console.error('[FRIQ][FETCH] API returned success:false', json);
    throw new Error(json.error || 'NetLine /events failed');
  }

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
  console.log('[FRIQ][ADAPTER] getRosterWithBackgroundSync called with crewCode:', crewCode);
  
  const cacheKey = `netline-${crewCode}`;
  const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

  // 1️⃣ Load cache immediately
  console.log('[FRIQ][ADAPTER] Checking cache...');
  const cached = await loadRoster(cacheKey, CACHE_TTL);
  if (cached) {
    console.info('[FRIQ][ADAPTER] Roster loaded from cache, count:', cached.length);
    onUpdate?.(cached);

    // 2️⃣ Background refresh (non-blocking)
    (async () => {
      try {
        console.log('[FRIQ][ADAPTER] Starting background refresh...');
        const fresh = await fetchAndMerge(crewCode);
        if (rosterHash(fresh) !== rosterHash(cached)) {
          console.info('[FRIQ][ADAPTER] Roster updated in background');
          await saveRoster(cacheKey, fresh);
          onUpdate?.(fresh);
        } else {
          console.info('[FRIQ][ADAPTER] No changes detected in background refresh');
        }
      } catch (e) {
        console.error('[FRIQ][ADAPTER] Background refresh failed', e);
      }
    })();

    return cached;
  }

  // 3️⃣ No cache → normal fetch
  console.log('[FRIQ][ADAPTER] No cache found, fetching fresh data...');
  try {
    const fresh = await fetchAndMerge(crewCode);
    console.log('[FRIQ][ADAPTER] Fresh data fetched, count:', fresh.length);
    await saveRoster(cacheKey, fresh);
    onUpdate?.(fresh);
    return fresh;
  } catch (e) {
    console.error('[FRIQ][ADAPTER] Initial fetch failed', e);
    throw e;
  }
  return fresh;
}

// ---------- LEGACY EXPORTS ----------

/**
 * @deprecated Use getRosterWithBackgroundSync() instead
 */
export async function scrapeNetLine(): Promise<Duty[]> {
  return fetchAndMerge('152780');
}

