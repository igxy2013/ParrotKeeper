import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import ParrotsView from '../views/ParrotsView.vue'
import RecordsView from '../views/RecordsView.vue'
import IncubationView from '../views/IncubationView.vue'
import PairingView from '../views/PairingView.vue'
import SettingsView from '../views/SettingsView.vue'
import CareGuideView from '../views/CareGuideView.vue'
import AnnouncementsCenterView from '../views/AnnouncementsCenterView.vue'
import AdminView from '../views/AdminView.vue'
import AdminFeedbacksView from '../views/admin/AdminFeedbacksView.vue'
import AdminCareGuideEditorView from '../views/admin/AdminCareGuideEditorView.vue'
import AdminIncubationSuggestionsView from '../views/admin/AdminIncubationSuggestionsView.vue'
import AdminMarketPricesView from '../views/admin/AdminMarketPricesView.vue'
import AdminParrotSpeciesView from '../views/admin/AdminParrotSpeciesView.vue'
import AdminUserRoleView from '../views/admin/AdminUserRoleView.vue'
import AdminAnnouncementsView from '../views/admin/AdminAnnouncementsView.vue'
import AdminApiConfigsView from '../views/admin/AdminApiConfigsView.vue'
import SettingsNotificationView from '../views/settings/SettingsNotificationView.vue'
import SettingsCategoryView from '../views/settings/SettingsCategoryView.vue'
import SettingsFeedTypeView from '../views/settings/SettingsFeedTypeView.vue'
import SettingsAccountView from '../views/settings/SettingsAccountView.vue'

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
          path: 'announcements',
          name: 'announcements-center',
          component: AnnouncementsCenterView
        },
        {
          path: 'care-guide',
          name: 'care-guide',
          component: CareGuideView
        },
        {
          path: 'settings',
          name: 'settings',
          component: SettingsView
        },
        {
          path: 'settings/notification',
          name: 'settings-notification',
          component: SettingsNotificationView
        },
        {
          path: 'settings/categories',
          name: 'settings-categories',
          component: SettingsCategoryView
        },
        {
          path: 'settings/feed-types',
          name: 'settings-feed-types',
          component: SettingsFeedTypeView
        },
        {
          path: 'settings/account',
          name: 'settings-account',
          component: SettingsAccountView
        },
        {
          path: 'admin',
          name: 'admin',
          component: AdminView
        },
        { path: 'admin/feedbacks', name: 'admin-feedbacks', component: AdminFeedbacksView },
        { path: 'admin/care-guide-editor', name: 'admin-care-guide-editor', component: AdminCareGuideEditorView },
        { path: 'admin/incubation-suggestions', name: 'admin-incubation-suggestions', component: AdminIncubationSuggestionsView },
        { path: 'admin/market-prices', name: 'admin-market-prices', component: AdminMarketPricesView },
        { path: 'admin/parrot-species', name: 'admin-parrot-species', component: AdminParrotSpeciesView },
        { path: 'admin/user-role', name: 'admin-user-role', component: AdminUserRoleView },
        { path: 'admin/announcements', name: 'admin-announcements', component: AdminAnnouncementsView },
        { path: 'admin/api-configs', name: 'admin-api-configs', component: AdminApiConfigsView }
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
