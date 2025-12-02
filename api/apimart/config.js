// APIMart API Configuration
module.exports = {
  API_KEY: process.env.APIMART_API_KEY || '',
  BASE_URL: 'https://api.apimart.ai/v1',
  MODELS: {
    // Gemini 2.5 Flash for text analysis (BaZi + MBTI) - Faster and more stable
    CHAT: 'gemini-2.5-flash',
    // Gemini 3 Pro Image for card generation (Nano banana2)
    IMAGE: 'gemini-3-pro-image-preview'
  }
};
