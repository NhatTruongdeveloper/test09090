const axios = require('axios');

module.exports.config = {
  name: 'xsmb',
  version: '1.0.0',
  hasPermssion: 0,
  credits: 'Pcoder',
  description: 'Kiểm tra xổ số miền Bắc',
  commandCategory: 'Tiện ích',
  usages: '',
  cooldowns: 3
};

// Auto gửi kết quả vào 18:32 mỗi ngày
module.exports.onLoad = o => {
  if (!!global.xsmb_setinterval) clearInterval(global.xsmb_setinterval);
  global.xsmb_setinterval = setInterval(async () => {
    const now = new Date(Date.now() + 25200000); // GMT+7
    const currentTime = now.toTimeString().split(' ')[0];
    if (currentTime === '18:32:00') {
      try {
        const res = await axios.get('https://api-xsmb-today.onrender.com/api/v1');
        const { results, time } = res.data;

        const msg = `🎯 Kết quả XSMB ngày ${time}:\n` +
          `🟥 ĐB: ${results.ĐB.join(' - ')}\n` +
          `🥇 G1: ${results.G1.join(' - ')}\n` +
          `🥈 G2: ${results.G2.join(' - ')}\n` +
          `🥉 G3: ${results.G3.join(' - ')}\n` +
          `🏅 G4: ${results.G4.join(' - ')}\n` +
          `🏅 G5: ${results.G5.join(' - ')}\n` +
          `🏅 G6: ${results.G6.join(' - ')}\n` +
          `🏅 G7: ${results.G7.join(' - ')}`;

        for (const threadID of global.data.allThreadID) {
          o.api.sendMessage(msg, threadID);
        }
      } catch (e) {
        console.error('[XSMB] Lỗi tự động gửi kết quả:', e);
      }
    }
  }, 1000);
};

module.exports.run = async function ({ api, event }) {
  try {
    const res = await axios.get('https://api-xsmb-today.onrender.com/api/v1');
    const { results, time } = res.data;

    const msg = `🎯 Kết quả XSMB ngày ${time}:\n` +
      `🟥 ĐB: ${results.ĐB.join(' - ')}\n` +
      `🥇 G1: ${results.G1.join(' - ')}\n` +
      `🥈 G2: ${results.G2.join(' - ')}\n` +
      `🥉 G3: ${results.G3.join(' - ')}\n` +
      `🏅 G4: ${results.G4.join(' - ')}\n` +
      `🏅 G5: ${results.G5.join(' - ')}\n` +
      `🏅 G6: ${results.G6.join(' - ')}\n` +
      `🏅 G7: ${results.G7.join(' - ')}`;

    return api.sendMessage(msg, event.threadID, event.messageID);
  } catch (err) {
    console.error('[XSMB] Lỗi lấy dữ liệu:', err);
    return api.sendMessage('❌ Không thể lấy kết quả XSMB lúc này.', event.threadID, event.messageID);
  }
};
