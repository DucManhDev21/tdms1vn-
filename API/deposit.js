// api/deposit.js - Vercel Serverless Function cho Yêu cầu Nạp Tiền
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { userId, amount, transferCode, bankName } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Số tiền nạp không hợp lệ!' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  // Bắn thông báo về Telegram Admin
  if (botToken && chatId) {
    const messageText = 
`💳 *YÊU CẦU NẠP TIỀN MỚI!*

👤 *User ID:* \`${userId || 'N/A'}\`
💵 *Số tiền:* *${Number(amount).toLocaleString('vi-VN')} VNĐ*
🏛 *Ngân hàng:* ${bankName || 'MBBank'}
📝 *Nội dung CK:* \`${transferCode || 'N/A'}\`
⏳ *Trạng thái:* ⚠️ *CHỜ ADMIN DUYỆT*`;

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
      console.error('Lỗi gửi Telegram Deposit:', err);
    }
  }

  return res.status(200).json({ 
    success: true, 
    message: 'Gửi yêu cầu nạp tiền thành công! Vui lòng chờ Admin kiểm tra và duyệt.' 
  });
}
