const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 8080;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

app.post('/api/authenticate', async (req, res) => {
    const { employeeId, password, airline } = req.body;
    console.log(`🔐 REAL AUTH: ${airline?.toUpperCase() || 'ABX'} pilot: ${employeeId}`);
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        const portalUrl = 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp';
        
        await page.goto(portalUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const pageTitle = await page.title();
        const currentUrl = page.url();
        
        console.log(`📄 Page title: "${pageTitle}"`);
        
        if (currentUrl.includes('auth/realms')) {
            await sleep(3000);
            
            await page.waitForSelector('#username', { timeout: 10000 });
            await page.type('#username', employeeId);
            
            await page.waitForSelector('#password', { timeout: 5000 });
            await page.type('#password', password);
            
            await page.keyboard.press('Enter');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
            
            const postLoginUrl = page.url();
            if (postLoginUrl.includes('auth/realms')) {
                throw new Error('Authentication failed - invalid credentials');
            }
            
            console.log('🎉 REAL AUTHENTICATION SUCCESSFUL!');
        }
        
        await browser.close();
        
        res.json({
            success: true,
            message: `REAL AUTH SUCCESS for ${employeeId}`,
            data: { 
                employeeId, 
                authenticated: true,
                loginTime: new Date().toISOString()
            }
        });
        
    } catch (error) {
        if (browser) await browser.close();
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
            details: error.message
        });
    }
});

app.post('/api/scrape', (req, res) => {
    req.url = '/api/authenticate';
    return app._router.handle(req, res);
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'FlightRosterIQ' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 FlightRosterIQ - REAL AUTHENTICATION!');
    console.log(`🌐 Server running on port ${PORT}`);
    console.log('🔐 Real login form authentication enabled');
    console.log(`🌐 Access at: h2780ttp://157.245.126.24:${PORT}`);
});