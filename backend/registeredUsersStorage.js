import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, 'data', 'registered-users.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
}

function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading users file:', err);
    return { users: [] };
  }
}

function writeUsers(data) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing users file:', err);
  }
}

export function registerUser(employeeId, name, role, base, airline) {
  const data = readUsers();
  
  // Check if user already exists
  const existingIndex = data.users.findIndex(u => u.employeeId === employeeId);
  
  const user = {
    employeeId,
    name,
    role,
    base,
    airline,
    registeredAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  
  if (existingIndex >= 0) {
    // Update existing user
    data.users[existingIndex] = user;
  } else {
    // Add new user
    data.users.push(user);
  }
  
  writeUsers(data);
  return user;
}

export function unregisterUser(employeeId) {
  const data = readUsers();
  const initialLength = data.users.length;
  
  data.users = data.users.filter(u => u.employeeId !== employeeId);
  
  writeUsers(data);
  return data.users.length < initialLength;
}

export function searchUsers(query) {
  const data = readUsers();
  const lowerQuery = query.toLowerCase();
  
  return data.users.filter(user => 
    user.name.toLowerCase().includes(lowerQuery) ||
    user.employeeId.toLowerCase().includes(lowerQuery) ||
    user.base?.toLowerCase().includes(lowerQuery)
  );
}

export function getAllUsers() {
  const data = readUsers();
  return data.users;
}

export function isUserRegistered(employeeId) {
  const data = readUsers();
  return data.users.some(u => u.employeeId === employeeId);
}
