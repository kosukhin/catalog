import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TodoList from '../src/components/TodoList.vue'

describe('TodoList', () => {
  it('не отображает список, если задач нет', () => {
    const wrapper = mount(TodoList)
    expect(wrapper.find('[data-test="todo-list"]').exists()).toBe(false)
  })

  it('позволяет добавить новую задачу через форму', async () => {
    const wrapper = mount(TodoList)
    await wrapper.find('[data-test="todo-input"]').setValue('Купить хлеб')
    await wrapper.find('[data-test="todo-form"]').trigger('submit')
    const items = wrapper.findAll('[data-test="todo-item"]')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('Купить хлеб')
  })

  it('не добавляет пустую задачу', async () => {
    const wrapper = mount(TodoList)
    await wrapper.find('[data-test="todo-input"]').setValue('   ')
    await wrapper.find('[data-test="todo-form"]').trigger('submit')
    expect(wrapper.findAll('[data-test="todo-item"]')).toHaveLength(0)
  })

  it('очищает поле ввода после добавления', async () => {
    const wrapper = mount(TodoList)
    await wrapper.find('[data-test="todo-input"]').setValue('Купить хлеб')
    await wrapper.find('[data-test="todo-form"]').trigger('submit')
    expect(wrapper.find('[data-test="todo-input"]').element.value).toBe('')
  })

  it('добавляет несколько задач с уникальными id', async () => {
    const wrapper = mount(TodoList)
    for (const title of ['Первая', 'Вторая']) {
      await wrapper.find('[data-test="todo-input"]').setValue(title)
      await wrapper.find('[data-test="todo-form"]').trigger('submit')
    }
    expect(wrapper.findAll('[data-test="todo-item"]')).toHaveLength(2)
  })

  it('переключает выполнение задачи при клике на чекбокс', async () => {
    const wrapper = mount(TodoList)
    await wrapper.find('[data-test="todo-input"]').setValue('Купить хлеб')
    await wrapper.find('[data-test="todo-form"]').trigger('submit')
    await wrapper.find('[data-test="todo-toggle"]').trigger('click')
    expect(wrapper.find('[data-test="todo-item"]').classes()).toContain('done')
  })

  it('удаляет задачу при клике на кнопку удаления', async () => {
    const wrapper = mount(TodoList)
    await wrapper.find('[data-test="todo-input"]').setValue('Купить хлеб')
    await wrapper.find('[data-test="todo-form"]').trigger('submit')
    await wrapper.find('[data-test="todo-remove"]').trigger('click')
    expect(wrapper.findAll('[data-test="todo-item"]')).toHaveLength(0)
  })

  it('показывает счётчик оставшихся задач', async () => {
    const wrapper = mount(TodoList)
    await wrapper.find('[data-test="todo-input"]').setValue('Первая')
    await wrapper.find('[data-test="todo-form"]').trigger('submit')
    await wrapper.find('[data-test="todo-input"]').setValue('Вторая')
    await wrapper.find('[data-test="todo-form"]').trigger('submit')
    expect(wrapper.find('[data-test="remaining"]').text()).toContain('2')
    await wrapper.find('[data-test="todo-toggle"]').trigger('click')
    expect(wrapper.find('[data-test="remaining"]').text()).toContain('1')
  })
})
