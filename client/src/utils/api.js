import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    // 如果是blob类型，返回完整的response对象（不解析data）
    if (response.config.responseType === 'blob') {
      return response
    }
    return response.data
  },
  error => {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default request
