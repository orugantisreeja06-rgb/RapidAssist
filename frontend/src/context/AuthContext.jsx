import { createContext, useEffect, useMemo, useState } from 'react'
import { loginUser, registerUser, registerWorker } from '../services/authService'

export const AuthContext = createContext(null)

const TOKEN_KEY = 'workerconnect-token'
const USER_KEY = 'workerconnect-user'
const THEME_KEY = 'workerconnect-theme'

const readStoredUser = () => {
	const rawUser = window.localStorage.getItem(USER_KEY)

	if (!rawUser) {
		return null
	}

	try {
		return JSON.parse(rawUser)
	} catch {
		return null
	}
}

export function AuthProvider({ children }) {
	const [user, setUser] = useState(() => readStoredUser())
	const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY))
	const [theme, setTheme] = useState(() => window.localStorage.getItem(THEME_KEY) ?? 'dark')
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		window.localStorage.setItem(THEME_KEY, theme)
		document.documentElement.dataset.theme = theme
	}, [theme])

	useEffect(() => {
		if (token) {
			window.localStorage.setItem(TOKEN_KEY, token)
		} else {
			window.localStorage.removeItem(TOKEN_KEY)
		}
	}, [token])

	useEffect(() => {
		if (user) {
			window.localStorage.setItem(USER_KEY, JSON.stringify(user))
		} else {
			window.localStorage.removeItem(USER_KEY)
		}
	}, [user])

	const syncSession = (response) => {
		const payload = response?.data ?? response
		const sessionUser = payload?.user ?? payload?.data?.user ?? null
		const sessionToken = payload?.token ?? payload?.data?.token ?? null

		if (sessionToken) {
			setToken(sessionToken)
		}

		if (sessionUser) {
			setUser(sessionUser)
		}

		return payload
	}

	const login = async (credentials) => {
		setLoading(true)

		try {
			return syncSession(await loginUser(credentials))
		} finally {
			setLoading(false)
		}
	}

	const register = async (payload) => {
		setLoading(true)

		try {
			return syncSession(await registerUser(payload))
		} finally {
			setLoading(false)
		}
	}

	const registerWorkerAccount = async (payload) => {
		setLoading(true)

		try {
			return syncSession(await registerWorker(payload))
		} finally {
			setLoading(false)
		}
	}

	const logout = () => {
		setUser(null)
		setToken(null)
		window.localStorage.removeItem(TOKEN_KEY)
		window.localStorage.removeItem(USER_KEY)
	}

	const value = useMemo(
		() => ({
			user,
			token,
			theme,
			loading,
			isAuthenticated: Boolean(token),
			isAdmin: user?.role === 'admin',
			isWorker: user?.role === 'worker',
			login,
			register,
			registerWorker: registerWorkerAccount,
			logout,
			setUser,
			setTheme,
			toggleTheme: () => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark')),
		}),
		[loading, theme, token, user],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

