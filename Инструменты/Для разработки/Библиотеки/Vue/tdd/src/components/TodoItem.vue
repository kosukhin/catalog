<template>
  <li class="todo-item" :class="{ done: todo.done }">
    <span data-test="todo-toggle" @click="$emit('toggle')">
      {{ todo.done ? '✅' : '⬜' }} {{ todo.title }}
    </span>
    <button data-test="todo-remove" @click="$emit('remove')">✕</button>
  </li>
</template>

<script setup>
defineProps({
  todo: { type: Object, required: true }
})
defineEmits(['toggle', 'remove'])
</script>

<style scoped>
.todo-item.done span {
  text-decoration: line-through;
  opacity: 0.6;
}
.todo-item button {
  margin-left: 8px;
  cursor: pointer;
}
</style>
