// api/order.js - Vercel Serverless Function cho Đơn Hàng Dịch Vụ
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { serviceId, serviceName, link, quantity, totalPrice, userId } = req.body;

  const API_KEY = process.env.PROVIDER_API_KEY;
  const API_URL = process.env.PROVIDER_API_URL || 'https://smms1vn.com/api/v2';

  if (!API_KEY) {
    return res.status(500).json({ 
      success: false, 
      message: 'Chưa cấu hình PROVIDER_API_KEY trên Vercel!' 
    });
  }

  try {
    // 1. Gọi API tạo đơn sang SMMS1VN
    const params = new URLSearchParams({
      key: API_KEY,
      action: 'add',
      service: serviceId,
      link: link,
      quantity: quantity
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ success: false, message: data.error });
    }

    const providerOrderId = data.order;

    // 2. Bắn thông báo đơn hàng mới tới Telegram Admin
    sendTelegramOrderAlert({
      providerOrderId,
      serviceName,
      serviceId,
      link,
      quantity,
      totalPrice,
      userId
    });

    return res.status(200).json({
      success: true,
      providerOrderId: providerOrderId
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi kết nối tới SMMS1VN: ' + error.message 
    });
  }
}

async function sendTelegramOrderAlert({ providerOrderId, serviceName, serviceId, link, quantity, totalPrice, userId }) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!botToken || !chatId) return;

  const messageText = 
`🛒 *ĐƠN HÀNG DỊCH VỤ MỚI!*

🆔 *Mã đơn SMMS1VN:* \`#${providerOrderId}\`
🛠 *Dịch vụ:* ${serviceName || 'Server ' + serviceId}
🔗 *Link/ID:* ${link}
🔢 *Số lượng:* ${Number(quantity).toLocaleString('vi-VN')}
💰 *Tổng tiền:* ${Number(totalPrice).toLocaleString('vi-VN')} VNĐ
👤 *User ID:* \`${userId || 'N/A'}\``;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error('Lỗi gửi Telegram Order:', err);
  }
}
