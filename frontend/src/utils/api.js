import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export const api = axios.create({
	baseURL,
	headers: {
		'Content-Type': 'application/json',
	},
})

api.interceptors.request.use((config) => {
	const token = window.localStorage.getItem('workerconnect-token')

	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}

	return config
})

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error?.response?.status === 401) {
			window.localStorage.removeItem('workerconnect-token')
			window.localStorage.removeItem('workerconnect-user')
		}

		return Promise.reject(error)
	},
)

export const getErrorMessage = (error, fallback = 'Something went wrong') => {
	if (error?.response?.data?.message) {
		return error.response.data.message
	}

	if (error?.message) {
		return error.message
	}

	return fallback
}

