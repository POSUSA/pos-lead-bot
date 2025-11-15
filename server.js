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
  
  // Create the function as a string WITHOUT template literals inside
  const browserlessCode = `
    module.exports = async ({ page }) => {
      try {
        const data = ${JSON.stringify(payload)};
        
        await page.goto('https://www.posusa.com/compare/pos/', { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
        
        // STEP 1: INDUSTRY
        await page.waitForSelector('div:has-text("What industry are you in?")', { timeout: 10000 });
        
        if (data.industry.toLowerCase().includes('food') || data.industry.toLowerCase().includes('drink')) {
          await page.click('div:has-text("Food & Drink")');
        } else if (data.industry.toLowerCase().includes('retail')) {
          await page.click('div:has-text("Retail")');
        } else {
          await page.click('div:has-text("Other")');
        }
        
        await page.waitForTimeout(500);
        await page.click('button:has-text("Compare Quotes")');
        await page.waitForTimeout(2000);
        
        // STEP 2: COMPANY TYPE
        await page.waitForSelector('label', { timeout: 10000 });
        
        if (data.industry.toLowerCase().includes('food')) {
          if (data.company_type.includes('Quick')) {
            await page.click('label:has-text("Restaurant - Quick Service")');
          } else if (data.company_type.includes('Full')) {
            await page.click('label:has-text("Restaurant - Full service")');
          } else if (data.company_type.includes('Bar') || data.company_type.includes('Nightclub')) {
            await page.click('label:has-text("Bar / Nightclub")');
          } else if (data.company_type.includes('Food Truck')) {
            await page.click('label:has-text("Food Truck")');
          } else {
            await page.click('label:has-text("Other")');
          }
        } else {
          const otherLabels = await page.$$('label:has-text("Other")');
          if (otherLabels.length > 0) {
            await otherLabels[0].click();
          }
        }
        
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // Continue with remaining steps...
        // TERMINALS
        await page.waitForSelector('div:has-text("How many terminals")', { timeout: 10000 });
        if (data.terminals === '1') {
          await page.click('label:has-text("1")');
        } else if (data.terminals === '2') {
          await page.click('label:has-text("2")');
        } else {
          await page.click('label:has-text("3-5")');
        }
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // REVENUE
        await page.waitForSelector('div:has-text("monthly revenue")', { timeout: 10000 });
        await page.click('label:has-text("Less than $20,000")');
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // TIMELINE - ASAP
        await page.waitForSelector('label:has-text("ASAP")', { timeout: 10000 });
        await page.click('label:has-text("ASAP")');
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // CREDIT CARD - YES
        await page.waitForSelector('label:has-text("Yes")', { timeout: 10000 });
        const yesLabels = await page.$$('label:has-text("Yes")');
        if (yesLabels.length > 0) {
          await yesLabels[0].click();
        }
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // DEMO
        await page.waitForSelector('div:has-text("free demo")', { timeout: 10000 });
        if (data.demo === 'No') {
          await page.click('label:has-text("No")');
        } else {
          await page.click('label:has-text("Maybe")');
        }
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // ZIP
        await page.waitForSelector('input[type="text"]', { timeout: 10000 });
        await page.type('input[type="text"]', data.zip);
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // EMAIL
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        await page.type('input[type="email"]', data.email);
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // NAME & COMPANY
        const textInputs = await page.$$('input[type="text"]');
        if (textInputs[0]) await textInputs[0].type(data.name);
        if (textInputs[1]) await textInputs[1].type(data.company);
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(2000);
        
        // PHONE
        await page.waitForSelector('input[type="tel"]', { timeout: 10000 });
        await page.type('input[type="tel"]', data.phone);
        await page.click('button:has-text("Compare Quotes")');
        
        await page.waitForTimeout(5000);
        
        return { 
          success: true, 
          email: data.email,
          company: data.company
        };
        
      } catch (error) {
        return { 
          success: false, 
          error: error.message
        };
      }
    };
  `;
  
  try {
    console.log('Calling Browserless...');
    
    const response = await axios.post(
      'https://chrome.browserless.io/function',
      { 
        code: browserlessCode
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

app.get('/', (req, res) => {
  res.json({ status: 'Bot is running!', timestamp: new Date() });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`BOT LIVE on port ${process.env.PORT || 3000}`);
});
