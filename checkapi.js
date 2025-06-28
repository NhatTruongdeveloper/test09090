const fs = require('fs');
const path = require('path');

// Thư mục chứa các file lệnh (cập nhật lại cho phù hợp)
const commandsDir = path.join(__dirname, 'modules/commands');
const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

// Regex tìm: http(s)://..., chuỗi dạng sub.domain.tld, hoặc chuỗi chứa dấu /
const regex = /(["'`])((https?:\/\/[^\s"'`]+)|([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z]{2,})|([a-zA-Z0-9_-]+\/[a-zA-Z0-9_\/.-]+))\1/g;

let output = '';

for (const file of files) {
  const filepath = path.join(commandsDir, file);
  const content = fs.readFileSync(filepath, 'utf8');
  const found = [...content.matchAll(regex)].map(m => m[2]);
  const uniqueResults = Array.from(new Set(found));
  if (uniqueResults.length === 0) continue;
  output += `--- ${file} ---\n`;
  uniqueResults.forEach(api => {
    output += api + '\n';
  });
}

fs.writeFileSync(path.join(__dirname, 'pAPI.txt'), output, 'utf8');
console.log('Đã lưu kết quả vào pAPI.txt');