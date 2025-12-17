const jwt = require('jsonwebtoken');

// Test secret key
const SECRET_KEY = 'test_secret_key';

// Test payload
const payload = {
  userId: 123,
  username: 'testuser',
};

// Test JWT creation
function testCreateJWT() {
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
  console.log('✅ JWT created successfully:', token);
  return token;
}

// Test JWT verification
function testVerifyJWT(token) {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log('✅ JWT verified successfully:', decoded);
  } catch (err) {
    console.error('❌ JWT verification failed:', err.message);
  }
}

// Test JWT decoding
function testDecodeJWT(token) {
  const decoded = jwt.decode(token);
  console.log('✅ JWT decoded successfully:', decoded);
}

// Run tests
const token = testCreateJWT();
testVerifyJWT(token);
testDecodeJWT(token);