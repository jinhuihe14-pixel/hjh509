import { defineStore } from 'pinia'
import request from '../utils/request'

export const useAdminStore = defineStore('admin', {
  state: () => ({
    token: localStorage.getItem('admin_token') || '',
    adminInfo: JSON.parse(localStorage.getItem('admin_info') || 'null')
  }),

  actions: {
    async login(username, password) {
      const res = await request.post('/admin/login', { username, password })
      this.token = res.data.token
      this.adminInfo = res.data.admin
      localStorage.setItem('admin_token', res.data.token)
      localStorage.setItem('admin_info', JSON.stringify(res.data.admin))
      return res
    },

    logout() {
      this.token = ''
      this.adminInfo = null
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_info')
    }
  }
})
