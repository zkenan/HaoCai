const fs = require('fs');
const path = require('path');

// 读取logo base64
const logoHtmlPath = path.join(__dirname, 'logo-html.txt');
const logoImgTag = fs.readFileSync(logoHtmlPath, 'utf8');

console.log('Logo标签:', logoImgTag.substring(0, 100) + '...');

// 修复StockIn.vue
const stockInPath = path.join(__dirname, '..', 'client', 'src', 'views', 'StockIn.vue');
let stockInContent = fs.readFileSync(stockInPath, 'utf8');

// 替换SVG为img标签
const svgPattern = /<svg class="logo" viewBox="0 0 100 100" xmlns="http:\/\/www\.w3\.org\/2000\/svg">[\s\S]*?<\/svg>/g;
stockInContent = stockInContent.replace(svgPattern, logoImgTag);

fs.writeFileSync(stockInPath, stockInContent, 'utf8');
console.log('✓ StockIn.vue logo已更新');

// 修复StockOut.vue
const stockOutPath = path.join(__dirname, '..', 'client', 'src', 'views', 'StockOut.vue');
let stockOutContent = fs.readFileSync(stockOutPath, 'utf8');

// 替换SVG为img标签
stockOutContent = stockOutContent.replace(svgPattern, logoImgTag);

fs.writeFileSync(stockOutPath, stockOutContent, 'utf8');
console.log('✓ StockOut.vue logo已更新');

console.log('\n所有文件的logo已成功更新！');
