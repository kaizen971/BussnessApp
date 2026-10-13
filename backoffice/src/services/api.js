import axios from 'axios'

const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.trim()
const baseURL = (configuredBaseURL || '/BussnessApp').replace(/\/+$/, '')

const api = axios.create({
  // En production, la valeur relative conserve le même domaine HTTPS et évite CORS.
  // VITE_API_BASE_URL permet uniquement de cibler une API distincte si nécessaire.
  baseURL
})

const savedKey = sessionStorage.getItem('bo_access_key')
if (savedKey) {
  api.defaults.headers.common['X-Access-Key'] = savedKey
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem('bo_token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  const accessKey = sessionStorage.getItem('bo_access_key')
  if (accessKey) config.headers['X-Access-Key'] = accessKey

  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403 && error.response?.data?.error?.includes('Clé d\'accès')) {
      sessionStorage.removeItem('bo_access_key')
      window.location.reload()
      return Promise.reject(error)
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('bo_token')
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.assign('/admin/login')
      }
    }
    return Promise.reject(error)
  }
)

export default api
