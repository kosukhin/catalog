#!/usr/bin/env node
/**
 * Сверка заданий практики с реальным поведением crocks.
 *
 * Запуск:  npm run check:practice        (или: node scripts/check-practice.mjs)
 *
 * Что проверяется для каждого файла Практика/assets/lesson-*.js:
 *   • структура: уникальные id, известные типы, существующие секции;
 *   • 'input'  — что ожидаемая строка действительно равна String(setup + expr);
 *   • 'code'   — что эталонное решение даёт ожидаемый toString;
 *   • 'matrix' — что уровень интерфейса у каждого значения вычислен верно;
 *   • 'choice' — что правильный id есть среди вариантов.
 */

import { readdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import process from 'node:process'

import crocks from 'crocks'

const ROOT = path.resolve(import.meta.dirname, '..')
const ASSETS = path.join(ROOT, 'Практика', 'assets')

const {
  Maybe, Either, Result, Identity, Pair, Tuple, Const, Sum, Async, Pred, Arrow,
  curry, compose, identity, liftA2, liftA3, safe,
  isFunctor, isApply, isApplicative, isChain, isMonad
} = crocks

const SCOPE = {
  Maybe, Either, Result, Identity, Pair, Tuple, Const, Sum, Async, Pred, Arrow,
  curry, compose, identity, liftA2, liftA3, safe,
  isFunctor, isApply, isApplicative, isChain, isMonad,
  Just: Maybe.Just,
  Nothing: Maybe.Nothing,
  Left: Either.Left,
  Right: Either.Right,
  Ok: Result.Ok,
  Err: Result.Err
}

const TYPE_LIST = ['input', 'choice', 'code', 'matrix']

let failures = 0

function fail(lesson, task, message) {
  failures += 1
  console.error(`  ✗ ${lesson} · ${task}: ${message}`)
}

function evaluate(setup, expr) {
  const names = Object.keys(SCOPE)
  const values = names.map((name) => SCOPE[name])
  const body = `${setup ? setup + '\n' : ''}return (${expr})`
  const fn = Function.apply(null, names.concat([body]))
  return fn.apply(null, values)
}

// Самый сильный интерфейс, который подтверждают предикаты crocks.
function levelOf(value) {
  if (isMonad(value)) return 'monad'
  if (isFunctor(value) && isChain(value)) return 'apply'
  if (isFunctor(value)) return 'functor'
  return 'none'
}

function checkLesson(name, lesson) {
  const seen = new Set()
  const sectionIds = new Set(lesson.sections.map((section) => section.id))

  for (const task of lesson.tasks) {
    if (!task.id) {
      fail(name, '(без id)', 'у задания нет id')
      continue
    }
    if (seen.has(task.id)) fail(name, task.id, 'повторяющийся id')
    seen.add(task.id)

    if (!TYPE_LIST.includes(task.type)) {
      fail(name, task.id, `неизвестный тип "${task.type}"`)
      continue
    }
    if (!sectionIds.has(task.section)) {
      fail(name, task.id, `секция "${task.section}" не объявлена`)
    }
    if (!task.title) fail(name, task.id, 'нет заголовка')

    if (task.type === 'input') {
      let got
      try {
        got = String(evaluate(task.setup, task.expr))
      } catch (error) {
        fail(name, task.id, `код не выполнился: ${error.message}`)
        continue
      }
      if (got !== task.expected) {
        fail(name, task.id, `ожидалось "${task.expected}", получено "${got}"`)
      }
    }

    if (task.type === 'code') {
      const target = task.target || {}
      if (!target.value || !target.solution) {
        fail(name, task.id, 'нет target.value / target.solution')
        continue
      }
      let got
      try {
        got = String(evaluate(task.prelude, target.solution))
      } catch (error) {
        fail(name, task.id, `эталон не выполнился: ${error.message}`)
        continue
      }
      if (got !== target.value) {
        fail(name, task.id, `эталон даёт "${got}", а ожидается "${target.value}"`)
      }
    }

    if (task.type === 'matrix') {
      const optionIds = new Set(task.options.map((option) => option.id))
      for (const row of task.rows) {
        if (!optionIds.has(row.answer)) {
          fail(name, task.id, `у строки "${row.id}" неизвестный ответ`)
        }
        let got
        try {
          got = levelOf(evaluate(null, row.label))
        } catch (error) {
          fail(name, task.id, `строка "${row.id}": ${error.message}`)
          continue
        }
        if (got !== row.answer) {
          fail(name, task.id, `"${row.label}" → "${got}", а в задании "${row.answer}"`)
        }
      }
    }

    if (task.type === 'choice') {
      const optionIds = task.options.map((option) => option.id)
      if (!optionIds.includes(task.answer)) {
        fail(name, task.id, 'правильный ответ отсутствует среди вариантов')
      }
      if (task.options.some((option) => !option.label)) {
        fail(name, task.id, 'у варианта нет label')
      }
    }
  }

  return seen.size
}

const files = (await readdir(ASSETS))
  .filter((file) => /^lesson-.*\.js$/.test(file))
  .sort()

if (!files.length) {
  console.error('Не найдено ни одного файла Практика/assets/lesson-*.js')
  process.exit(1)
}

for (const file of files) {
  await import(pathToFileURL(path.join(ASSETS, file)).href)

  const lessonKey = Object.keys(globalThis).filter(
    (key) => /^LESSON_/.test(key) && globalThis[key] && globalThis[key].tasks
  )

  for (const key of lessonKey) {
    const lesson = globalThis[key]
    const total = checkLesson(file, lesson)
    console.log(`✓ ${file} (${lesson.id}): ${total} заданий проверено`)
  }
}

if (failures) {
  console.error(`\nНайдено расхождений: ${failures}`)
  process.exit(1)
}

console.log('\nВсе ожидания совпадают с выводом crocks.')
