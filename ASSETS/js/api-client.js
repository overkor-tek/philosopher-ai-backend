/**
 * Philosopher AI - API Client
 * Connects frontend to Railway backend
 */

class APIClient {
    constructor() {
        // Railway backend URL
        this.baseURL = 'https://cloud-funnel-production.up.railway.app/api/v1';
        this.token = localStorage.getItem('auth_token');
    }

    // Authentication
    auth = {
        isAuthenticated: () => {
            return !!localStorage.getItem('auth_token');
        },

        getToken: () => {
            return localStorage.getItem('auth_token');
        },

        setToken: (token) => {
            localStorage.setItem('auth_token', token);
            this.token = token;
        },

        clearToken: () => {
            localStorage.removeItem('auth_token');
            this.token = null;
        },

        register: async (email, password, name) => {
            try {
                const response = await fetch(`${this.baseURL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password, name })
                });

                const data = await response.json();

                if (response.ok && data.token) {
                    this.auth.setToken(data.token);
                    return { success: true, data };
                }

                return { success: false, error: data.message || 'Registration failed' };
            } catch (error) {
                console.error('Registration error:', error);
                return { success: false, error: error.message };
            }
        },

        login: async (email, password) => {
            try {
                const response = await fetch(`${this.baseURL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.token) {
                    this.auth.setToken(data.token);
                    return { success: true, data };
                }

                return { success: false, error: data.message || 'Login failed' };
            } catch (error) {
                console.error('Login error:', error);
                return { success: false, error: error.message };
            }
        },

        logout: () => {
            this.auth.clearToken();
            window.location.href = '/';
        }
    };

    // API Request Helper
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            console.error(`API request error (${endpoint}):`, error);
            return { success: false, error: error.message };
        }
    }

    // Dashboard
    async getDashboard() {
        return this.request('/dashboard');
    }

    // Health Check
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // User Profile
    async getProfile() {
        return this.request('/user/profile');
    }

    async updateProfile(profileData) {
        return this.request('/user/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }
}

// Initialize global API client
window.api = new APIClient();

// Check backend health on load
window.addEventListener('DOMContentLoaded', async () => {
    const health = await window.api.healthCheck();
    if (health.success) {
        console.log('✅ Connected to Philosopher AI backend:', health.data);
    } else {
        console.warn('⚠️ Backend health check failed:', health.error);
    }
});
