module.exports.config = {
  name: "money",
  version: "1.3.3",
  hasPermssion: 0,
  credits: "Quất + Copilot + Kenne400k",
  description: "Quản lý tiền, bank, hiển thị số dư user, fix NaN, auto cập nhật bank cho user thực",
  commandCategory: "Người dùng",
  usages: "/money [view|bank|addbank|+|-|*|/|++|--|+-|+%|-%|pay]",
  cooldowns: 0,
  usePrefix: false,
};

function safeNumber(val, fallback = 0) {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string" && !isNaN(Number(val))) return Number(val);
  return fallback;
}

module.exports.run = async function ({ Currencies, api, event, args, Users, permssion }) {
  const axios = require("axios");
  const { threadID, senderID, mentions, type, messageReply } = event;
  let targetID = senderID;
  if (type == 'message_reply') {
    targetID = messageReply.senderID;
  } else if (Object.keys(mentions).length > 0) {
    targetID = Object.keys(mentions)[0];
  }
  const name = (await Users.getNameUser(targetID));
  const i = (url) => axios.get(url, { responseType: "stream" }).then((r) => r.data);
  const link = "https://i.imgur.com/u4PjmLl.jpeg";
  const moment = require("moment-timezone");
  const time = moment.tz("Asia/Ho_Chi_Minh").format('HH:mm:ss - DD/MM/YYYY');

  // Đảm bảo user hiện tại luôn có bank và money chuẩn số
  async function ensureBankField(uid) {
    if (!uid) return null;
    let data = await Currencies.getData(uid);
    let changed = false;
    if (typeof data.bank !== "number" || isNaN(data.bank)) {
      data.bank = safeNumber(data.bank, 0);
      changed = true;
    }
    if (typeof data.money !== "number" || isNaN(data.money)) {
      data.money = safeNumber(data.money, 0);
      changed = true;
    }
    if (changed) await Currencies.setData(uid, data);
    return data;
  }

  const guide = `
=== [ HƯỚNG DẪN MONEY ] ===
• /money => Xem số dư và hướng dẫn sử dụng
• /money view => Xem số dư ví & bank của bạn/người được tag/reply
• /money + [số tiền] => Cộng tiền (admin)
• /money - [số tiền] => Trừ tiền (admin)
• /money * [x] => Nhân tiền (admin)
• /money / [x] => Chia tiền (admin)
• /money ++ => Set tiền thành vô hạn (admin)
• /money -- => Reset tiền về 0 (admin)
• /money +- [số tiền] => Set tiền về số cụ thể (admin)
• /money +% [x] => Cộng thêm x% số tiền (admin)
• /money -% [x] => Trừ đi x% số tiền (admin)
• /money pay [số tiền/@tag] => Chuyển tiền cho người khác
• /money bank => Xem số tiền trong bank
• /money addbank [số tiền] => Chuyển tiền từ ví vào bank
==========================
`;

  // Lấy data user sau khi chắc chắn đã có bank field
  let userData = await ensureBankField(targetID);
  if (!userData) return api.sendMessage("Không tìm thấy người dùng!", threadID);
  let money = safeNumber(userData.money);
  let bank = safeNumber(userData.bank);
  const mon = args[1] && !isNaN(args[1]) ? safeNumber(args[1]) : 0;

  try {
    // Nếu không có args, hiện số dư & hướng dẫn
    if (!args[0]) {
      return api.sendMessage(
        `👤 ${name}\n💸 Ví: ${money}$\n🏦 Bank: ${bank}$\n⏰ ${time}\n\n${guide}`,
        threadID
      );
    }
    if (["help", "hướngdẫn", "h", "-h"].includes(args[0].toLowerCase())) {
      return api.sendMessage(guide, threadID);
    }

    switch (args[0].toLowerCase()) {
      case "view": {
        let data = await ensureBankField(targetID);
        return api.sendMessage(
          `👤 ${name}\n💸 Ví: ${safeNumber(data.money)}$\n🏦 Bank: ${safeNumber(data.bank)}$\n⏰ ${time}`,
          threadID
        );
      }
      case "bank": {
        let data = await ensureBankField(targetID);
        return api.sendMessage(
          `🏦 Bank của ${name} hiện tại: ${safeNumber(data.bank)}$\n💸 Ví: ${safeNumber(data.money)}$\n⏰ ${time}`,
          threadID
        );
      }
      case "addbank": {
        if (!args[1] || isNaN(mon) || mon < 1)
          return api.sendMessage("Vui lòng nhập số tiền hợp lệ để chuyển vào bank.", threadID);
        let data = await ensureBankField(targetID);
        let userMoney = safeNumber(data.money);
        let userBank = safeNumber(data.bank);
        if (userMoney < mon)
          return api.sendMessage("Bạn không đủ tiền để chuyển vào bank.", threadID);
        data.money = userMoney - mon;
        data.bank = userBank + mon;
        await Currencies.setData(targetID, data);
        return api.sendMessage(
          `🏦 Bạn đã chuyển ${mon}$ vào bank.\n🏦 Bank hiện tại: ${data.bank}$\n💸 Ví: ${data.money}$\n⏰ ${time}`,
          threadID
        );
      }
      case "+": {
        if (permssion < 2) return api.sendMessage("Bạn không đủ quyền", threadID);
        await Currencies.increaseMoney(targetID, mon);
        let newMoney = money + mon;
        return api.sendMessage({ body: `💸 Money của ${name} được cộng thêm ${mon}$\n💸 Hiện còn ${newMoney}$\n⏰ ${time}`, attachment: await i(link) }, threadID);
      }
      case "-": {
        if (permssion < 2) return api.sendMessage("Bạn không đủ quyền", threadID);
        await Currencies.increaseMoney(targetID, -mon);
        let newMoney = money - mon;
        return api.sendMessage({ body: `💸 Money của ${name} bị trừ đi ${mon}$\n💸 Hiện còn ${newMoney}$\n⏰ ${time}`, attachment: await i(link) }, threadID);
      }
      case "*": {
        if (permssion < 2) return api.sendMessage("Bạn không đủ quyền", threadID);
        await Currencies.increaseMoney(targetID, money * (mon - 1));
        let newMoney = money * mon;
        return api.sendMessage({ body: `💸 Money của ${name} được nhân lên ${mon} lần\n💸 Hiện còn ${newMoney}$\n⏰ ${time}`, attachment: await i(link) }, threadID);
      }
      case "/": {
        if (permssion < 2) return api.sendMessage("Bạn không đủ quyền", threadID);
        let divided = mon === 0 ? 0 : money / mon;
        await Currencies.increaseMoney(targetID, -money + divided);
        return api.sendMessage({ body: `💸 Money của ${name} bị chia đi ${args[1]} lần\n💸 Hiện còn ${divided}$\n⏰ ${time}`, attachment: await i(link) }, threadID);
      }
      case "++": {
        if (permssion < 2) return api.sendMessage("Bạn không đủ quyền", threadID);
        await Currencies.increaseMoney(targetID, Infinity);
        return api.sendMessage({ body: `💸 Money của ${name} được thay đổi thành vô hạn\n💸 Hiện còn Infinity$\n⏰ ${time}`, attachment: await i(link) }, threadID);
      }
      case "--": {
        if (permssion < 2) return api.sendMessage("Bạn không đủ quyền", threadID);
        await Currencies.decreaseMoney(targetID, money);
        return api.sendMessage({ body: `💸 Money của ${name} bị reset\n💸 Hiện còn 0$\n⏰ ${time}`, attachment: await i(link) }, threadID);
      }
      case "+-": {
        if (permssion < 2) return api.sendMessage("Bạn không đủ quyền", threadID);
        await Currencies.decreaseMoney(targetID, money);
        await Currencies.increaseMoney(targetID, mon);
        return api.sendMessage({ body: `💸 Money của ${name} được thay đổi thành ${mon}$\n💸 Money hiện tại ${mon}$\n⏰ ${time}`, attachment: await i(link) }, threadID);
      }
      case "^": {
        if (permssion < 2) return api.sendMessage("Bạn không đủ quyền", threadID);
        let powed = Math.pow(money, mon);
        await Currencies.increaseMoney(targetID, -money + powed);
        return api.sendMessage({ body: `💸 Money của ${name} được lũy thừa lên ${mon} lần\n💸 Money hiện tại ${powed}$\n⏰ ${time}`, attachment: await i(link) }, threadID);
      }
      case "√": {
        if (permssion < 2) return api.sendMessage("Bạn không đủ quyền", threadID);
        let sqrted = Math.pow(money, 1 / mon);
        await Currencies.increaseMoney(targetID, -money + sqrted);
        return api.sendMessage({ body: `💸 Money của ${name} được căn bậc ${mon}\n💸 Hiện còn ${sqrted}$\n⏰ ${time}`, attachment: await i(link) }, threadID);
      }
      case "+%": {
        if (permssion < 2) return api.sendMessage("Bạn không đủ quyền", threadID);
        let addPercent = money * (mon / 100);
        await Currencies.increaseMoney(targetID, addPercent);
        return api.sendMessage({ body: `💸 Money của ${name} được cộng thêm ${mon}%\n💸 Hiện còn ${money + addPercent}$\n⏰ ${time}`, attachment: await i(link) }, threadID);
      }
      case "-%": {
        if (permssion < 2) return api.sendMessage("Bạn không đủ quyền", threadID);
        let subPercent = money * (mon / 100);
        await Currencies.increaseMoney(targetID, -subPercent);
        return api.sendMessage({ body: `💸 Money của ${name} bị trừ đi ${mon}%\n💸 Hiện còn ${money - subPercent}$\n⏰ ${time}`, attachment: await i(link) }, threadID);
      }
      case "pay": {
        let senderData = await ensureBankField(senderID);
        const money2 = safeNumber(senderData.money);
        var bet = args[1] === 'all' ? money2 : safeNumber(args[1]);
        if (money < 1 || bet > money)
          return api.sendMessage({ body: "Bạn có ít hơn 1$ hoặc bạn số tiền chuyển lớn hơn số dư của bạn", attachment: await i(link) }, threadID);
        await Currencies.increaseMoney(senderID, -bet);
        await Currencies.increaseMoney(targetID, bet);
        return api.sendMessage(`Đã chuyển cho ${name} ${bet}$`, threadID);
      }
      default: {
        // Nếu nhập sai, trả về hướng dẫn và số dư
        return api.sendMessage(
          `👤 ${name}\n💸 Ví: ${money}$\n🏦 Bank: ${bank}$\n⏰ ${time}\n\n${guide}`,
          threadID
        );
      }
    }
  } catch (e) {
    console.log(e);
    return api.sendMessage("Đã xảy ra lỗi!", threadID);
  }
};