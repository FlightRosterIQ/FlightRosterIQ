// Session validation middleware

function sessionValidator(sessionStore) {
  return async (req, res, next) => {
    const { crewCode } = req.query;
    
    if (!crewCode) {
      return res.status(400).json({
        success: false,
        error: 'crewCode required',
        requiresAuth: true
      });
    }
    
    const session = sessionStore.get(crewCode);
    
    if (!session) {
      console.log('❌ [SESSION] No session found for', crewCode);
      return res.status(401).json({
        success: false,
        error: 'No authenticated session. Please login.',
        requiresAuth: true,
        crewCode
      });
    }
    
    const SESSION_TTL = 24 * 60 * 60 * 1000;
    const age = Date.now() - session.timestamp;
    
    if (age > SESSION_TTL) {
      console.log('❌ [SESSION] Expired session for', crewCode);
      sessionStore.delete(crewCode);
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please login again.',
        requiresAuth: true,
        crewCode
      });
    }
    
    // Attach session to request
    req.netlineSession = session;
    req.crewCode = crewCode;
    
    next();
  };
}

module.exports = sessionValidator;
