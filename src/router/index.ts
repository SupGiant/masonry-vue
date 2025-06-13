import { createRouter, createWebHistory } from 'vue-router'
import MasonryDemo from '../views/MasonryDemo.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'MasonryDemo',
      component: MasonryDemo
    }
  ],
})

export default router
