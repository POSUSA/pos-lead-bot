app.post('/webhook', async (req, res) => {
  console.log('WEBHOOK HIT');
  
  try {
    // Just try to take a screenshot first
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
      message: 'Screenshot taken!',
      imageLength: response.data.length
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.response?.status || error.message,
      details: error.response?.data
    });
  }
});
