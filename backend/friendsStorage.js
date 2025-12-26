import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRIENDS_FILE = path.join(__dirname, 'friends.json');
const SCHEDULES_FILE = path.join(__dirname, 'pilot-schedules.json');

// Initialize files if they don't exist
if (!fs.existsSync(FRIENDS_FILE)) {
  fs.writeFileSync(FRIENDS_FILE, JSON.stringify({}));
}
if (!fs.existsSync(SCHEDULES_FILE)) {
  fs.writeFileSync(SCHEDULES_FILE, JSON.stringify({}));
}

function loadFriends() {
  return JSON.parse(fs.readFileSync(FRIENDS_FILE, 'utf8'));
}

function saveFriends(data) {
  fs.writeFileSync(FRIENDS_FILE, JSON.stringify(data, null, 2));
}

function loadSchedules() {
  return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8'));
}

function saveSchedules(data) {
  fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(data, null, 2));
}

// Register pilot for friend search
export function registerPilot(pilotId, name, airline) {
  const friends = loadFriends();
  if (!friends[pilotId]) {
    friends[pilotId] = {
      name: name || pilotId,
      airline,
      friends: [],
      pendingRequests: []
    };
    saveFriends(friends);
  }
  return friends[pilotId];
}

// Search for pilots
export function searchPilots(searchTerm) {
  const friends = loadFriends();
  const results = [];
  
  for (const [pilotId, data] of Object.entries(friends)) {
    if (pilotId.includes(searchTerm) || data.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      results.push({ pilotId, name: data.name, airline: data.airline });
    }
  }
  
  return results;
}

// Send friend request
export function sendFriendRequest(fromPilotId, toPilotId) {
  const friends = loadFriends();
  
  if (!friends[toPilotId]) {
    return { success: false, error: 'Pilot not found' };
  }
  
  if (friends[toPilotId].pendingRequests.includes(fromPilotId)) {
    return { success: false, error: 'Request already sent' };
  }
  
  if (friends[fromPilotId]?.friends.includes(toPilotId)) {
    return { success: false, error: 'Already friends' };
  }
  
  friends[toPilotId].pendingRequests.push(fromPilotId);
  saveFriends(friends);
  
  return { success: true };
}

// Accept friend request
export function acceptFriendRequest(pilotId, fromPilotId) {
  const friends = loadFriends();
  
  if (!friends[pilotId]) {
    return { success: false, error: 'Pilot not found' };
  }
  
  const index = friends[pilotId].pendingRequests.indexOf(fromPilotId);
  if (index === -1) {
    return { success: false, error: 'No pending request' };
  }
  
  friends[pilotId].pendingRequests.splice(index, 1);
  friends[pilotId].friends.push(fromPilotId);
  friends[fromPilotId].friends.push(pilotId);
  
  saveFriends(friends);
  return { success: true };
}

// Get friends list
export function getFriends(pilotId) {
  const friends = loadFriends();
  if (!friends[pilotId]) return { friends: [], pendingRequests: [] };
  
  const friendsList = friends[pilotId].friends.map(fId => ({
    pilotId: fId,
    name: friends[fId]?.name || fId,
    airline: friends[fId]?.airline
  }));
  
  const pendingList = friends[pilotId].pendingRequests.map(fId => ({
    pilotId: fId,
    name: friends[fId]?.name || fId,
    airline: friends[fId]?.airline
  }));
  
  return { friends: friendsList, pendingRequests: pendingList };
}

// Store pilot schedule after scraping
export function storeSchedule(pilotId, month, year, duties, news) {
  const schedules = loadSchedules();
  const key = `${pilotId}_${month}_${year}`;
  
  schedules[key] = {
    pilotId,
    month,
    year,
    duties,
    news,
    lastUpdated: new Date().toISOString()
  };
  
  saveSchedules(schedules);
}

// Get stored schedule
export function getSchedule(pilotId, month, year) {
  const schedules = loadSchedules();
  const key = `${pilotId}_${month}_${year}`;
  return schedules[key] || null;
}

// Check if pilots are friends
export function areFriends(pilotId1, pilotId2) {
  const friends = loadFriends();
  return friends[pilotId1]?.friends.includes(pilotId2) || false;
}