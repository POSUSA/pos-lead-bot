const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();
app.use(bodyParser.json());

async function clickXPath(page, xpath, waitMs = 400) {
  const [el] = await page.$x(xpath);
  if (!el) throw new Error(`Not found: ${xpath}`);
  await el.click();
  await page.waitForTimeout(waitMs);
}

async function typeInput(page, placeholder, value) {
  const inputXPath = `//input[contains(@placeholder,"${placeholder}")]`;
  const [input] = await page.$x(inputXPath);
  if (!input) throw new Error(`Input not found: ${placeholder}`);
  await input.click({ clickCount: 3 });
  await input.type(String(value));
  await page.waitForTimeout(200);
}

function getFoodCompanyXPath(c) {
  if (c.includes('Quick Service')) return '//label[contains(text(),"Restaurant - Quick Service")]';
  if (c.includes('Full service')) return '//label[contains(text(),"Restaurant - Full service")]';
  if (c.includes('Bar') || c.includes('Nightclub')) return '//label[contains(text(),"Bar/Nightclub")]';
  if (c.includes('Food Truck')) return '//label[contains(text(),"Food Truck")]';
  return '//label[contains(text(),"Other")]';
}

function getRetailCompanyXPath(c) {
  if (c.includes('Grocery')) return '//label[contains(text(),"Grocery Store")]';
  if (c.includes('Apparel') || c.includes('Footwear')) return '//label[contains(text(),"Apparel / Footwear Store")]';
  if (c.includes('Merchandise') || c.includes('Sports')) return '//label[contains(text(),"Merchandise / Sports Goods Store")]';
  if (c.includes('Salon') || c.includes('Barber')) return '//label[contains(text(),"Salon / Barber")]';
  if (c.includes('Liquor')) return '//label[contains(text(),"Liquor Store")]';
  if (c.includes('Tobacco') || c.includes('Vape')) return '//label[contains(text(),"Tobacco / Vape Store")]';
  return '//label[contains(text(),"Other")]';
}

function getOtherCompanyXPath(c) {
  if (c.includes('Restaurant') || c.includes('Bar') || c.includes('Club')) 
    return '//label[contains(text(),"Restaurant or Nightlife")]';
  if (c.includes('Service') || c.includes('Salon') || c.includes('Barber') || c.includes('Automotive'))
    return '//label[contains(text(),"Service Business")]';
  if (c.includes('Specialty') || c.includes('Tobacco') || c.includes('Vape') || c.includes('Boutique'))
    return '//label[contains(text(),"Specialty Stores")]';
  if (c.includes('Grocery') || c.includes('Essentials'))
    return '//label[contains(text(),"Grocery & Essentials")]';
  if (c.includes('Hotel') || c.includes('Events') || c.includes('Venues'))
    return '//label[contains(text(),"Hotel, Events, or Venues")]';
  return '//label[contains(text(),"Other")]';
}

