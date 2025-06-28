const LOCAL_VERSION = "1.0.0";
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs-extra");
const { join, resolve } = require("path");
const chalkAnimation = require('chalkercli');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const gradient = require('gradient-string');
const readlineSync = require('readline-sync');
const logger = require("./pdata/utils/log.js");
const con = require('./config.json');
const moment = require("moment-timezone");
const os = require('os');
const axios = require('axios');

// ====================== SOCKS5 PROXY HANDLING ======================
let agent = undefined;
let shouldSaveProxy = false;

// Kiểm tra proxy trong config.json, nếu thiếu sẽ hỏi và lưu lại
if (typeof con.socks5tl === 'undefined' || typeof con.socks5 === 'undefined') {
  const enableProxy = readlineSync.question('Bạn có muốn bật SOCKS5 proxy không? (y/n): ').trim().toLowerCase() === 'y';
  con.socks5tl = enableProxy;
  if (enableProxy) {
    con.socks5 = readlineSync.question('Nhập socks5 proxy dạng socks5://user:pass@host:port : ').trim();
  } else {
    con.socks5 = '';
  }
  shouldSaveProxy = true;
}
if (shouldSaveProxy) {
  writeFileSync('./config.json', JSON.stringify(con, null, 2), 'utf8');
  logger.loader('Đã lưu cấu hình proxy socks5 vào config.json!');
}

// Sử dụng proxy nếu được bật & hợp lệ, kiểm tra kết nối thực tế
if (con.socks5tl && con.socks5 && con.socks5.startsWith('socks5://')) {
  try {
    const { SocksProxyAgent } = require('socks-proxy-agent');
    agent = new SocksProxyAgent(con.socks5);
    (async () => {
      try {
        const res = await axios.get('https://api64.ipify.org?format=text', { httpAgent: agent, httpsAgent: agent, timeout: 7000 });
        logger.loader(`✅ SOCKS5 proxy kết nối thành công! IP ra ngoài: ${res.data}`);
      } catch (e) {
        logger.loader('❌ SOCKS5 proxy KHÔNG kết nối ra ngoài được hoặc sai cấu hình!', 'error');
      }
    })();
  } catch (e) {
    logger.loader('❌ Không thể tải socks-proxy-agent. Hãy cài: npm i socks-proxy-agent', 'error');
    agent = undefined;
  }
}

// ====================== THEME ======================
const theme = con.DESIGN?.Theme || 'default';
let co, error, cra;
switch (theme.toLowerCase()) {
  case 'blue':
    co = gradient([{ color: "#1affa3", pos: 0.2 }, { color: "cyan", pos: 0.4 }, { color: "pink", pos: 0.6 }, { color: "cyan", pos: 0.8 }, { color: '#1affa3', pos: 1 }]);
    error = chalk.red.bold;
    break;
  case 'dream2':
    cra = gradient("blue", "pink");
    co = gradient("#a200ff", "#21b5ff", "#a200ff");
    break;
  case 'dream':
    co = gradient([{ color: "blue", pos: 0.2 }, { color: "pink", pos: 0.3 }, { color: "gold", pos: 0.6 }, { color: "pink", pos: 0.8 }, { color: "blue", pos: 1 }]);
    error = chalk.red.bold;
    break;
  case 'fiery':
    co = gradient("#fc2803", "#fc6f03", "#fcba03");
    error = chalk.red.bold;
    break;
  case 'rainbow':
    co = gradient.rainbow;
    error = chalk.red.bold;
    break;
  case 'pastel':
    co = gradient.pastel;
    error = chalk.red.bold;
    break;
  case 'red':
    co = gradient("red", "orange");
    error = chalk.red.bold;
    break;
  case 'aqua':
    co = gradient("#0030ff", "#4e6cf2");
    error = chalk.blueBright;
    break;
  case 'retro':
    co = gradient("#d94fff", "purple");
    co = gradient.retro;
    break;
  case 'ghost':
    cra = gradient("#0a658a", "#0a7f8a", "#0db5aa");
    co = gradient.mind;
    break;
  case 'hacker':
    cra = chalk.hex('#4be813');
    co = gradient('#47a127', '#0eed19', '#27f231');
    break;
  default:
    co = gradient("#243aff", "#4687f0", "#5800d4");
    error = chalk.red.bold;
    break;
}

