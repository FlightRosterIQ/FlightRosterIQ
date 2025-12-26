/* ============================
   FAMILY CODES STORAGE
   JSON file-based storage for family access codes
============================ */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const CODES_FILE = path.join(DATA_DIR, 'familyCodes.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize file if it doesn't exist
if (!fs.existsSync(CODES_FILE)) {
  fs.writeFileSync(CODES_FILE, JSON.stringify({}, null, 2));
}

/**
 * Read all family codes from storage
 */
export function getAllCodes() {
  try {
    const data = fs.readFileSync(CODES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading family codes:', err);
    return {};
  }
}

/**
 * Save all codes to storage
 */
function saveCodes(codes) {
  try {
    fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving family codes:', err);
    return false;
  }
}

/**
 * Generate a new family access code
 */
export function generateCode(pilotId, familyMemberName, airline, password) {
  const codes = getAllCodes();
  
  // Generate unique 6-character code
  let code;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (codes[code]);
  
  codes[code] = {
    pilotId,
    familyMemberName,
    airline: airline || 'abx',
    createdAt: new Date().toISOString(),
    // Store encrypted password hash (in production, use bcrypt)
    // For now, we'll store a simple obfuscated version
    passwordHash: Buffer.from(password).toString('base64')
  };
  
  saveCodes(codes);
  return code;
}

/**
 * Get codes for a specific pilot
 */
export function getCodesForPilot(pilotId) {
  const allCodes = getAllCodes();
  const pilotCodes = [];
  
  for (const [code, data] of Object.entries(allCodes)) {
    if (data.pilotId === pilotId) {
      pilotCodes.push({
        code,
        familyMemberName: data.familyMemberName,
        createdAt: data.createdAt,
        airline: data.airline
      });
    }
  }
  
  return pilotCodes;
}

/**
 * Validate a family access code
 */
export function validateCode(code) {
  const codes = getAllCodes();
  const codeData = codes[code];
  
  if (!codeData) {
    return null;
  }
  
  return {
    pilotId: codeData.pilotId,
    familyMemberName: codeData.familyMemberName,
    airline: codeData.airline,
    password: Buffer.from(codeData.passwordHash, 'base64').toString('utf8')
  };
}

/**
 * Revoke (delete) a family access code
 */
export function revokeCode(code, pilotId) {
  const codes = getAllCodes();
  
  if (!codes[code]) {
    return { success: false, error: 'Code not found' };
  }
  
  // Verify the code belongs to this pilot
  if (codes[code].pilotId !== pilotId) {
    return { success: false, error: 'Unauthorized' };
  }
  
  delete codes[code];
  saveCodes(codes);
  
  return { success: true };
}
