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
  
  try {
    // Simple test with screenshot endpoint
    const response = await axios({
      method: 'POST',
      url: 'https://chrome.browserless.io/screenshot',
      headers: {
        'Authorization': `Bearer ${process.env.BROWSERLESS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        url: 'https://www.posusa.com/compare/pos/'
      }
    });
    
    res.json({ 
      success: true,
      message: 'Screenshot taken! Browserless is working.',
      imageLength: response.data.length
    });
    
  } catch (error) {
    console.error('Error:', error.response?.status, error.message);
    res.status(500).json({ 
      error: error.response?.status || error.message,
      details: error.response?.data
    });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'Running',
    hasApiKey: !!process.env.BROWSERLESS_API_KEY,
    keyPreview: process.env.BROWSERLESS_API_KEY ? 
      process.env.BROWSERLESS_API_KEY.substring(0, 15) + '...' : 'NOT SET'
  });
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