// ====================== CACHE FOLDER ======================
const cacheDir = path.join(__dirname, "pdata", "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

const restartNotifyPath = path.join(cacheDir, "restart_notify.json");
setTimeout(() => {
  try {
    if (fs.existsSync(restartNotifyPath)) {
      const notify = JSON.parse(fs.readFileSync(restartNotifyPath, "utf8"));
      const { threadID, senderID } = notify;
      const now = moment.tz("Asia/Ho_Chi_Minh");
      const msg = `✅ [BOT ĐÃ KHỞI ĐỘNG LẠI]\n→ Thời gian: ${now.format("HH:mm:ss - DD/MM/YYYY")}\n→ Gửi bởi Admin: https://facebook.com/${senderID}\n→ Uptime: ${Math.floor(process.uptime())} giây`;
      if (
        global.client &&
        global.client.api &&
        typeof global.client.api.sendMessage === "function"
      ) {
        global.client.api.sendMessage(msg, threadID, (err) => {
          if (err) console.error("Gửi notify restart thất bại:", err);
        });
      } else {
        console.error("[Restart Notify] Không tìm thấy global.client.api hoặc sendMessage!");
      }
      fs.unlinkSync(restartNotifyPath);
    }
  } catch (e) {
    console.error("Lỗi khi gửi notify restart:", e);
  }
}, 5000);

// ====================== GLOBALS ======================
const listPackage = JSON.parse(readFileSync('./package.json')).dependencies;
const listbuiltinModules = require("module").builtinModules;

global.client = {
  commands: new Map(),
  superBan: new Map(),
  events: new Map(),
  allThreadID: [],
  allUsersInfo: new Map(),
  timeStart: {
    timeStamp: Date.now(),
    fullTime: ""
  },
  allThreadsBanned: new Map(),
  allUsersBanned: new Map(),
  cooldowns: new Map(),
  eventRegistered: [],
  handleSchedule: [],
  handleReaction: [],
  handleReply: [],
  mainPath: process.cwd(),
  configPath: "",
  getTime: function (option) {
    switch (option) {
      case "seconds":
        return `${moment.tz("Asia/Ho_Chi_minh").format("ss")}`;
      case "minutes":
        return `${moment.tz("Asia/Ho_Chi_minh").format("mm")}`;
      case "hours":
        return `${moment.tz("Asia/Ho_Chi_minh").format("HH")}`;
      case "date":
        return `${moment.tz("Asia/Ho_Chi_minh").format("DD")}`;
      case "month":
        return `${moment.tz("Asia/Ho_Chi_minh").format("MM")}`;
      case "year":
        return `${moment.tz("Asia/Ho_Chi_minh").format("YYYY")}`;
      case "fullHour":
        return `${moment.tz("Asia/Ho_Chi_minh").format("HH:mm:ss")}`;
      case "fullYear":
        return `${moment.tz("Asia/Ho_Chi_minh").format("DD/MM/YYYY")}`;
      case "fullTime":
        return `${moment.tz("Asia/Ho_Chi_minh").format("HH:mm:ss DD/MM/YYYY")}`;
      default:
        return "";
    }
  }
};

global.data = {
  threadInfo: new Map(),
  threadData: new Map(),
  userName: new Map(),
  userBanned: new Map(),
  threadBanned: new Map(),
  commandBanned: new Map(),
  threadAllowNSFW: [],
  allUserID: [],
  allCurrenciesID: [],
  allThreadID: []
};

global.utils = require("./pdata/utils");
global.nodemodule = {};
global.config = {};
global.configModule = {};
global.moduleData = [];
global.language = {};
global.account = {};
global.anti = resolve(process.cwd(), 'anti.json');

// ====================== CONFIG LOAD ======================
let configValue;
try {
  global.client.configPath = join(global.client.mainPath, "config.json");
  configValue = require(global.client.configPath);
} catch {
  if (existsSync(global.client.configPath.replace(/\.json/g, "") + ".temp")) {
    configValue = readFileSync(global.client.configPath.replace(/\.json/g, "") + ".temp");
    configValue = JSON.parse(configValue);
    logger.loader(`Found: ${global.client.configPath.replace(/\.json/g, "") + ".temp"}`);
  }
}
try {
  for (const key in configValue) global.config[key] = configValue[key];
} catch { return logger.loader("Lỗi tải tệp config!", "error"); }

const { Sequelize, sequelize } = require("./pdata/data_dongdev/database");
writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');

// ====================== LANGUAGE ======================
const langFile = (readFileSync(`${__dirname}/pdata/languages/${global.config.language || "en"}.lang`, { encoding: 'utf-8' })).split(/\r?\n|\r/);
const langData = langFile.filter(item => item.indexOf('#') != 0 && item != '');
for (const item of langData) {
  const getSeparator = item.indexOf('=');
  const itemKey = item.slice(0, getSeparator);
  const itemValue = item.slice(getSeparator + 1, item.length);
  const head = itemKey.slice(0, itemKey.indexOf('.'));
  const key = itemKey.replace(head + '.', '');
  const value = itemValue.replace(/\\n/gi, '\n');
  if (typeof global.language[head] == "undefined") global.language[head] = {};
  global.language[head][key] = value;
}
global.getText = function (...args) {
  const langText = global.language;
  if (!langText.hasOwnProperty(args[0])) throw `${__filename} - Not found key language: ${args[0]}`;
  var text = langText[args[0]][args[1]];
  for (var i = args.length - 1; i > 0; i--) {
    const regEx = RegExp(`%${i}`, 'g');
    text = text.replace(regEx, args[i + 1]);
  }
  return text;
}

// ====================== APPSTATE ======================
let appStateFile, appState;
try {
  appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || 'appstate.json'));
  appState = process.env.KEY && fs.readFileSync(appStateFile, 'utf8')[0] != '[' && global.config.encryptSt
    ? JSON.parse(decryptState(fs.readFileSync(appStateFile, 'utf8'), process.env.KEY))
    : require(appStateFile);
  logger.loader(global.getText('mirai', 'foundPathAppstate'));
} catch {
  logger.loader(global.getText('mirai', 'notFoundPathAppstate'), 'error');
}

