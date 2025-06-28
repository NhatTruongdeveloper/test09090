const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "ttoi",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "PCODER",
    description: "Text to image bằng DeepFloyd IF",
    commandCategory: "AI-image",
    usages: "/ttoi <prompt>",
    cooldowns: 15
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("Bạn cần nhập prompt mô tả ảnh!", threadID, messageID);

    api.sendMessage("⏳ Đang tạo ảnh AI bằng DeepFloyd IF, vui lòng chờ...", threadID, messageID);

    const pyScript = path.join(__dirname, "Py", "tti.py");
    execFile("python3", [pyScript, prompt], { cwd: path.join(__dirname, "Py"), timeout: 600000 }, async (err, stdout, stderr) => {
        if (err) {
            api.sendMessage("❌ Có lỗi khi chạy model IF: " + (stderr || err.message), threadID, messageID);
            return;
        }
        const imgPath = path.join(__dirname, "Py", stdout.toString().trim());
        if (!fs.existsSync(imgPath)) {
            api.sendMessage("❌ Không tìm thấy file ảnh output!", threadID, messageID);
            return;
        }
        api.sendMessage({
            body: `🖼️ Ảnh tạo từ prompt: ${prompt}`,
            attachment: fs.createReadStream(imgPath)
        }, threadID, () => {
            try { fs.unlinkSync(imgPath); } catch(e) {}
        }, messageID);
    });
};