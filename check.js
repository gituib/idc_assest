const fs = require('fs');

const content = fs.readFileSync('e:/IDC/jigui/frontend/src/pages/DeviceManagement.jsx', 'utf8');

const startMarker = '// 可调整列宽的表头组件';
const endMarker = '// 防抖 Hook';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

console.log('startMarker index:', startIndex);
console.log('endMarker index:', endIndex);

if (startIndex >= 0 && endIndex >= 0) {
  console.log('Content to remove:');
  console.log(content.substring(startIndex, endIndex + endMarker.length).substring(0, 500));
}