// ====================== AUTO CLEAN CACHE ======================
if (con.autoCleanCache?.Enable) {
  const folderPath = con.autoCleanCache.CachePath;
  const fileExtensions = con.autoCleanCache.AllowFileExtension;
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('Lỗi khi đọc thư mục:', err);
      return;
    }
    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      if (fileExtensions.includes(path.extname(file).toLowerCase())) {
        fs.unlink(filePath, (err) => {
          if (err) {
            logger(`Đã xoá các file jpg, mp4, gif, ttf, mp3`, "[ AUTO - CLEAN ]", err);
          }
        });
      }
    });
    logger(`Đã xoá các file jpg, mp4, gif, ttf, mp3`, "[ AUTO - CLEAN ]");
  });
} else {
  logger(`Auto Clean Cache Đã Bị Tắt`, "[ AUTO - CLEAN ]");
}

// ====================== GHI LỖI MODULE FAIL ======================
const failModules = [];
const failModulesPath = path.join(__dirname, "failmodules.txt");

// ====================== LOGIN APPSTATE (FACEBOOK) ======================
async function loginAppstate() {
  const login = require(con.NPM_FCA),
    dataaccountbot = require('./config.json'),
    accountbot = {
      logLevel: 'silent',
      forceLogin: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) PcoderBrowser/1.0 Chrome/121.0.0.0 Safari/537.36'
    };
  if (con.socks5tl && agent) accountbot.agent = agent;

  let email = dataaccountbot.EMAIL,
    password = dataaccountbot.PASSWORD,
    keyotp = dataaccountbot.OTPKEY.replace(/\s+/g, '').toLowerCase();
  const autologin = { email, password, keyotp };
  login(autologin, accountbot, async (autologinError, autologinDone) => {
    if (autologinError) {
      switch (autologinError.error) {
        case 'login-approval':
          logger('Vui lòng tắt 2FA trước khi sử dụng BOT!', '[ LOGIN-2FA ]');
          process.exit(0);
        default:
          logger('Không thể tiến hành đăng nhập qua mật khẩu, vui lòng thay thế appstate hoặc mật khẩu để tiếp tục!', '[ LOGIN-ERROR ]');
          process.exit(0);
      }
    }
    const loginagain = JSON.stringify(autologinDone.getAppState(), null, 4);
    writeFileSync('./' + dataaccountbot.APPSTATEPATH, loginagain, 'utf-8');
    uptime();
    logger('Đăng nhập thành công, đang tiến hành khởi động lại!', '[ LOGIN-ACCOUNT ]');
  });
}