app.post('/webhook', async (req, res) => {
  const f = req.body;
  console.log('Lead:', f);

  try {
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}&stealth`,
    });
    const page = await browser.newPage();
    await page.goto('https://www.posusa.com/compare/pos/', { waitUntil: 'networkidle2' });

    const ind = (f.industry || 'Other').toLowerCase();
    const indXPath = ind.includes('retail') ? '//div[contains(text(),"Retail")]' 
                   : ind.includes('food') || ind.includes('drink') ? '//div[contains(text(),"Food & Drink")]' 
                   : '//div[contains(text(),"Other")]';
    await clickXPath(page, indXPath);
    await clickXPath(page, '//button[contains(text(),"Compare Quotes")]');

    let compXPath = '//label[contains(text(),"Other")]';
    if (ind.includes('food') || ind.includes('drink')) {
      await page.waitForXPath('//div[contains(text(),"Which best describes your company?")]');
      compXPath = getFoodCompanyXPath(f.company_type || 'Other');
    } else if (ind.includes('retail')) {
      await page.waitForXPath('//div[contains(text(),"Which best describes your company?")]');
      compXPath = getRetailCompanyXPath(f.company_type || 'Other');
    } else {
      await page.waitForXPath('//div[contains(text(),"Which best describes your company?")]');
      compXPath = getOtherCompanyXPath(f.company_type || 'Other');
    }
    await clickXPath(page, compXPath, 300);
    await clickXPath(page, '//button[contains(text(),"Continue")]');

    await page.waitForXPath('//div[contains(text(),"How many terminals do you require?")]');
    const term = f.terminals || '1';
    const termXPath = term === '1' ? '//label[contains(text(),"1") and not(contains(text(),"-"))]'
                    : term === '2' ? '//label[contains(text(),"2") and not(contains(text(),"-"))]'
                    : term === '3-5' ? '//label[contains(text(),"3-5")]'
                    : '//label[contains(text(),"Over 5")]';
    await clickXPath(page, termXPath, 300);
    await clickXPath(page, '//button[contains(text(),"Continue")]');

    await page.waitForXPath('//div[contains(text(),"What is your average monthly revenue?")]');
    const rev = f.monthly_revenue || 'Unknown / Not sure';
    const revXPath = rev.includes('Less than $20,000') ? '//label[contains(text(),"Less than $20,000")]'
                   : rev.includes('$20,000 - $40,000') ? '//label[contains(text(),"$20,000 - $40,000")]'
                   : rev.includes('$40,000 - $80,000') ? '//label[contains(text(),"$40,000 - $80,000")]'
                   : rev.includes('$80,000 - $120,000') ? '//label[contains(text(),"$80,000 - $120,000")]'
                   : rev.includes('More than $120,000') ? '//label[contains(text(),"More than $120,000")]'
                   : '//label[contains(text(),"Unknown / Not sure")]';
    await clickXPath(page, revXPath, 300);
    await clickXPath(page, '//button[contains(text(),"Continue")]');

    await page.waitForXPath('//div[contains(text(),"When do you need your new POS system?")]');
    const timeline = f.timeline || 'ASAP';
    const timelineXPath = timeline.includes('1-3 Months') ? '//label[contains(text(),"1-3 Months")]'
                        : timeline.includes('4-6 Months') ? '//label[contains(text(),"4-6 Months")]'
                        : '//label[contains(text(),"ASAP")]';
    await clickXPath(page, timelineXPath, 300);
    await clickXPath(page, '//button[contains(text(),"Continue")]');

    await page.waitForXPath('//div[contains(text(),"Are you also interested in credit card processing?")]');
    const cc = f.credit_card !== 'No';
    await clickXPath(page, cc ? '//label[contains(text(),"Yes")]' : '//label[contains(text(),"No")]', 300);
    await clickXPath(page, '//button[contains(text(),"Continue")]');

    await page.waitForXPath('//div[contains(text(),"Would you be interested in a free demo?")]');
    const demo = f.demo || 'Yes';
    const demoXPath = demo.includes('Maybe') ? '//label[contains(text(),"Maybe")]'
                    : demo.includes('No') ? '//label[contains(text(),"No")]'
                    : '//label[contains(text(),"Yes")]';
    await clickXPath(page, demoXPath, 300);
    await clickXPath(page, '//button[contains(text(),"Continue")]');

    await page.waitForXPath('//div[contains(text(),"What’s your ZIP code?")]');
    await typeInput(page, '90210', f.zip);
    await clickXPath(page, '//button[contains(text(),"Continue")]');

    await page.waitForXPath('//div[contains(text(),"Almost there")]');
    await typeInput(page, 'Your email address', f.email);
    await clickXPath(page, '//button[contains(text(),"Continue")]');

    await page.waitForXPath('//div[contains(text(),"Only two steps left")]');
    await typeInput(page, 'First Last', f.name);
    await typeInput(page, 'Your company name', f.company);
    await clickXPath(page, '//button[contains(text(),"Continue")]');

    await page.waitForXPath('//div[contains(text(),"This is the last page of questions")]');
    await typeInput(page, 'Your phone number', f.phone);
    await clickXPath(page, '//button[contains(text(),"Compare Quotes")]');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: 'debug-submitted.png' });

    await browser.close();
    res.json({ success: true, message: 'LEAD SUBMITTED!' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Ready'));
