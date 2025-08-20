// alertService.js
const axios = require("axios");

const ENABLE_ALERTS = process.env.ENABLE_ALERTS === "1";
const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID; // canal/usuario admin

async function notify(text) {
  if (!ENABLE_ALERTS || !BOT || !CHAT) return false;
  try {
    const url = `https://api.telegram.org/bot${BOT}/sendMessage`;
    await axios.post(url, { chat_id: CHAT, text, parse_mode: "HTML", disable_web_page_preview: true }, { timeout: 6000 });
    return true;
  } catch { return false; }
}

module.exports = { notify };