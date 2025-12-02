// APIMart Configuration (inline to avoid Vercel routing issues)
const config = {
  API_KEY: process.env.APIMART_API_KEY || '',
  BASE_URL: 'https://api.apimart.ai/v1',
  MODELS: {
    CHAT: 'gemini-2.5-flash',
    IMAGE: 'gemini-3-pro-image-preview'
  }
};

/**
 * APIMart Task Query API
 * Polls image generation task status
 * Returns: pending/processing/completed/failed
 */
module.exports = async (req, res) => {
  const { taskId } = req.query;

  if (!taskId) {
    return res.status(400).json({ error: 'taskId required' });
  }

  console.log('[APIMart Query] Checking task:', taskId);

  try {
    const response = await fetch(`${config.BASE_URL}/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[APIMart Query] API Error:', response.status, errorText);

      // Return structured error response
      return res.json({
        success: false,
        status: 'error',
        error: `API returned ${response.status}`,
        imageUrl: null
      });
    }

    const data = await response.json();

    console.log('[APIMart Query] Task status:', {
      taskId: taskId,
      status: data.status,
      hasResult: !!(data.result && data.result.data)
    });

    // Extract image URL if task is completed
    let imageUrl = null;
    if (data.status === 'completed' && data.result && data.result.data) {
      if (Array.isArray(data.result.data) && data.result.data.length > 0) {
        imageUrl = data.result.data[0].url || data.result.data[0].image_url;
      }
    }

    // Return standardized response
    res.json({
      success: true,
      status: data.status,  // pending/processing/completed/failed
      imageUrl: imageUrl,
      error: data.status === 'failed' ? data.error : null,
      raw: data  // Include full response for debugging
    });

  } catch (error) {
    console.error('[APIMart Query] Error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: error.message,
      imageUrl: null
    });
  }
};
