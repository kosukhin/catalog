<template>
  <div class="todo-list">
    <form data-test="todo-form" @submit.prevent="addTodo">
      <input
        data-test="todo-input"
        v-model="newTodo"
        placeholder="Новая задача..."
      />
      <button type="submit">Добавить</button>
    </form>

    <p v-if="remaining > 0" data-test="remaining">
      Осталось задач: {{ remaining }}
    </p>

    <ul v-if="todos.length > 0" data-test="todo-list">
      <TodoItem
        v-for="todo in todos"
        :key="todo.id"
        data-test="todo-item"
        :todo="todo"
        @toggle="toggleTodo(todo.id)"
        @remove="removeTodo(todo.id)"
      />
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TodoItem from './TodoItem.vue'

const todos = ref([])
const newTodo = ref('')
let nextId = 1

const remaining = computed(
  () => todos.value.filter((t) => !t.done).length
)

function addTodo() {
  const title = newTodo.value.trim()
  if (!title) return
  todos.value.push({ id: nextId++, title, done: false })
  newTodo.value = ''
}

function toggleTodo(id) {
  const todo = todos.value.find((t) => t.id === id)
  if (todo) todo.done = !todo.done
}

function removeTodo(id) {
  todos.value = todos.value.filter((t) => t.id !== id)
}
</script>

<style scoped>
.todo-list form {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.todo-list input {
  flex: 1;
  padding: 6px 10px;
}
</style>
