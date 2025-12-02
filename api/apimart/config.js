// APIMart API Configuration
module.exports = {
  API_KEY: process.env.APIMART_API_KEY || '',
  BASE_URL: 'https://api.apimart.ai/v1',
  MODELS: {
    // Gemini 3 Pro for text analysis (BaZi + MBTI)
    CHAT: 'gemini-3-pro-preview',
    // Gemini 3 Pro Image for card generation (Nano banana2)
    IMAGE: 'gemini-3-pro-image-preview'
  }
};
