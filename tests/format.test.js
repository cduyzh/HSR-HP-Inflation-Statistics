import assert from 'node:assert/strict'
import test from 'node:test'
import { escapeHtml, fmtInt, fmtPct, fmtShort } from '../src/utils/format.js'

test('escapeHtml 转义全部 HTML 特殊字符', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('1')">&`),
    '&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;',
  )
})

test('escapeHtml 容忍空值与非字符串输入', () => {
  assert.equal(escapeHtml(undefined), '')
  assert.equal(escapeHtml(null), '')
  assert.equal(escapeHtml(42), '42')
})

test('数值格式化保持既有口径', () => {
  assert.equal(fmtInt(88487062), '88,487,062')
  assert.equal(fmtInt(Number.NaN), '0')
  assert.equal(fmtShort(88487062), '88.49M')
  assert.equal(fmtShort(1500), '1.5K')
  assert.equal(fmtShort(999), '999')
  assert.equal(fmtPct(-0.5651), '-56.51%')
  assert.equal(fmtPct(undefined), '0%')
})
