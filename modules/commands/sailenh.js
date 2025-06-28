const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

module.exports.config = {
  name: "",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "pcoder, Kenne400k",
  description: "Random video vdgai dùng cache Mercury CDN (global.pcoder)",
  commandCategory: "video",
  usages: "",
  cooldowns: 0
};

const DATA_PATH = path.join(__dirname, '../../pdata/data_dongdev/datajson/vdgai.json');
let videoList = [];
try { videoList = require(DATA_PATH); } catch { videoList = []; }

// Thính gọn
const tho = [
  "Em có thể đi theo anh được không? Vì em luôn được cha mẹ bảo là phải theo giấc mơ của mình.",
  "Anh yêu ơi ới ời. Anh đang ở đâu?",
  "Soái ca là của ngôn tình, còn anh thì chỉ của mình em thôi.",
  "Nhờ có nắng mới thấy cầu vồng, nhờ có anh mới thấy màu hạnh phúc.",
  "Chỉ cần anh nói yêu, em sẽ bám theo anh suốt đời.",
  "Ba mươi chưa phải là Tết, không làm bạn đâu phải là hết, còn có thể làm người yêu mà.",
  "Nắng đã có mũ, mưa đã có ô, còn em sẽ có ai?",
  "Chồng tương lai ơi, em chờ anh hơi lâu rồi đấy.",
  "Trời đổ mưa rồi sao anh chưa đổ em?",
  "Dạo này anh có thấy mỏi chân? Sao cứ đi trong tim em mãi.",
  "Anh gì ơi! Anh đánh rơi người yêu này.",
  "Tim anh còn chỗ không? Em muốn chuyển nhà mà chưa tìm thấy chỗ.",
  "Uống nhầm một ánh mắt, cơn say theo cả đời!",
  "Em thích anh còn nhiều hơn muối ở biển…",
  "Đường thì dài, chân em thì ngắn. Phải đi bao xa mới có thể tìm thấy anh?",
  "Chán thả thính rồi, ai cưa để em đổ một lần coi.",
  "Nếu có thể hãy để em một lần được yêu anh, được không?",
  "Tuổi tác với chị không quan trọng, vấn đề là em đã có bằng lái chưa?",
  "Nếu ngoài kia nhiều bão tố, thì về đây với em.",
  "Cần ai đó quan tâm để thấy mình được yêu thương.",
  "Anh gì ơi, cho em mượn đèn pin được không? Trời tối quá, em không tìm thấy đường vào tim anh.",
  "Say rượu say bia làm gì? Anh say em đi này.",
  "Anh biết nhiều về Thuốc Mê không? Còn em gói gọn lại đó là anh.",
  "Anh có thấy dạo này da em đen không? Vì mải nhìn nụ cười toả nắng của anh đấy.",
  "Xin lỗi anh gì ơi, anh đi đứng kiểu gì thế? Ngã vào trái tim em rồi kìa!",
  "Em nghĩ chúng mình có điểm chung đấy: anh yêu bản thân anh, còn em thì cũng yêu anh!",
  "Nếu không có gì là mãi mãi, anh có thể là “không có gì” của em được không?",
  "Anh có thể cho em mượn một nụ hôn được không? Em hứa là sẽ trả lại đầy đủ.",
  "Có rất nhiều cách để hạnh phúc. Nhanh nhất chính là nhìn thấy em.",
  "Trong tim em có chỗ nào cho anh không?",
  "Vận tốc trái tim nhanh không em nhỉ? Để anh tính quãng đường đi đến trái tim em.",
  "Ngoài kia đám cưới linh đình. Bao giờ thì đến lượt mình em ơi.",
  "Tay anh đây ấm lắm, em muốn nắm thử không?",
  "Cần lắm một em gái mưa!",
  "Giá có em người yêu để cùng khám phá thế giới.",
  "Đông về tay anh lạnh lắm, nhưng anh vẫn sẵn lòng sưởi ấm tay em.",
  "Mọi người đều yêu cái đẹp, nên anh yêu em.",
  "Bão to, cây đổ. Sao em chưa đổ anh?",
  "Với thế giới thì em chỉ là một người. Còn với anh, em là cả thế giới.",
  "Anh như thế này, đã đủ tiêu chuẩn làm bạn trai em chưa?",
  "Em có muốn làm Mặt Trời duy nhất của anh không?",
  "Chỉ cần em yêu anh thôi, còn cả thế giới cứ để anh lo.",
  "Cuộc đời này chắc chắn không như ý anh muốn, vậy em sẽ như ý anh muốn.",
  "Anh muốn gửi tin nhắn này đến em hôm nay vì hôm nay anh cảm thấy yêu em nhiều đến bất thường."
];

// Luôn dùng global.pcoder, không biến nào khác
if (!global.pcoder) global.pcoder = [];

async function uploadToMercury(url, api) {
  try {
    const res = await axios({ url, responseType: "stream" });
    const form = { upload_1024: res.data };
    const fbRes = await api.postFormData('https://upload.facebook.com/ajax/mercury/upload.php', form);
    const meta = JSON.parse(fbRes.body.replace('for (;;);', '')).payload?.metadata?.[0];
    if (!meta) return null;
    const [[, mercuryUrl]] = Object.entries(meta);
    return mercuryUrl;
  } catch { return null; }
}

module.exports.run = async ({ api, event }) => {
  const timeStart = Date.now();

  // Nếu cache Mercury chưa đủ, tự động upload vào global.pcoder
  if (global.pcoder.length < 1 && videoList.length > 0) {
    try {
      const url = videoList[Math.floor(Math.random() * videoList.length)];
      const mercuryUrl = await uploadToMercury(url, api);
      if (mercuryUrl) global.pcoder.push(mercuryUrl);
    } catch {}
  }

  // Hiển thị thông tin gửi video
  const now = new Date();
  const pad = n => n < 10 ? "0" + n : n;
  const h = pad(now.getHours()), p = pad(now.getMinutes()), s = pad(now.getSeconds());
  const gio = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const randomTho = tho[Math.floor(Math.random() * tho.length)];
  const queues = videoList.filter(v => v.endsWith('.mp4'));
  const replyMsg = `⚠️| Video random vdgai
🌐| Ping: ${Date.now() - timeStart}ms
📥| Tổng: ${videoList.length}
✅| Video khả dụng: ${queues.length}
⏰| Time on: ${h}:${p}:${s}
───────────────
⏱️| ${gio}

${randomTho}`;

  // Gửi video từ global.pcoder (Mercury CDN cache)
  const att = global.pcoder.length > 0 ? global.pcoder.splice(0, 1) : undefined;
  api.sendMessage({
    body: replyMsg,
    attachment: att && att[0] ? att : undefined
  }, event.threadID, event.messageID);
};