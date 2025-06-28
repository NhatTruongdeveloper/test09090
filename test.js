const login = require('./f'); // ví dụ './node_modules/fca-hzi'
const appState = require('./appstate.json'); // hoặc đường dẫn appstate của bạn

login({ appState }, {}, async (err, api) => {
  if (err) return console.error("Đăng nhập lỗi:", err);

  if (typeof api.refreshFb_dtsg === "function") {
    try {
      await api.refreshFb_dtsg();
      console.log("✅ refreshFb_dtsg hoạt động OK!");
    } catch (e) {
      console.error("❌ refreshFb_dtsg bị lỗi:", e);
    }
  } else {
    console.log("❌ Hàm refreshFb_dtsg không tồn tại.");
  }
});
