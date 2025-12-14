# PayPal Subscription Setup Guide

## What's Been Done ✅

1. **Installed PayPal SDK** - `@paypal/react-paypal-js` package added
2. **Updated Subscribe Buttons** - Now say "Subscribe with PayPal"
3. **Fixed Family Icon** - Changed from 👨‍👩‍👧‍👦 to 👪 for consistent rendering across Android/desktop
4. **Manage Button** - Opens PayPal subscription management page

## Where Payments Go 💰

**PayPal Business Account → Your Bank Account**
- All subscription payments go to your PayPal Business account
- PayPal takes ~2.9% + $0.30 per transaction
- You can transfer to your bank account (instant or 1-3 days)
- Set up automatic daily/weekly transfers in PayPal settings

## Next Steps - Complete PayPal Integration

### Step 1: Create PayPal Business Account
1. Go to https://www.paypal.com/businessaccount
2. Sign up with your business email
3. Complete business verification (required for subscriptions)
4. Add your bank account for payouts

### Step 2: Create Subscription Plans
1. Log into PayPal Business Dashboard
2. Go to **Products & Services** → **Subscriptions**
3. Click **Create Plan**

**Monthly Plan:**
- Name: "FlightRosterIQ Monthly"
- Billing cycle: Every 1 month
- Price: $4.99 USD
- Trial: 30 days free (optional - you can remove trial and keep your custom trial logic)
- Copy the **Plan ID** (starts with P-)

**Yearly Plan:**
- Name: "FlightRosterIQ Yearly"
- Billing cycle: Every 1 year
- Price: $49.99 USD
- Trial: 30 days free (optional)
- Copy the **Plan ID** (starts with P-)

### Step 3: Get API Credentials
1. Go to https://developer.paypal.com/dashboard
2. Create an App (if you haven't)
3. Copy your **Client ID** (starts with A...)
4. Switch from Sandbox to **Live** mode when ready for production

### Step 4: Add PayPal Plan IDs to Code

Edit `src/App.jsx` and add your Plan IDs:

```javascript
// Add these constants near the top of the file after imports
const PAYPAL_CLIENT_ID = "YOUR_CLIENT_ID_HERE";
const PAYPAL_MONTHLY_PLAN_ID = "P-XXXXXXXXXXXXX"; // From Step 2
const PAYPAL_YEARLY_PLAN_ID = "P-YYYYYYYYYYYYY"; // From Step 2
```

### Step 5: Update Subscribe Buttons

Replace the current button `onClick` with actual PayPal button component:

```javascript
// Monthly Plan Button - Replace around line 4070
<PayPalButtons
  createSubscription={(data, actions) => {
    return actions.subscription.create({
      plan_id: PAYPAL_MONTHLY_PLAN_ID,
      custom_id: username, // Links subscription to Employee ID
    });
  }}
  onApprove={async (data, actions) => {
    // Subscription successful
    console.log('Subscription ID:', data.subscriptionID);
    
    // Call your backend to save subscription
    await apiCall('/api/subscription/create', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: username,
        subscriptionId: data.subscriptionID,
        plan: 'monthly',
        status: 'active'
      })
    });
    
    // Update local state
    setSubscriptionStatus('active');
    setSubscriptionPlan('monthly');
    setShowSubscriptionModal(false);
    
    alert('Subscription activated! Welcome to FlightRosterIQ Premium!');
  }}
  style={{
    shape: 'pill',
    layout: 'vertical',
  }}
/>

// Yearly Plan Button - Similar implementation
```

### Step 6: Wrap App with PayPal Provider

Edit `src/main.jsx`:

```javascript
import { PayPalScriptProvider } from '@paypal/react-paypal-js'

const paypalOptions = {
  "client-id": "YOUR_CLIENT_ID_HERE",
  vault: true,
  intent: "subscription",
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PayPalScriptProvider options={paypalOptions}>
      <App />
    </PayPalScriptProvider>
  </React.StrictMode>,
)
```

### Step 7: Backend Webhook Handler

PayPal will send webhooks when subscriptions are created, renewed, or cancelled.

Add to `fixed-server-v2.js`:

```javascript
app.post('/api/webhooks/paypal', express.raw({type: 'application/json'}), async (req, res) => {
  const webhookEvent = req.body;
  
  console.log('PayPal Webhook:', webhookEvent);
  
  // Verify webhook signature (IMPORTANT for security)
  // https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/
  
  switch (webhookEvent.event_type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      // Update database: set subscription active
      const employeeId = webhookEvent.resource.custom_id;
      const subscriptionId = webhookEvent.resource.id;
      // Save to database
      break;
      
    case 'BILLING.SUBSCRIPTION.CANCELLED':
      // Update database: set subscription cancelled
      break;
      
    case 'BILLING.SUBSCRIPTION.EXPIRED':
      // Update database: set subscription expired
      break;
      
    case 'PAYMENT.SALE.COMPLETED':
      // Payment successful - extend subscription period
      break;
  }
  
  res.sendStatus(200);
});
```

### Step 8: Configure Webhook in PayPal
1. Go to PayPal Developer Dashboard → Webhooks
2. Add webhook URL: `https://157.245.126.24:8080/api/webhooks/paypal`
3. Select events:
   - BILLING.SUBSCRIPTION.ACTIVATED
   - BILLING.SUBSCRIPTION.CANCELLED
   - BILLING.SUBSCRIPTION.EXPIRED
   - PAYMENT.SALE.COMPLETED

### Step 9: Database Setup

Add subscription storage to your VPS:

```javascript
// MongoDB example
const subscriptions = {
  employeeId: String,
  subscriptionId: String, // PayPal subscription ID
  plan: String, // 'monthly' or 'yearly'
  status: String, // 'active', 'cancelled', 'expired'
  startDate: Date,
  nextBillingDate: Date,
  createdAt: Date
};
```

## Testing

1. Use PayPal Sandbox for testing (separate test accounts)
2. Create test buyer account at https://developer.paypal.com/dashboard/accounts
3. Use sandbox credentials in development
4. Switch to live credentials for production

## Support Links

- **PayPal Developer Docs**: https://developer.paypal.com/docs/subscriptions/
- **Subscription Button Guide**: https://developer.paypal.com/sdk/js/reference/#subscriptions
- **Webhook Reference**: https://developer.paypal.com/api/rest/webhooks/
- **Your PayPal Dashboard**: https://www.paypal.com/businessmanage/account/about

## Important Notes

⚠️ **Security**: Never commit your PayPal Client Secret to GitHub!
- Use environment variables for production
- Keep Client Secret on backend only

⚠️ **Testing**: Always test subscriptions in Sandbox mode first

⚠️ **Customer Support**: Users can manage/cancel subscriptions at:
https://www.paypal.com/myaccount/autopay/

## Current Status

✅ PayPal SDK installed
✅ Subscribe buttons updated
✅ Manage button links to PayPal
✅ Family icon fixed (👪 instead of 👨‍👩‍👧‍👦)
⏳ Need to add Plan IDs from your PayPal account
⏳ Need to implement actual PayPal button components
⏳ Need to set up webhook handler
⏳ Need to add database storage

**Next Action**: Create your PayPal Business account and subscription plans!
