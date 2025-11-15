const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  console.log('WEBHOOK HIT');
  
  const raw = req.body;
  const f = raw.__submission?.user_inputs || raw;
  
  const payload = {
    industry: f.business_type || 'Other',
    company_type: f.retail_type || f.restaurant_type || f.other_type || 'Other',
    terminals: f.number_terminals || '1',
    monthly_revenue: f.monthly_revenue || 'Unknown / Not sure',
    timeline: 'ASAP',
    credit_card: 'Yes',
    demo: f.free_demo === 'yes' ? 'Yes' : 'No',
    zip: f.zip_code,
    email: f.email,
    name: `${f.firstname || ''} ${f.lastname || ''}`.trim(),
    company: f.company_name,
    phone: f.phone
  };
  
  console.log('MAPPED LEAD:', payload);
  
  // Browserless function code
  const browserlessCode = `
    module.exports = async ({ page }) => {
      try {
        // Navigate to form
        await page.goto('https://www.posusa.com/compare/pos/', { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
        console.log('Page loaded');
        
        // STEP 1: INDUSTRY SELECTION
        await page.waitForSelector('div:has-text("What industry are you in?")', { timeout: 10000 });
        
        if ('${payload.industry}'.toLowerCase().includes('food') || '${payload.industry}'.toLowerCase().includes('drink')) {
          await page.click('div:has-text("Food & Drink")');
        } else if ('${payload.industry}'.toLowerCase().includes('retail')) {
          await page.click('div:has-text("Retail")');
        } else {
          await page.click('div:has-text("Other")');
        }
        
        await page.waitForTimeout(500);
        await page.click('button:has-text("Compare Quotes")');
        await page.waitForTimeout(2000);
        
        // STEP 2: COMPANY TYPE
        await page.waitForSelector('label', { timeout: 10000 });
        
        // Handle Food & Drink types
        if ('${payload.industry}'.toLowerCase().includes('food') || '${payload.industry}'.toLowerCase().includes('drink')) {
          if ('${payload.company_type}'.includes('Quick Service')) {
            await page.click('label:has-text("Restaurant - Quick Service")');
          } else if ('${payload.company_type}'.includes('Full')) {
            await page.click('label:has-text("Restaurant - Full service")');
          } else if ('${payload.company_type}'.includes('Bar') || '${payload.company_type}'.includes('Nightclub')) {
            await page.click('label:has-text("Bar / Nightclub")');
          } else if ('${payload.company_type}'.includes('Food Truck')) {
            await page.click('label:has-text("Food Truck")');
          } else {
            await page.click('label:has-text("Other")');
          }
        } else {
          // For Retail and Other, just click Other for now
          await page.click('label:has-text("Other")');
        }
        
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // STEP 3: TERMINALS
        await page.waitForSelector('label:has-text("terminal")', { timeout: 10000 });
        
        if ('${payload.terminals}' === '1') {
          await page.click('label:has-text("1"):not(:has-text("-"))');
        } else if ('${payload.terminals}' === '2') {
          await page.click('label:has-text("2"):not(:has-text("-"))');
        } else if ('${payload.terminals}'.includes('3')) {
          await page.click('label:has-text("3-5")');
        } else {
          await page.click('label:has-text("Over 5")');
        }
        
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // STEP 4: REVENUE
        await page.waitForSelector('label:has-text("$")', { timeout: 10000 });
        
        if ('${payload.monthly_revenue}'.includes('Less than')) {
          await page.click('label:has-text("Less than $20,000")');
        } else if ('${payload.monthly_revenue}'.includes('20,000 - $40,000')) {
          await page.click('label:has-text("$20,000 - $40,000")');
        } else if ('${payload.monthly_revenue}'.includes('40,000 - $80,000')) {
          await page.click('label:has-text("$40,000 - $80,000")');
        } else if ('${payload.monthly_revenue}'.includes('80,000 - $120,000')) {
          await page.click('label:has-text("$80,000 - $120,000")');
        } else if ('${payload.monthly_revenue}'.includes('More than')) {
          await page.click('label:has-text("More than $120,000")');
        } else {
          await page.click('label:has-text("Unknown / Not sure")');
        }
        
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // STEP 5: TIMELINE (ALWAYS ASAP)
        await page.waitForSelector('label:has-text("ASAP")', { timeout: 10000 });
        await page.click('label:has-text("ASAP")');
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // STEP 6: CREDIT CARD (ALWAYS YES)
        await page.waitForSelector('label:has-text("Yes")', { timeout: 10000 });
        await page.click('label:has-text("Yes")');
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // STEP 7: DEMO
        await page.waitForSelector('label:has-text("Maybe")', { timeout: 10000 });
        
        if ('${payload.demo}' === 'Yes') {
          await page.click('label:has-text("Yes")');
        } else if ('${payload.demo}' === 'No') {
          await page.click('label:has-text("No")');
        } else {
          await page.click('label:has-text("Maybe")');
        }
        
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // STEP 8: ZIP CODE
        await page.waitForSelector('input[placeholder*="90210"]', { timeout: 10000 });
        await page.type('input[placeholder*="90210"]', '${payload.zip}');
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // STEP 9: EMAIL
        await page.waitForSelector('input[placeholder*="email"]', { timeout: 10000 });
        await page.type('input[placeholder*="email" i]', '${payload.email}');
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // STEP 10: NAME & COMPANY
        await page.waitForSelector('input[placeholder*="First Last"]', { timeout: 10000 });
        await page.type('input[placeholder*="First Last"]', '${payload.name}');
        await page.type('input[placeholder*="company" i]', '${payload.company}');
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // STEP 11: PHONE
        await page.waitForSelector('input[placeholder*="phone" i]', { timeout: 10000 });
        await page.type('input[placeholder*="phone" i]', '${payload.phone}');
        
        // FINAL SUBMIT
        await page.click('button:has-text("Compare Quotes")');
        await page.waitForTimeout(5000);
        
        // Take screenshot
        const screenshot = await page.screenshot({ encoding: 'base64' });
        
        return { 
          success: true, 
          email: '${payload.email}',
          screenshot: screenshot
        };
        
      } catch (error) {
        console.error('Browser automation error:', error);
        const errorScreenshot = await page.screenshot({ encoding: 'base64' });
        return { 
          success: false, 
          error: error.message,
          screenshot: errorScreenshot
        };
      }
    };
  `;
  
  try {
    // Call Browserless API
    const response = await axios.post(
      'https://chrome.browserless.io/function',
      { 
        code: browserlessCode,
        context: {}
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.BROWSERLESS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    console.log('BROWSERLESS SUCCESS!', response.data);
    res.json({ 
      success: true, 
      message: 'Lead submitted successfully!',
      result: response.data 
    });
    
  } catch (error) {
    console.error('ERROR:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      error: error.response?.data || error.message 
    });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Bot is running!', timestamp: new Date() });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`BOT LIVE on port ${process.env.PORT || 3000}`);
});
