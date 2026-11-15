<template>
  <div>
    <header>
      <h1>Bookstore</h1>
      <p class="hint">Las altas, cambios y bajas se agregan a la lista bookstore de Redis. La base de datos cambia cuando se procesa esa lista.</p>
      <div class="tabs">
        <button type="button" :class="{ active: section === 'books' }" @click="section = 'books'">Libros</button>
        <button type="button" :class="{ active: section === 'authors' }" @click="section = 'authors'">Autores</button>
        <button type="button" :class="{ active: section === 'publishers' }" @click="section = 'publishers'">Editoriales</button>
      </div>
    </header>
    <main>
      <BookAdmin v-if="section === 'books'" />
      <AuthorAdmin v-if="section === 'authors'" />
      <PublisherAdmin v-if="section === 'publishers'" />
    </main>
  </div>
</template>

<script>
import BookAdmin from "./components/BookAdmin.vue";
import AuthorAdmin from "./components/AuthorAdmin.vue";
import PublisherAdmin from "./components/PublisherAdmin.vue";

export default {
  components: { BookAdmin, AuthorAdmin, PublisherAdmin },
  data() {
    return { section: "books" };
  }
};
</script>