function onBot({ models }) {
  const login = require(con.NPM_FCA);
  const loginData = { appState };
  const accountbot = {
    logLevel: 'silent',
    forceLogin: true,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) PcoderBrowser/1.0 Chrome/121.0.0.0 Safari/537.36'
  };
  if (con.socks5tl && agent) accountbot.agent = agent;

  login(loginData, accountbot, async (loginError, loginApiData) => {
    if (loginError) {
      logger('Không thể đăng nhập bằng appState, tiến hành đăng nhập lại!', '[ LOGIN-ERROR ]');
      await loginAppstate();
      await new Promise((r) => setTimeout(r, 7000));
      logger('Khởi động lại bot...', '[ RESTART ]');
      process.exit(1);
    }

    loginApiData.setOptions(global.config.FCAOption);
    let loginState = JSON.stringify(loginApiData.getAppState(), null, '\t');

    if (process.env.KEY && global.config.encryptSt) {
      loginState = await encryptState(loginState, process.env.KEY);
    }
    writeFileSync(appStateFile, loginState);

    global.api = loginApiData;
    global.client.api = loginApiData;
    global.config.version = '4.6.9';
    global.client.timeStart = Date.now();

    process.on('SIGINT', async () => {
      console.log("\n[!] Dừng ListenMqtt...");
      try {
        if (global.api?.stopListenMqtt) await global.api.stopListenMqtt();
      } catch (e) {
        console.error("[!] Lỗi khi dừng ListenMqtt:", e);
      } finally {
        console.log("[✓] Đã dừng kết nối. Thoát.");
        process.exit(0);
      }
    });

    // Load commands
    const listCommand = readdirSync(global.client.mainPath + '/modules/commands')
      .filter(cmd => cmd.endsWith('.js') && !cmd.includes('example') && !global.config.commandDisabled.includes(cmd));

    for (const command of listCommand) {
      try {
        const module = require(global.client.mainPath + '/modules/commands/' + command);
        if (!module.config || !module.run || !module.config.commandCategory)
          throw new Error(global.getText('mirai', 'errorFormat'));

        if (global.client.commands.has(module.config.name))
          throw new Error(global.getText('mirai', 'nameExist'));

        if (module.config.dependencies) {
          for (const dep in module.config.dependencies) {
            const path = join(__dirname, 'nodemodules', 'node_modules', dep);
            if (!global.nodemodule.hasOwnProperty(dep)) {
              try {
                global.nodemodule[dep] = require(dep);
              } catch {
                global.nodemodule[dep] = require(path);
              }
            }
          }
        }

        if (module.config.envConfig) {
          global.configModule[module.config.name] ||= {};
          global.config[module.config.name] ||= {};
          for (const env in module.config.envConfig) {
            global.configModule[module.config.name][env] = global.config[module.config.name][env] || module.config.envConfig[env];
            global.config[module.config.name][env] = global.config[module.config.name][env] || module.config.envConfig[env];
          }
        }

        if (module.onLoad) module.onLoad({ api: loginApiData, models });
        if (module.handleEvent) global.client.eventRegistered.push(module.config.name);
        global.client.commands.set(module.config.name, module);
      } catch (err) {
        failModules.push(`✖ Lỗi tại ${command}: ${err.message}`);
      }
    }

    // Load events
    const events = readdirSync(global.client.mainPath + '/modules/events')
      .filter(event => event.endsWith('.js') && !global.config.eventDisabled.includes(event));

    for (const ev of events) {
      try {
        const event = require(global.client.mainPath + '/modules/events/' + ev);
        if (!event.config || !event.run)
          throw new Error(global.getText('mirai', 'errorFormat'));

        if (global.client.events.has(event.config.name))
          throw new Error(global.getText('mirai', 'nameExist'));

        if (event.config.dependencies) {
          for (const dep in event.config.dependencies) {
            const path = join(__dirname, 'nodemodules', 'node_modules', dep);
            if (!global.nodemodule.hasOwnProperty(dep)) {
              try {
                global.nodemodule[dep] = require(dep);
              } catch {
                global.nodemodule[dep] = require(path);
              }
            }
          }
        }

        if (event.config.envConfig) {
          global.configModule[event.config.name] ||= {};
          global.config[event.config.name] ||= {};
          for (const env in event.config.envConfig) {
            global.configModule[event.config.name][env] = global.config[event.config.name][env] || event.config.envConfig[env];
            global.config[event.config.name][env] = global.config[event.config.name][env] || event.config.envConfig[env];
          }
        }

        if (event.onLoad) event.onLoad({ api: loginApiData, models });
        global.client.events.set(event.config.name, event);
      } catch (err) {
        failModules.push(`✖ Lỗi tại ${ev}: ${err.message}`);
      }
    }

    if (failModules.length > 0) {
      fs.writeFileSync(failModulesPath, failModules.join('\n\n'), 'utf8');
    } else if (fs.existsSync(failModulesPath)) {
      fs.unlinkSync(failModulesPath);
    }

    // In thông tin bot
    console.log(co('──────────────────────────────────────────────'));
    logger.loader('📢 Bot Facebook Mirai đã khởi động.');
    logger.loader(`⏰ Thời gian: ${chalk.yellow(moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss - DD/MM/YYYY'))}`);
    logger.loader(`⚙️ Lệnh: ${chalk.green(global.client.commands.size)} | Sự kiện: ${chalk.green(global.client.events.size)}`);
    logger.loader(`👤 User: ${chalk.cyan(global.data.allUserID?.length || 0)} | 💬 Threads: ${chalk.cyan(global.data.allThreadID?.length || 0)}`);
    logger.loader(`🕓 Uptime: ${chalk.blue(((Date.now() - global.client.timeStart) / 1000).toFixed(2) + 's')}`);
    logger.loader(`💻 NodeJS: ${chalk.bold(process.version)} | OS: ${os.type()} ${os.release()}`);
    logger.loader(`📦 Packages: ${chalk.yellow(Object.keys(listPackage).length)}`);
    console.log(co('──────────────────────────────────────────────'));
    chalkAnimation.rainbow('🚀 Đã sẵn sàng nhận lệnh! 🚀').start();

    writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4), 'utf8');

    // Gán listener
    const listenerData = { api: loginApiData, models };
    const listener = require('./pdata/data_dongdev/listen')(listenerData);
    global.handleListen = loginApiData.listenMqtt(async (error, message) => {
      if (error) {
        const errorText = JSON.stringify(error);
        if (errorText.includes("601051028565049")) {
          const form = {
            av: api.getCurrentUserID(),
            fb_api_caller_class: "RelayModern",
            fb_api_req_friendly_name: "FBScrapingWarningMutation",
            variables: "{}",
            server_timestamps: "true",
            doc_id: "6339492849481770"
          };
          api.httpPost("https://www.facebook.com/api/graphql/", form, (e, i) => {
            try {
              const res = JSON.parse(i);
              if (res.data?.fb_scraping_warning_clear?.success) {
                logger("✅ Đã vượt cảnh cáo Facebook.", "[ SUCCESS ]");
                global.handleListen = api.listenMqtt(listener);
              }
            } catch {}
          });
          return;
        }
        logger('Acc bị logout, đang đăng nhập lại!', '[ LOGIN-ACCOUNT ]');
        await loginAppstate();
        await new Promise((r) => setTimeout(r, 7000));
        process.exit(1);
      }
      if (["presence", "typ", "read_receipt"].includes(message.type)) return;
      if (global.config.DeveloperMode) console.log(message);
      return listener(message);
    });
  });
}
// ===== Kết nối Database và khởi động Bot ===== //
(async () => {
  try {
    await sequelize.authenticate();
    const authentication = { Sequelize, sequelize };
    const models = require('./pdata/data_dongdev/database/model')(authentication);
    logger(global.getText('mirai', 'successConnectDatabase'), '[ DATABASE ]');
    onBot({ models: models });
  } catch (error) {
    logger(global.getText('mirai', 'successConnectDatabase', JSON.stringify(error)), '[ DATABASE ]');
  }
})();

process.on('unhandledRejection', (err, p) => { }).on('uncaughtException', err => { console.log(err); });