// Run this script to create PayPal subscription plans
// Node.js script - run with: node create-paypal-plans.js

const https = require('https');

// REPLACE THESE WITH YOUR CREDENTIALS
const CLIENT_ID = 'AW0NFBXokbzAaqUAYNVRnVn8wnXMQmhDofIAeXXXXXX'; // Your FlightRosterIQ Client ID
const SECRET = 'YOUR_SECRET_HERE'; // Get from PayPal dashboard (click Show under Secret)

// Get Access Token
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64');
    
    const options = {
      hostname: 'api-m.paypal.com', // Use api-m.sandbox.paypal.com for testing
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        resolve(parsed.access_token);
      });
    });

    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

// Create Product
function createProduct(accessToken) {
  return new Promise((resolve, reject) => {
    const productData = JSON.stringify({
      name: 'FlightRosterIQ Premium',
      description: 'Premium subscription for FlightRosterIQ - Flight schedule tracking for pilots',
      type: 'SERVICE',
      category: 'SOFTWARE',
      image_url: 'https://flight-roster-iq-hz7h.vercel.app/icons/ios/180.png',
      home_url: 'https://flight-roster-iq-hz7h.vercel.app'
    });

    const options = {
      hostname: 'api-m.paypal.com',
      path: '/v1/catalogs/products',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': productData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        console.log('\n✅ Product Created:', parsed.id);
        resolve(parsed.id);
      });
    });

    req.on('error', reject);
    req.write(productData);
    req.end();
  });
}

// Create Monthly Plan
function createMonthlyPlan(accessToken, productId) {
  return new Promise((resolve, reject) => {
    const planData = JSON.stringify({
      product_id: productId,
      name: 'FlightRosterIQ Monthly',
      description: 'Monthly subscription - $4.99/month',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: '4.99',
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    });

    const options = {
      hostname: 'api-m.paypal.com',
      path: '/v1/billing/plans',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': planData.length,
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        console.log('\n✅ Monthly Plan Created!');
        console.log('   Plan ID:', parsed.id);
        console.log('   Copy this ID to your code!');
        resolve(parsed.id);
      });
    });

    req.on('error', reject);
    req.write(planData);
    req.end();
  });
}

// Create Yearly Plan
function createYearlyPlan(accessToken, productId) {
  return new Promise((resolve, reject) => {
    const planData = JSON.stringify({
      product_id: productId,
      name: 'FlightRosterIQ Yearly',
      description: 'Yearly subscription - $49.99/year (Save 17%!)',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'YEAR',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: '49.99',
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    });

    const options = {
      hostname: 'api-m.paypal.com',
      path: '/v1/billing/plans',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': planData.length,
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        console.log('\n✅ Yearly Plan Created!');
        console.log('   Plan ID:', parsed.id);
        console.log('   Copy this ID to your code!');
        resolve(parsed.id);
      });
    });

    req.on('error', reject);
    req.write(planData);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    console.log('🚀 Creating PayPal Subscription Plans...\n');
    
    console.log('1️⃣ Getting access token...');
    const accessToken = await getAccessToken();
    console.log('   ✅ Access token received');
    
    console.log('\n2️⃣ Creating product...');
    const productId = await createProduct(accessToken);
    
    console.log('\n3️⃣ Creating monthly plan...');
    const monthlyPlanId = await createMonthlyPlan(accessToken, productId);
    
    console.log('\n4️⃣ Creating yearly plan...');
    const yearlyPlanId = await createYearlyPlan(accessToken, productId);
    
    console.log('\n\n✨ SUCCESS! All plans created!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 COPY THESE TO YOUR CODE:');
    console.log('\nconst PAYPAL_CLIENT_ID = "' + CLIENT_ID + '";');
    console.log('const PAYPAL_MONTHLY_PLAN_ID = "' + monthlyPlanId + '";');
    console.log('const PAYPAL_YEARLY_PLAN_ID = "' + yearlyPlanId + '";');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
