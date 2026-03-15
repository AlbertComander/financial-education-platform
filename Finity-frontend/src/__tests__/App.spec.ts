import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import App from '../App.vue'

describe('App', () => {
  it('renders application shell', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/login', component: { template: '<div>Login</div>' } },
        { path: '/register', component: { template: '<div>Register</div>' } },
        { path: '/dashboard', component: { template: '<div>Dashboard</div>' } },
        { path: '/profile', component: { template: '<div>Profile</div>' } },
      ],
    })

    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await nextTick()

    expect(wrapper.find('.app-layout').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Свернуть меню"]').exists()).toBe(true)
  })
})
