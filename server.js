const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();
app.use(bodyParser.json());

// === DEBUG: SHOW TOKEN ===
app.post('/webhook', async (req, res) => {
  console.log('TOKEN LOADED:', process.env.BROWSERLESS_TOKEN ? 'YES' : 'NO');
  console.log('TOKEN START:', process.env.BROWSERLESS_TOKEN?.slice(0, 10) + '...');

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

  try {
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}&stealth`,
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    await page.goto('https://www.posusa.com/compare/pos/', { waitUntil: 'networkidle2' });

    // === 1. INDUSTRY ===
    const ind = payload.industry.toLowerCase();
    const indXPath = ind.includes('retail') ? '//div[contains(text(),"Retail")]'
                   : ind.includes('food') || ind.includes('drink') ? '//div[contains(text(),"Food & Drink")]'
                   : '//div[contains(text(),"Other")]';
    await page.waitForXPath(indXPath, { timeout: 10000 });
    await (await page.$x(indXPath))[0].click();
    await page.click('//button[contains(text(),"Compare Quotes")]');
    await page.waitForTimeout(1000);

    // === 2. COMPANY TYPE ===
    let compXPath = '//label[contains(text(),"Other")]';
    if (ind.includes('food') || ind.includes('drink')) {
      await page.waitForXPath('//div[contains(text(),"Which best describes your company?")]');
      compXPath = payload.company_type.includes('Quick Service') ? '//label[contains(text(),"Restaurant - Quick Service")]'
                : payload.company_type.includes('Full service') ? '//label[contains(text(),"Restaurant - Full service")]'
                : payload.company_type.includes('Bar') || payload.company_type.includes('Nightclub') ? '//label[contains(text(),"Bar/Nightclub")]'
                : payload.company_type.includes('Food Truck') ? '//label[contains(text(),"Food Truck")]'
                : '//label[contains(text(),"Other")]';
    } else if (ind.includes('retail')) {
      await page.waitForXPath('//div[contains(text(),"Which best describes your company?")]');
      compXPath = payload.company_type.includes('Grocery') ? '//label[contains(text(),"Grocery Store")]'
                : payload.company_type.includes('Apparel') || payload.company_type.includes('Footwear') ? '//label[contains(text(),"Apparel / Footwear Store")]'
                : payload.company_type.includes('Merchandise') || payload.company_type.includes('Sports') ? '//label[contains(text(),"Merchandise / Sports Goods Store")]'
                : payload.company_type.includes('Salon') || payload.company_type.includes('Barber') ? '//label[contains(text(),"Salon / Barber")]'
                : payload.company_type.includes('Liquor') ? '//label[contains(text(),"Liquor Store")]'
                : payload.company_type.includes('Tobacco') || payload.company_type.includes('Vape') ? '//label[contains(text(),"Tobacco / Vape Store")]'
                : '//label[contains(text(),"Other")]';
    } else {
      await page.waitForXPath('//div[contains(text(),"Which best describes your company?")]');
      compXPath = payload.company_type.includes('Restaurant') || payload.company_type.includes('Bar') || payload.company_type.includes('Club')
                ? '//label[contains(text(),"Restaurant or Nightlife")]'
                : payload.company_type.includes('Service') || payload.company_type.includes('Salon') || payload.company_type.includes('Barber') || payload.company_type.includes('Automotive')
                ? '//label[contains(text(),"Service Business")]'
                : payload.company_type.includes('Specialty') || payload.company_type.includes('Tobacco') || payload.company_type.includes('Vape') || payload.company_type.includes('Boutique')
                ? '//label[contains(text(),"Specialty Stores")]'
                : payload.company_type.includes('Grocery') || payload.company_type.includes('Essentials')
                ? '//label[contains(text(),"Grocery & Essentials")]'
                : payload.company_type.includes('Hotel') || payload.company_type.includes('Events') || payload.company_type.includes('Venues')
                ? '//label[contains(text(),"Hotel, Events, or Venues")]'
                : '//label[contains(text(),"Other")]';
    }
    await (await page.$x(compXPath))[0].click();
    await page.click('//button[contains(text(),"Continue")]');
    await page.waitForTimeout(1000);

    // === 3. TERMINALS ===
    await page.waitForXPath('//div[contains(text(),"How many terminals do you require?")]');
    const termXPath = payload.terminals === '1' ? '//label[contains(text(),"1") and not(contains(text(),"-"))]'
                    : payload.terminals === '2' ? '//label[contains(text(),"2") and not(contains(text(),"-"))]'
                    : payload.terminals === '3-5' ? '//label[contains(text(),"3-5")]'
                    : '//label[contains(text(),"Over 5")]';
    await (await page.$x(termXPath))[0].click();
    await page.click('//button[contains(text(),"Continue")]');
    await page.waitForTimeout(1000);

    // === 4. REVENUE ===
    await page.waitForXPath('//div[contains(text(),"What is your average monthly revenue?")]');
    const revXPath = payload.monthly_revenue.includes('Less than $20,000') ? '//label[contains(text(),"Less than $20,000")]'
                   : payload.monthly_revenue.includes('$20,000 - $40,000') ? '//label[contains(text(),"$20,000 - $40,000")]'
                   : payload.monthly_revenue.includes('$40,000 - $80,000') ? '//label[contains(text(),"$40,000 - $80,000")]'
                   : payload.monthly_revenue.includes('$80,000 - $120,000') ? '//label[contains(text(),"$80,000 - $120,000")]'
                   : payload.monthly_revenue.includes('More than $120,000') ? '//label[contains(text(),"More than $120,000")]'
                   : '//label[contains(text(),"Unknown / Not sure")]';
    await (await page.$x(revXPath))[0].click();
    await page.click('//button[contains(text(),"Continue")]');
    await page.waitForTimeout(1000);

    // === 5. TIMELINE ===
    await page.waitForXPath('//div[contains(text(),"When do you need your new POS system?")]');
    const timelineXPath = payload.timeline.includes('1-3 Months') ? '//label[contains(text(),"1-3 Months")]'
                        : payload.timeline.includes('4-6 Months') ? '//label[contains(text(),"4-6 Months")]'
                        : '//label[contains(text(),"ASAP")]';
    await (await page.$x(timelineXPath))[0].click();
    await page.click('//button[contains(text(),"Continue")]');
    await page.waitForTimeout(1000);

    // === 6. CREDIT CARD ===
    await page.waitForXPath('//div[contains(text(),"Are you also interested in credit card processing?")]');
    await page.click(payload.credit_card === 'Yes' ? '//label[contains(text(),"Yes")]' : '//label[contains(text(),"No")]');
    await page.click('//button[contains(text(),"Continue")]');
    await page.waitForTimeout(1000);

    // === 7. DEMO ===
    await page.waitForXPath('//div[contains(text(),"Would you be interested in a free demo?")]');
    const demoXPath = payload.demo.includes('Maybe') ? '//label[contains(text(),"Maybe")]'
                    : payload.demo.includes('No') ? '//label[contains(text(),"No")]'
                    : '//label[contains(text(),"Yes")]';
    await (await page.$x(demoXPath))[0].click();
    await page.click('//button[contains(text(),"Continue")]');
    await page.waitForTimeout(1000);

    // === 8. ZIP ===
    await page.waitForXPath('//div[contains(text(),"What’s your ZIP code?")]');
    await page.type('input[placeholder*="90210"]', payload.zip);
    await page.click('//button[contains(text(),"Continue")]');
    await page.waitForTimeout(1000);

    // === 9. EMAIL ===
    await page.waitForXPath('//div[contains(text(),"Almost there")]');
    await page.type('input[placeholder*="Your email address"]', payload.email);
    await page.click('//button[contains(text(),"Continue")]');
    await page.waitForTimeout(1000);

    // === 10. NAME + COMPANY ===
    await page.waitForXPath('//div[contains(text(),"Only two steps left")]');
    await page.type('input[placeholder*="First Last"]', payload.name);
    await page.type('input[placeholder*="Your company name"]', payload.company);
    await page.click('//button[contains(text(),"Continue")]');
    await page.waitForTimeout(1000);

    // === 11. PHONE ===
    await page.waitForXPath('//div[contains(text(),"This is the last page of questions")]');
    await page.type('input[placeholder*="Your phone number"]', payload.phone);
    await page.click('//button[contains(text(),"Compare Quotes")]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

    await page.screenshot({ path: 'debug-submitted.png' });
    console.log('LEAD SUBMITTED!');

    await browser.close();
    res.json({ success: true, message: 'LEAD SUBMITTED!' });
  } catch (err) {
    console.error('BOT ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('BOT LIVE'));
