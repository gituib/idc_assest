const fs = require('fs');

const content = fs.readFileSync('e:/IDC/jigui/frontend/src/pages/DeviceManagement.jsx', 'utf8');

const startMarker = '];\n\n// 可调整列宽的表头组件';
const endMarker = '\n\n// 防抖 Hook';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex >= 0 && endIndex >= 0) {
  const newContent = content.substring(0, startIndex + 3) + '\n\n// 防抖 Hook' + content.substring(endIndex + endMarker.length);
  fs.writeFileSync('e:/IDC/jigui/frontend/src/pages/DeviceManagement.jsx', newContent, 'utf8');
  console.log('Removed ResizeableTitle component');
} else {
  console.log('Could not find markers');
  console.log('startMarker found:', startIndex >= 0);
  console.log('endMarker found:', endIndex >= 0);
}
