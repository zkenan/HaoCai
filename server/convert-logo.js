const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, 'logo.png');

try {
  const logoBuffer = fs.readFileSync(logoPath);
  const logoBase64 = logoBuffer.toString('base64');
  
  // 保存为HTML片段文件
  const imgTag = `<img src="data:image/png;base64,${logoBase64}" alt="Logo" style="width:80px;height:auto;">`;
  fs.writeFileSync(path.join(__dirname, 'logo-html.txt'), imgTag, 'utf8');
  
  console.log('Logo转换成功!');
  console.log('Base64长度:', logoBase64.length);
  console.log('HTML片段已保存到: server/logo-html.txt');
} catch (error) {
  console.error('转换失败:', error.message);
}
