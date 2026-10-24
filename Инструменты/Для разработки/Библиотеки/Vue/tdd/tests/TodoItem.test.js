import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TodoItem from '../src/components/TodoItem.vue'

describe('TodoItem', () => {
  it('отображает текст задачи', () => {
    const wrapper = mount(TodoItem, {
      props: { todo: { id: 1, title: 'Изучить TDD', done: false } }
    })
    expect(wrapper.text()).toContain('Изучить TDD')
  })

  it('не отмечает задачу как выполненную, если done=false', () => {
    const wrapper = mount(TodoItem, {
      props: { todo: { id: 1, title: 'Изучить TDD', done: false } }
    })
    expect(wrapper.classes()).not.toContain('done')
  })

  it('помечает задачу как выполненную через класс done', () => {
    const wrapper = mount(TodoItem, {
      props: { todo: { id: 1, title: 'Изучить TDD', done: true } }
    })
    expect(wrapper.classes()).toContain('done')
  })

  it('эмитит событие toggle при клике на чекбокс', async () => {
    const wrapper = mount(TodoItem, {
      props: { todo: { id: 1, title: 'Изучить TDD', done: false } }
    })
    await wrapper.find('[data-test="todo-toggle"]').trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('эмитит событие remove при клике на кнопку удаления', async () => {
    const wrapper = mount(TodoItem, {
      props: { todo: { id: 1, title: 'Изучить TDD', done: false } }
    })
    await wrapper.find('[data-test="todo-remove"]').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})
