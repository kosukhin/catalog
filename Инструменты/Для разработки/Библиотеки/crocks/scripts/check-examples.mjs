#!/usr/bin/env node
/**
 * Проверка примеров из уроков.
 *
 * Достаёт все блоки ```js из markdown-файлов, запускает каждый в отдельном
 * процессе (с таймаутом) и печатает отчёт. Блок, который «как есть» не
 * запускается, — ошибка: он должен быть самодостаточным.
 *
 * Запуск:
 *   node scripts/check-examples.mjs                 # все уроки + шпаргалка
 *   node scripts/check-examples.mjs Урок-1.1-Maybe.md
 *   node scripts/check-examples.mjs --verbose       # печатать вывод каждого блока
 *
 * Требует, чтобы `crocks` был установлен (npm install).
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TMP = path.join(ROOT, '.check-tmp')
const TIMEOUT_MS = 10_000

const verbose = process.argv.includes('--verbose')
const targets = process.argv.slice(2).filter(arg => !arg.startsWith('--'))

const files = targets.length
  ? targets.map(f => path.resolve(ROOT, f))
  : fs.readdirSync(ROOT)
      .filter(name => /^Урок-.*\.md$/.test(name) || name === 'ШПАРГАЛКА.md')
      .sort()
      .map(name => path.join(ROOT, name))

if (!files.length) {
  console.error('Нечего проверять: не найдено ни одного файла с примерами.')
  process.exit(1)
}

fs.rmSync(TMP, { recursive: true, force: true })
fs.mkdirSync(TMP, { recursive: true })

const blocksOf = text => [...text.matchAll(/```js\n([\s\S]*?)```/g)].map((m, i) => ({
  index: i + 1,
  code: m[1],
}))

let totalOk = 0
let totalFailed = 0
const failures = []

for (const file of files) {
  const name = path.basename(file)
  const blocks = blocksOf(fs.readFileSync(file, 'utf8'))
  let ok = 0
  let failed = 0

  blocks.forEach(block => {
    const target = path.join(TMP, `${name.replace(/\.md$/, '')}-${block.index}.mjs`)
    fs.writeFileSync(target, block.code)

    const run = spawnSync('node', [target], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: TIMEOUT_MS,
    })

    const crashed = run.status !== 0
    const reason = run.error?.code === 'ETIMEDOUT'
      ? `timeout ${TIMEOUT_MS}ms`
      : (run.stderr || '').split('\n').find(line => /Error|TypeError|SyntaxError/.test(line)) || ''

    if (crashed) {
      failed += 1
      failures.push({ name, block: block.index, reason })
      console.log(`  ✗ ${name} · блок ${block.index}: ${reason}`)
    } else {
      ok += 1
      if (verbose) console.log(`  ✓ ${name} · блок ${block.index}\n${run.stdout.trim()}`)
    }
  })

  totalOk += ok
  totalFailed += failed
  console.log(`${failed ? '✗' : '✓'} ${name}: ${ok}/${blocks.length} блоков прошли`)
}

console.log('')
console.log(`Итого: ${totalOk} прошли, ${totalFailed} упали`)

if (totalFailed) {
  console.log('\nУпавшие блоки — их надо сделать самодостаточными (импорты + данные внутри блока):')
  for (const f of failures) console.log(`  - ${f.name} · блок ${f.block}`)
  process.exit(1)
}
