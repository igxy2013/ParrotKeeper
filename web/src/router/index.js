import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import ParrotsView from '../views/ParrotsView.vue'
import RecordsView from '../views/RecordsView.vue'
import IncubationView from '../views/IncubationView.vue'
import PairingView from '../views/PairingView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/',
      component: DashboardLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView
        },
        {
          path: 'parrots',
          name: 'parrots',
          component: ParrotsView
        },
        {
          path: 'records',
          name: 'records',
          component: RecordsView
        },
        {
          path: 'incubation',
          name: 'incubation',
          component: IncubationView
        },
        {
          path: 'pairing',
          name: 'pairing',
          component: PairingView
        },
        {
          path: 'settings',
          name: 'settings',
          component: SettingsView
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('user_id')
  if (to.name !== 'login' && !token) {
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router
