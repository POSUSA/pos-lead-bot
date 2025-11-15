const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  console.log('WEBHOOK HIT');
  
  // Simple test function
  const testCode = `module.exports = async ({ page }) => {
    await page.goto('https://www.google.com');
    const title = await page.title();
    return { success: true, title: title };
  }`;
  
  try {
    console.log('Testing Browserless connection...');
    console.log('API Key:', process.env.BROWSERLESS_API_KEY ? 'Key exists' : 'NO KEY FOUND!');
    
    const response = await axios({
      method: 'POST',
      url: 'https://chrome.browserless.io/function',
      headers: {
        'Authorization': `Bearer ${process.env.BROWSERLESS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        code: testCode
      }
    });
    
    console.log('SUCCESS:', response.data);
    res.json({ success: true, data: response.data });
    
  } catch (error) {
    console.error('Full error:', error.response?.status, error.response?.statusText);
    console.error('Error data:', error.response?.data);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'Running',
    hasApiKey: !!process.env.BROWSERLESS_API_KEY,
    keyPreview: process.env.BROWSERLESS_API_KEY ? process.env.BROWSERLESS_API_KEY.substring(0, 10) + '...' : 'NOT SET'
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
