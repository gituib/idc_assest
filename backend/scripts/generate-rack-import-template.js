const XLSX = require('xlsx');
const path = require('path');

const templateData = [
  {
    '机柜ID(留空自动生成)': '',
    机柜名称: 'IDC2-SERVER-01',
    所属机房名称: 'IDC2',
    '高度(U)': 42,
    '最大功率(W)': 5000,
    状态: 'active',
  },
  {
    '机柜ID(留空自动生成)': '',
    机柜名称: 'IDC2-SERVER-02',
    所属机房名称: 'IDC2',
    '高度(U)': 42,
    '最大功率(W)': 5000,
    状态: 'active',
  },
  {
    '机柜ID(留空自动生成)': '',
    机柜名称: 'IDC2-SERVER-03',
    所属机房名称: 'IDC2',
    '高度(U)': 42,
    '最大功率(W)': 5000,
    状态: 'active',
  },
  {
    '机柜ID(留空自动生成)': '',
    机柜名称: 'IDC4-NETWORK-01',
    所属机房名称: 'IDC4',
    '高度(U)': 48,
    '最大功率(W)': 8000,
    状态: 'active',
  },
  {
    '机柜ID(留空自动生成)': '',
    机柜名称: 'IDC4-NETWORK-02',
    所属机房名称: 'IDC4',
    '高度(U)': 48,
    '最大功率(W)': 8000,
    状态: 'maintenance',
  },
  {
    '机柜ID(留空自动生成)': '',
    机柜名称: 'IDC5-STORAGE-01',
    所属机房名称: 'IDC5',
    '高度(U)': 42,
    '最大功率(W)': 10000,
    状态: 'active',
  },
  {
    '机柜ID(留空自动生成)': '',
    机柜名称: 'IDC5-STORAGE-02',
    所属机房名称: 'IDC5',
    '高度(U)': 42,
    '最大功率(W)': 10000,
    状态: 'inactive',
  },
  {
    '机柜ID(留空自动生成)': '',
    机柜名称: 'IDC7-SERVER-01',
    所属机房名称: 'IDC7',
    '高度(U)': 36,
    '最大功率(W)': 6000,
    状态: 'active',
  },
  {
    '机柜ID(留空自动生成)': '',
    机柜名称: '古荡-机柜-01',
    所属机房名称: '古荡机房1-1',
    '高度(U)': 42,
    '最大功率(W)': 5000,
    状态: 'active',
  },
  {
    '机柜ID(留空自动生成)': '',
    机柜名称: '古荡-机柜-02',
    所属机房名称: '古荡机房1-1',
    '高度(U)': 42,
    '最大功率(W)': 5000,
    状态: 'active',
  },
];

const wb = XLSX.utils.book_new();

const ws = XLSX.utils.json_to_sheet(templateData);

ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];

XLSX.utils.book_append_sheet(wb, ws, '机柜导入模板');

const outputPath = path.join(__dirname, '测试机柜导入.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Excel文件已生成: ${outputPath}`);
console.log(`共 ${templateData.length} 条测试数据`);
console.log('\n字段说明:');
console.log('- 机柜ID(留空自动生成): 留空则系统自动生成唯一ID');
console.log('- 机柜名称: 必填，机柜的唯一标识名称');
console.log(
  '- 所属机房名称: 必填，系统现有机房: IDC2, IDC4, IDC5, IDC7, 古荡机房1-1, 三墩机房1-1, 地市机房, IDCT'
);
console.log('- 高度(U): 必填，机柜的标准高度（1-50U）');
console.log('- 最大功率(W): 必填，机柜的最大承载功率');
console.log('- 状态: active(在用)/maintenance(维护中)/inactive(停用)');
