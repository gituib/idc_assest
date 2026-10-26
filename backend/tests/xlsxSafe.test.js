const XLSX = require('xlsx');
const {
  checkHeaderSafety,
  sanitizeParsed,
  checkWorksheetSize,
  sheetToJsonSafe,
} = require('../utils/xlsxSafe');

describe('xlsxSafe - 原型污染防护', () => {
  test('checkHeaderSafety 拦截危险键名（含前后空白）', () => {
    expect(checkHeaderSafety(['name', '__proto__']).ok).toBe(false);
    expect(checkHeaderSafety(['name', 'constructor']).ok).toBe(false);
    expect(checkHeaderSafety(['name', 'prototype']).ok).toBe(false);
    expect(checkHeaderSafety(['  __proto__  ']).ok).toBe(false);
    expect(checkHeaderSafety(['name', 'age']).ok).toBe(true);
    expect(checkHeaderSafety([]).ok).toBe(true);
    expect(checkHeaderSafety(undefined).ok).toBe(true);
  });

  test('sanitizeParsed 删除危险自有键并保留正常数据', () => {
    // JSON.parse 可构造 __proto__ 自有属性（不走原型 setter）
    const dirty = JSON.parse('{"a":1,"constructor":2,"__proto__":3,"nested":{"prototype":4,"b":5}}');
    const clean = sanitizeParsed(dirty);
    expect(Object.keys(clean)).toEqual(['a', 'nested']);
    expect(clean.a).toBe(1);
    expect(Object.keys(clean.nested)).toEqual(['b']);
    expect(Object.prototype.polluted).toBeUndefined();
  });

  test('sanitizeParsed 递归处理数组', () => {
    const dirty = JSON.parse('[{"a":1,"__proto__":2},{"constructor":3}]');
    sanitizeParsed(dirty);
    expect(Object.keys(dirty[0])).toEqual(['a']);
    expect(Object.keys(dirty[1])).toEqual([]);
    expect(Object.prototype.polluted).toBeUndefined();
  });

  test('sheetToJsonSafe 对恶意表头直接抛错，不产生原型污染', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['__proto__', 'name'],
      ['evil', 'test'],
    ]);
    expect(() => sheetToJsonSafe(ws)).toThrow('表头包含非法字段名');
    expect({}.polluted).toBeUndefined();
  });

  test('sheetToJsonSafe 正常表头返回完整数据', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'age'],
      ['alice', 30],
    ]);
    expect(sheetToJsonSafe(ws)).toEqual([{ name: 'alice', age: 30 }]);
  });

  test('checkWorksheetSize 拦截超限工作表', () => {
    const ws = XLSX.utils.aoa_to_sheet([['a'], ['1'], ['2']]);
    expect(checkWorksheetSize(ws, 2, 100).ok).toBe(false);
    expect(checkWorksheetSize(ws, 10, 100).ok).toBe(true);
    expect(checkWorksheetSize(ws, 10, 100).message).toBeUndefined();
  });
});
