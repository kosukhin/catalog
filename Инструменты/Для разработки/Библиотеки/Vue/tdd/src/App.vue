<template>
  <div class="app">
    <h1>📋 Todo (TDD)</h1>
    <TodoList />
  </div>
</template>

<script setup>
import TodoList from './components/TodoList.vue'
</script>

<style>
.app {
  max-width: 480px;
  margin: 40px auto;
  font-family: sans-serif;
}
</style>
