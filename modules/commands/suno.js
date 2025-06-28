const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SUNO_APIKEY_PATH = path.join(__dirname, 'suno_apikey.txt');
const DEFAULT_CALLBACK = "https://example.com/suno_callback";

module.exports.config = {
    name: "suno",
    version: "1.2.0",
    hasPermssion: 2,
    credits: "Pcoder, Copilot",
    description: "Tạo nhạc AI Suno (chỉ dùng model V3_5, có help)",
    commandCategory: "media",
    usages: `
/suno <prompt> [--callback <url>]
/suno custom <prompt> --style <style> --title <title> [--instr] [--negative <tags>] [--callback <url>]
/suno lyrics "lời bài hát" styles "style" --title <title> [--negative <tags>] [--callback <url>]
/suno apikey <key>
/suno help
- Tạo nhạc AI Suno model 3.5 với prompt đơn giản hoặc custom lyrics/style/title.
- Đổi apikey hoặc xem hướng dẫn chi tiết với suno help.
    `.trim(),
    cooldowns: 8
};

function getApiKey() {
    if (fs.existsSync(SUNO_APIKEY_PATH)) {
        return fs.readFileSync(SUNO_APIKEY_PATH, "utf-8").trim();
    }
    return null;
}
function setApiKey(newKey) {
    fs.writeFileSync(SUNO_APIKEY_PATH, newKey.trim());
}

