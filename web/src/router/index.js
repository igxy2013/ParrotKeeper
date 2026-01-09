import { createRouter, createWebHashHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import ParrotsView from '../views/ParrotsView.vue'
import ParrotDetailView from '../views/ParrotDetailView.vue'
import RecordsView from '../views/RecordsView.vue'
import ExpensesView from '../views/ExpensesView.vue'
import IncubationView from '../views/IncubationView.vue'
import PairingView from '../views/PairingView.vue'
import CareGuideView from '../views/CareGuideView.vue'
import AnnouncementsCenterView from '../views/AnnouncementsCenterView.vue'
import ReportExportView from '../views/ReportExportView.vue'
import AboutView from '../views/AboutView.vue'
import AdminView from '../views/AdminView.vue'
import AdminFeedbacksView from '../views/admin/AdminFeedbacksView.vue'
import AdminIncubationSuggestionsView from '../views/admin/AdminIncubationSuggestionsView.vue'
import AdminMarketPricesView from '../views/admin/AdminMarketPricesView.vue'
import AdminParrotSpeciesView from '../views/admin/AdminParrotSpeciesView.vue'
import AdminAnnouncementsView from '../views/admin/AdminAnnouncementsView.vue'
import AdminApiConfigsView from '../views/admin/AdminApiConfigsView.vue'
import AdminInvitationCodesView from '../views/admin/AdminInvitationCodesView.vue'
import AdminUsersView from '../views/admin/AdminUsersView.vue'
import AdminResetRequestsView from '../views/admin/AdminResetRequestsView.vue'
import SettingsNotificationView from '../views/settings/SettingsNotificationView.vue'
import SettingsCategoryView from '../views/settings/SettingsCategoryView.vue'
import SettingsFeedTypeView from '../views/settings/SettingsFeedTypeView.vue'
import TeamCurrentView from '../views/team/TeamCurrentView.vue'
import TeamJoinView from '../views/team/TeamJoinView.vue'
import TeamCreateView from '../views/team/TeamCreateView.vue'
import TeamManageView from '../views/team/TeamManageView.vue'

const router = createRouter({
  history: createWebHashHistory(),
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
          path: 'parrots/:id',
          name: 'parrot-detail',
          component: ParrotDetailView
        },
        {
          path: 'records',
          name: 'records',
          component: RecordsView
        },
        {
          path: 'expenses',
          name: 'expenses',
          component: ExpensesView
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
          path: 'team/current',
          name: 'team-current',
          component: TeamCurrentView
        },
        {
          path: 'team/join',
          name: 'team-join',
          component: TeamJoinView
        },
        {
          path: 'team/create',
          name: 'team-create',
          component: TeamCreateView
        },
        {
          path: 'team/manage',
          name: 'team-manage',
          component: TeamManageView
        },
        {
          path: 'announcements',
          name: 'announcements-center',
          component: AnnouncementsCenterView
        },
        {
          path: 'reports',
          name: 'reports',
          component: ReportExportView
        },
        {
          path: 'about',
          name: 'about',
          component: AboutView
        },
        {
          path: 'care-guide',
          name: 'care-guide',
          component: CareGuideView
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
          path: 'admin',
          name: 'admin',
          component: AdminView
        },
        { path: 'admin/feedbacks', name: 'admin-feedbacks', component: AdminFeedbacksView },
        { path: 'admin/incubation-suggestions', name: 'admin-incubation-suggestions', component: AdminIncubationSuggestionsView },
        { path: 'admin/market-prices', name: 'admin-market-prices', component: AdminMarketPricesView },
        { path: 'admin/parrot-species', name: 'admin-parrot-species', component: AdminParrotSpeciesView },
        { path: 'admin/announcements', name: 'admin-announcements', component: AdminAnnouncementsView },
        { path: 'admin/api-configs', name: 'admin-api-configs', component: AdminApiConfigsView },
        { path: 'admin/invitation-codes', name: 'admin-invitation-codes', component: AdminInvitationCodesView },
        { path: 'admin/users', name: 'admin-users', component: AdminUsersView },
        { path: 'admin/reset-requests', name: 'admin-reset-requests', component: AdminResetRequestsView }
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
