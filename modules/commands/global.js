const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Cấu hình lệnh
this.config = {
    name: "global",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Kenne400k, tkdev",
    description: "Tự động khởi tạo tất cả global.pcoder.[tên] từ datajson và upload Mercury cache",
    commandCategory: "Tiện ích",
    usages: "global [tên data] (vd: global vdgai)",
    cooldowns: 0,
    usePrefix: false
};

// Danh sách tên file json hỗ trợ
const LIST = [
    "6mui","anime1","anime2","anime","anh","ausand","chautinhtri","chill","chitanda","cosplay","datajson",
    "du","gaivip","gura","icon","ig","kana","kurumi","loil","loli","mirai","mong","mui","neko","phongcanh",
    "poem","rdcapcut","rem","sagiri","siesta","test","umaru","vdanime","vdcos","vdcosplay","vdgai",
    "vdha","vdtrai","vdvip"
];

// Thư mục chứa datajson
const DATAFOLDER = path.join(__dirname, "../../pdata/data_dongdev/datajson");

// Lấy data từ file JSON (trả về mảng)
function getFileData(filename) {
    const filePath = path.join(DATAFOLDER, filename + ".json");
    if (!fs.existsSync(filePath)) return [];
    try {
        const data = require(filePath);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
}

// Hàm lấy stream từ Mercury CDN URL
this.stream_url = function (url) {
    return axios({
        url: url,
        responseType: 'stream',
    }).then(_ => _.data);
};

// onLoad: tự động tạo, upload Mercury cho mỗi global.pcoder.[tên]
this.onLoad = async function (o) {
    if (!global.pcoder) global.pcoder = {};
    if (!global._pcoder_interval) global._pcoder_interval = {};

    for (const name of LIST) {
        if (!global.pcoder[name]) global.pcoder[name] = [];

        // Chỉ tạo interval nếu chưa có
        if (!global._pcoder_interval[name]) {
            let status = false;
            let urls = getFileData(name);
            global._pcoder_interval[name] = setInterval(async () => {
                if (status === true || !global.pcoder[name] || global.pcoder[name].length > 50) return;
                status = true;
                try {
                    const arr = await Promise.all([...Array(5)].map(() =>
                        upload(urls[Math.floor(Math.random() * urls.length)], o.api)
                    ));
                    global.pcoder[name].push(...arr.filter(Boolean));
                } catch (e) {}
                status = false;
            }, 1000 * 5);
        }
    }

    // Hàm upload Mercury CDN
    async function upload(url, api) {
        if (!url) return null;
        try {
            const form = { upload_1024: await exports.stream_url(url) };
            const res = await api.postFormData('https://upload.facebook.com/ajax/mercury/upload.php', form);
            const meta = JSON.parse(res.body.replace('for (;;);', '')).payload?.metadata?.[0];
            if (!meta) return null;
            const [[, value]] = Object.entries(meta);
            return value;
        } catch {
            return null;
        }
    }
};

// Lệnh: global [tên] → gửi video random từ global.pcoder.[tên]
this.run = async function (o) {
    let name = (o.args[0] || '').toLowerCase();
    if (!name || !LIST.includes(name)) {
        return o.api.sendMessage(
            `Vui lòng chọn một trong các tên sau:\n${LIST.join(', ')}\nVí dụ: global vdgai`,
            o.event.threadID, o.event.messageID
        );
    }
    if (!global.pcoder || !Array.isArray(global.pcoder[name]) || global.pcoder[name].length === 0) {
        return o.api.sendMessage(
            `Hiện chưa có video cache trong global.pcoder.${name}. Hãy đợi bot upload hoặc kiểm tra lại file dữ liệu.`,
            o.event.threadID, o.event.messageID
        );
    }
    const mercuryUrl = global.pcoder[name].splice(Math.floor(Math.random() * global.pcoder[name].length), 1)[0];
    let attachment = [];
    if (mercuryUrl) {
        try {
            attachment.push(await this.stream_url(mercuryUrl));
        } catch (e) {}
    }
    let msg = `Gửi video random từ global.pcoder.${name}`;
    o.api.sendMessage({ body: msg, attachment }, o.event.threadID, o.event.messageID);
};