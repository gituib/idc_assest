/**
 * xlsx(SheetJS) 安全解析工具（前端）
 *
 * 背景：xlsx@0.18.5 存在原型污染与 ReDoS 漏洞，且 npm registry 上无修复版本
 * （官方新版改为 CDN 分发，npm audit 无法自动修复）。
 * 在彻底替换为 exceljs 之前，统一通过本模块对"解析用户选择的 Excel 文件"路径做加固：
 *
 * 1. 表头危险键校验：sheet_to_json 会把表头文本作为对象键直接赋值，表头为
 *    __proto__/constructor/prototype 时会在赋值瞬间篡改对象原型（原型污染入口）。
 *    因此必须在解析前拦截，解析后清洗无法修复已被替换的原型。
 * 2. 工作表规模限制：行/列数超限直接拒绝，降低 ReDoS 触发与浏览器卡死风险。
 * 3. 产出兜底清洗：删除解析结果中的危险自有键，防御其他写入路径。
 */

import * as XLSX from 'xlsx';

/** 原型污染危险键 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/** 单工作表默认行数上限 */
const DEFAULT_MAX_ROWS = 5000;

/** 单工作表默认列数上限 */
const DEFAULT_MAX_COLS = 100;

/**
 * 校验表头是否包含危险键名
 * @param {Array} headerRow - 首行表头
 * @returns {{ok: boolean, key?: string}}
 */
export function checkHeaderSafety(headerRow) {
  if (!Array.isArray(headerRow)) {
    return { ok: true };
  }
  for (const cell of headerRow) {
    const key = String(cell === undefined || cell === null ? '' : cell).trim();
    if (DANGEROUS_KEYS.includes(key)) {
      return { ok: false, key };
    }
  }
  return { ok: true };
}

/**
 * 递归清洗对象/数组中的危险自有键
 * 注意：仅能清理自有属性；原型污染必须在赋值前通过表头校验拦截
 * @param {*} value - 待清洗数据
 * @returns {*} 清洗后的数据（原地修改并返回）
 */
export function sanitizeParsed(value) {
  if (Array.isArray(value)) {
    value.forEach(item => sanitizeParsed(item));
    return value;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (DANGEROUS_KEYS.includes(key)) {
        delete value[key];
      } else {
        sanitizeParsed(value[key]);
      }
    }
  }
  return value;
}

/**
 * 校验工作表规模（行/列数）是否超限
 */
function checkWorksheetSize(worksheet, maxRows, maxCols) {
  const ref = worksheet && worksheet['!ref'];
  if (!ref) {
    return { ok: true };
  }
  let range;
  try {
    range = XLSX.utils.decode_range(ref);
  } catch {
    return { ok: true };
  }
  const rows = range.e.r - range.s.r + 1;
  const cols = range.e.c - range.s.c + 1;
  if (rows > maxRows) {
    return { ok: false, message: `Excel行数(${rows})超过上限(${maxRows})` };
  }
  if (cols > maxCols) {
    return { ok: false, message: `Excel列数(${cols})超过上限(${maxCols})` };
  }
  return { ok: true };
}

/**
 * 安全读取工作簿并返回首个工作表（含规模校验）
 * @param {ArrayBuffer|string} data - 文件内容
 * @param {{type?: string, maxRows?: number, maxCols?: number}} [options] - type 透传给 XLSX.read
 * @returns {{workbook?: Object, worksheet?: Object, error?: string}}
 */
export function readWorkbookSafe(data, options = {}) {
  const { type = 'array', maxRows = DEFAULT_MAX_ROWS, maxCols = DEFAULT_MAX_COLS } = options;

  let workbook;
  try {
    workbook = XLSX.read(data, { type });
  } catch (readError) {
    return { error: `无法解析Excel文件: ${readError.message}` };
  }

  if (!workbook.SheetNames.length) {
    return { error: 'Excel文件中没有找到工作表' };
  }

  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const sizeCheck = checkWorksheetSize(worksheet, maxRows, maxCols);
  if (!sizeCheck.ok) {
    return { error: sizeCheck.message };
  }

  return { workbook, worksheet };
}

/**
 * 安全转换为 JSON 数组（表头危险键校验 + 产出清洗）
 * @param {Object} worksheet - XLSX worksheet 对象
 * @param {Object} [options] - 透传给 sheet_to_json 的选项
 * @returns {Array} 清洗后的数据数组
 * @throws {Error} 表头包含危险键名时抛出
 */
export function sheetToJsonSafe(worksheet, options = {}) {
  // 表头危险键校验：原型污染发生在赋值瞬间，必须解析前拦截
  const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, limit: 1 })[0] || [];
  const check = checkHeaderSafety(headerRow);
  if (!check.ok) {
    throw new Error(`表头包含非法字段名: ${check.key}`);
  }

  const data = XLSX.utils.sheet_to_json(worksheet, options);
  return sanitizeParsed(data);
}
