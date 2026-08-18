// api/services.js - Vercel Serverless Function
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const API_KEY = process.env.PROVIDER_API_KEY;
  const API_URL = process.env.PROVIDER_API_URL || 'https://smms1vn.com/api/v2';

  if (!API_KEY) {
    return res.status(500).json({ success: false, message: 'Chưa cấu hình PROVIDER_API_KEY' });
  }

  try {
    const params = new URLSearchParams({
      key: API_KEY,
      action: 'services'
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await response.json();

    return res.status(200).json({
      success: true,
      data: data
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi kết nối SMMS1VN: ' + error.message 
    });
  }
}
