// Persistent Session Storage with File-based Fallback
// Production: Use Redis/Database, Dev: Use JSON file

const fs = require('fs').promises;
const path = require('path');

class SessionStore {
  constructor() {
    this.sessions = new Map();
    this.storePath = path.join(__dirname, 'data', 'sessions.json');
    this.autoSaveInterval = null;
    this.SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
  }

  async init() {
    try {
      // Ensure data directory exists
      await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
      
      // Load existing sessions
      await this.load();
      
      // Auto-save every 5 minutes
      this.autoSaveInterval = setInterval(() => this.save(), 5 * 60 * 1000);
      
      // Cleanup expired sessions every hour
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000);
      
      console.log('✅ Session store initialized:', this.sessions.size, 'sessions loaded');
    } catch (err) {
      console.warn('⚠️ Session store init warning:', err.message);
    }
  }

  async load() {
    try {
      const data = await fs.readFile(this.storePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Convert array back to Map
      parsed.forEach(([key, value]) => {
        // Only load non-expired sessions
        if (Date.now() - value.timestamp < this.SESSION_TTL) {
          this.sessions.set(key, value);
        }
      });
    } catch (err) {
      // File doesn't exist yet, that's ok
      if (err.code !== 'ENOENT') {
        console.warn('⚠️ Could not load sessions:', err.message);
      }
    }
  }

  async save() {
    try {
      // Convert Map to array for JSON serialization
      const data = Array.from(this.sessions.entries());
      await fs.writeFile(this.storePath, JSON.stringify(data, null, 2));
      console.log('💾 Sessions saved:', data.length, 'entries');
    } catch (err) {
      console.error('❌ Session save failed:', err.message);
    }
  }

  set(employeeId, sessionData) {
    this.sessions.set(employeeId, {
      ...sessionData,
      timestamp: Date.now()
    });
    
    // Async save (don't block)
    this.save().catch(err => console.error('Save error:', err));
  }

  get(employeeId) {
    const session = this.sessions.get(employeeId);
    
    if (!session) return null;
    
    // Check if expired
    if (Date.now() - session.timestamp > this.SESSION_TTL) {
      this.sessions.delete(employeeId);
      this.save().catch(err => console.error('Save error:', err));
      return null;
    }
    
    return session;
  }

  delete(employeeId) {
    const deleted = this.sessions.delete(employeeId);
    if (deleted) {
      this.save().catch(err => console.error('Save error:', err));
    }
    return deleted;
  }

  has(employeeId) {
    return this.get(employeeId) !== null;
  }

  cleanup() {
    const before = this.sessions.size;
    const now = Date.now();
    
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.timestamp > this.SESSION_TTL) {
        this.sessions.delete(key);
      }
    }
    
    const cleaned = before - this.sessions.size;
    if (cleaned > 0) {
      console.log('🧹 Cleaned', cleaned, 'expired sessions');
      this.save().catch(err => console.error('Save error:', err));
    }
  }

  size() {
    return this.sessions.size;
  }

  getAll() {
    return Array.from(this.sessions.entries()).map(([key, value]) => ({
      employeeId: key,
      airline: value.airline,
      age: Math.round((Date.now() - value.timestamp) / 1000),
      expiresIn: Math.round((this.SESSION_TTL - (Date.now() - value.timestamp)) / 1000)
    }));
  }

  async shutdown() {
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    await this.save();
    console.log('💾 Session store shut down gracefully');
  }
}

module.exports = new SessionStore();