// Hiển thị hướng dẫn chi tiết
const helpText = `
=== SUNO MUSIC BOT HELP ===

1. Prompt đơn giản, nhạc auto lyric:
  /suno Một bản nhạc thiếu nhi vui nhộn
  (Chỉ cần prompt, nhạc sẽ tự sinh lời, tối đa 400 ký tự.)

2. Custom lyrics + style + title (nhạc đúng lyrics bạn nhập):
  /suno lyrics "Lời bài hát" styles "Pop" --title "Tên bài hát"
  (Có thể thêm --negative <tags> để tránh phong cách nào đó, --callback <url> nếu muốn.)

3. Custom mode đầy đủ (chọn instrumental hoặc có lời):
  /suno custom <prompt hoặc lyrics> --style <thể loại> --title <tên> [--instr] [--negative <tags>] [--callback <url>]

  - Nếu có --instr: chỉ cần style + title (prompt bỏ qua, nhạc không có lời)
  - Nếu không có --instr: cần đủ style, title, prompt (prompt sẽ là lyrics)

4. Đổi API key:
  /suno apikey <key>

5. Xem lại help:
  /suno help

Lưu ý:
- Chỉ dùng model V3_5, prompt custom: tối đa 3000 ký tự, style: 200 ký tự, title: 80 ký tự.
- Nếu dùng prompt đơn giản (không custom), chỉ cần <prompt> (tối đa 400 ký tự).
- callbackUrl là nơi nhận kết quả, để mặc định nếu không biết.
`.trim();

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    if (!args[0] || args[0] === "help") {
        return api.sendMessage(helpText, threadID, messageID);
    }

    // Đổi apikey
    if (args[0] === "apikey") {
        if (!args[1]) return api.sendMessage("Vui lòng nhập apikey mới!", threadID, messageID);
        setApiKey(args[1]);
        return api.sendMessage("✅ Đã cập nhật apikey Suno thành công!", threadID, messageID);
    }

    let apikey = getApiKey();
    if (!apikey) return api.sendMessage("Bạn chưa cấu hình apikey Suno. Dùng: /suno apikey <key>", threadID, messageID);

    // === LỆNH LYRICS ===
    if (args[0] === "lyrics") {
        // /suno lyrics "lyrics" styles "style" --title ... [--negative ...] [--callback ...]
        let i = 1, lyrics = "", style = "", title = "", negativeTags = undefined, callBackUrl = DEFAULT_CALLBACK;
        // Parse lyrics "..."
        if (args[i]?.startsWith('"')) {
            let tmp = [];
            if (args[i].endsWith('"') && args[i].length > 1) {
                tmp.push(args[i].slice(1, -1)); i++;
            } else {
                tmp.push(args[i].slice(1)); i++;
                while (i < args.length && !args[i].endsWith('"')) { tmp.push(args[i]); i++; }
                if (i < args.length && args[i].endsWith('"')) { tmp.push(args[i].slice(0, -1)); i++; }
            }
            lyrics = tmp.join(" ");
        } else return api.sendMessage("⚠️ Đúng cú pháp: /suno lyrics \"lời bài hát\" styles \"style\" --title ...", threadID, messageID);

        // Parse styles "..."
        if (args[i] !== "styles") return api.sendMessage("⚠️ Đúng cú pháp: phải có styles \"style\"", threadID, messageID);
        i++;
        if (args[i]?.startsWith('"')) {
            let tmp = [];
            if (args[i].endsWith('"') && args[i].length > 1) {
                tmp.push(args[i].slice(1, -1)); i++;
            } else {
                tmp.push(args[i].slice(1)); i++;
                while (i < args.length && !args[i].endsWith('"')) { tmp.push(args[i]); i++; }
                if (i < args.length && args[i].endsWith('"')) { tmp.push(args[i].slice(0, -1)); i++; }
            }
            style = tmp.join(" ");
        } else return api.sendMessage("⚠️ Đúng cú pháp: /suno lyrics \"lời\" styles \"style\" --title ...", threadID, messageID);

        // Các option còn lại
        while (i < args.length) {
            if (args[i] === "--title" && args[i + 1]) { title = args[i + 1]; i += 2; }
            else if (args[i] === "--negative" && args[i + 1]) { negativeTags = args[i + 1]; i += 2; }
            else if (args[i] === "--callback" && args[i + 1]) { callBackUrl = args[i + 1]; i += 2; }
            else i++;
        }
        if (!lyrics || !style || !title) return api.sendMessage("Thiếu lyrics/style/title!", threadID, messageID);

        // Kiểm tra length
        if (lyrics.length > 3000) return api.sendMessage("Lyrics quá dài! Tối đa 3000 ký tự cho V3_5.", threadID, messageID);
        if (style.length > 200) return api.sendMessage("Style quá dài! Tối đa 200 ký tự.", threadID, messageID);
        if (title.length > 80) return api.sendMessage("Title quá dài! Tối đa 80 ký tự.", threadID, messageID);

        let payload = {
            prompt: lyrics,
            style, title,
            customMode: true,
            instrumental: false,
            model: "V3_5",
            callBackUrl
        };
        if (negativeTags) payload.negativeTags = negativeTags;

        api.sendMessage(`⏳ Gửi yêu cầu Suno lyrics...\n- Style: ${style}\n- Title: ${title}`, threadID, messageID);
        try {
            const res = await axios.post(
                "https://apibox.erweima.ai/api/v1/generate",
                payload,
                { headers: { Authorization: apikey, "Content-Type": "application/json" } }
            );
            if (res.data.code === 200) {
                api.sendMessage(`🎶 Gửi lyrics thành công!\n- task_id: ${res.data.data.task_id || "?"}\n- Đợi callback tại: ${callBackUrl}`, threadID);
            } else {
                api.sendMessage(`❌ Lỗi Suno: ${res.data.msg || "Không rõ lý do"}`, threadID, messageID);
            }
        } catch (err) {
            if (err.response?.status === 401) {
                api.sendMessage("❌ API key Suno hết hạn hoặc không hợp lệ. Dùng /suno apikey <key> để đổi key mới.", threadID, messageID);
            } else {
                api.sendMessage("❌ Lỗi gửi Suno: " + (err.response?.data?.msg || err.message), threadID, messageID);
            }
        }
        return;
    }

    // === LỆNH CUSTOM ĐẦY ĐỦ ===
    if (args[0] === "custom") {
        let i = 1, prompt = "", style = "", title = "", instrumental = false, negativeTags = undefined, callBackUrl = DEFAULT_CALLBACK;
        // prompt hoặc lyrics
        while (i < args.length && !args[i].startsWith('--')) { prompt += (prompt ? " " : "") + args[i]; i++; }
        // parse options
        while (i < args.length) {
            if (args[i] === "--style" && args[i + 1]) { style = args[i + 1]; i += 2; }
            else if (args[i] === "--title" && args[i + 1]) { title = args[i + 1]; i += 2; }
            else if (args[i] === "--instr") { instrumental = true; i++; }
            else if (args[i] === "--negative" && args[i + 1]) { negativeTags = args[i + 1]; i += 2; }
            else if (args[i] === "--callback" && args[i + 1]) { callBackUrl = args[i + 1]; i += 2; }
            else i++;
        }
        if (!style) return api.sendMessage("Thiếu --style <thể loại>!", threadID, messageID);
        if (!title) return api.sendMessage("Thiếu --title <tên bài hát>!", threadID, messageID);
        if (!instrumental && !prompt) return api.sendMessage("Bạn cần nhập prompt (lời bài hát) nếu không instrumental!", threadID, messageID);
        // Kiểm tra length
        if (prompt.length > 3000) return api.sendMessage("Prompt quá dài! Tối đa 3000 ký tự cho V3_5.", threadID, messageID);
        if (style.length > 200) return api.sendMessage("Style quá dài! Tối đa 200 ký tự.", threadID, messageID);
        if (title.length > 80) return api.sendMessage("Title quá dài! Tối đa 80 ký tự.", threadID, messageID);

        let payload = {
            prompt: prompt || (instrumental ? "" : undefined),
            style, title,
            customMode: true,
            instrumental,
            model: "V3_5",
            callBackUrl
        };
        if (negativeTags) payload.negativeTags = negativeTags;

        api.sendMessage(`⏳ Gửi yêu cầu Suno custom mode...\n- Style: ${style}\n- Title: ${title}${instrumental ? "\n- Instrumental" : ""}`, threadID, messageID);
        try {
            const res = await axios.post(
                "https://apibox.erweima.ai/api/v1/generate",
                payload,
                { headers: { Authorization: apikey, "Content-Type": "application/json" } }
            );
            if (res.data.code === 200) {
                api.sendMessage(`🎶 Gửi custom thành công!\n- task_id: ${res.data.data.task_id || "?"}\n- Đợi callback tại: ${callBackUrl}`, threadID);
            } else {
                api.sendMessage(`❌ Lỗi Suno: ${res.data.msg || "Không rõ lý do"}`, threadID, messageID);
            }
        } catch (err) {
            if (err.response?.status === 401) {
                api.sendMessage("❌ API key Suno hết hạn hoặc không hợp lệ. Dùng /suno apikey <key> để đổi key mới.", threadID, messageID);
            } else {
                api.sendMessage("❌ Lỗi gửi Suno: " + (err.response?.data?.msg || err.message), threadID, messageID);
            }
        }
        return;
    }

    // === PROMPT ĐƠN GIẢN (không customMode) ===
    let prompt = args.join(" ");
    let callBackUrl = DEFAULT_CALLBACK;
    let negativeTags = undefined;
    // parse thêm --callback và --negative nếu có
    let promptArr = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--callback" && args[i + 1]) { callBackUrl = args[i + 1]; i++; }
        else if (args[i] === "--negative" && args[i + 1]) { negativeTags = args[i + 1]; i++; }
        else promptArr.push(args[i]);
    }
    prompt = promptArr.join(" ");
    if (!prompt) return api.sendMessage("Bạn cần nhập prompt mô tả nhạc!", threadID, messageID);
    if (prompt.length > 400) return api.sendMessage("Prompt quá dài! Chỉ 400 ký tự ở chế độ thường.", threadID, messageID);

    let payload = {
        prompt,
        customMode: false,
        instrumental: false,
        model: "V3_5",
        callBackUrl
    };
    if (negativeTags) payload.negativeTags = negativeTags;

    api.sendMessage("⏳ Đang gửi yêu cầu tạo nhạc Suno V3_5...", threadID, messageID);
    try {
        const res = await axios.post(
            "https://apibox.erweima.ai/api/v1/generate",
            payload,
            { headers: { Authorization: apikey, "Content-Type": "application/json" } }
        );
        if (res.data.code === 200) {
            api.sendMessage(`🎵 Đã gửi yêu cầu tạo nhạc Suno thành công!\n- task_id: ${res.data.data.task_id || "?"}\n- Đợi callback tại: ${callBackUrl}`, threadID);
        } else {
            api.sendMessage(`❌ Lỗi tạo nhạc Suno: ${res.data.msg || "Không rõ lý do"}`, threadID, messageID);
        }
    } catch (err) {
        if (err.response?.status === 401) {
            api.sendMessage("❌ API key Suno hết hạn hoặc không hợp lệ. Dùng /suno apikey <key> để đổi key mới.", threadID, messageID);
        } else {
            api.sendMessage("❌ Lỗi gửi yêu cầu Suno: " + (err.response?.data?.msg || err.message), threadID, messageID);
        }
    }
};