// GitHub OAuth Authentication Handler
// Manages user authentication and authorization

class GitHubAuth {
    constructor(clientId, repoOwner) {
        this.clientId = clientId;
        this.repoOwner = repoOwner;
        this.token = null;
        this.username = null;
        this.authStateKey = 'github_auth_state';
        this.tokenKey = 'github_token';
        this.usernameKey = 'github_username';

        // Load saved auth data
        this.loadAuthData();
    }

    // Load authentication data from localStorage
    loadAuthData() {
        this.token = localStorage.getItem(this.tokenKey);
        this.username = localStorage.getItem(this.usernameKey);
    }

    // Save authentication data to localStorage
    saveAuthData() {
        if (this.token) {
            localStorage.setItem(this.tokenKey, this.token);
        }
        if (this.username) {
            localStorage.setItem(this.usernameKey, this.username);
        }
    }

    // Clear authentication data
    clearAuthData() {
        this.token = null;
        this.username = null;
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.usernameKey);
        localStorage.removeItem(this.authStateKey);
    }

    // Initiate OAuth login flow
    login() {
        // Generate random state for CSRF protection
        const state = this.generateRandomState();
        localStorage.setItem(this.authStateKey, state);

        // Redirect to GitHub OAuth authorize page
        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', this.clientId);
        authUrl.searchParams.set('redirect_uri', this.getRedirectUri());
        authUrl.searchParams.set('scope', 'public_repo'); // Need repo access to read/write
        authUrl.searchParams.set('state', state);

        window.location.href = authUrl.toString();
    }

    // Handle OAuth callback (called from callback.html)
    async handleCallback(code, state) {
        // Verify state to prevent CSRF
        const savedState = localStorage.getItem(this.authStateKey);
        if (state !== savedState) {
            throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Clean up state
        localStorage.removeItem(this.authStateKey);

        // Exchange code for token using GitHub's web flow
        // Note: For a pure client-side app, we use the implicit flow
        // However, GitHub doesn't support implicit flow, so we need a workaround
        // We'll use a CORS proxy or accept that users paste their token

        // For now, we'll get the token from the URL hash (if using device flow)
        // or ask user to create a Personal Access Token
        return code;
    }

    // Set token manually (for Personal Access Token flow)
    setToken(token) {
        this.token = token;
        this.saveAuthData();
    }

    // Get redirect URI for OAuth
    getRedirectUri() {
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
        return `${baseUrl}/callback.html`;
    }

    // Generate random state for CSRF protection
    generateRandomState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Fetch authenticated user info from GitHub
    async fetchUserInfo() {
        if (!this.token) {
            return null;
        }

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token is invalid
                    this.clearAuthData();
                    return null;
                }
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const userData = await response.json();
            this.username = userData.login;
            this.saveAuthData();
            return userData;
        } catch (error) {
            console.error('Failed to fetch user info:', error);
            return null;
        }
    }

    // Check if authenticated user is the repo owner
    async isOwner() {
        if (!this.isAuthenticated()) {
            return false;
        }

        // Fetch user info if we don't have username yet
        if (!this.username) {
            const userInfo = await this.fetchUserInfo();
            if (!userInfo) {
                return false;
            }
        }

        return this.username.toLowerCase() === this.repoOwner.toLowerCase();
    }

    // Validate token by making a test API call
    async validateToken() {
        const userInfo = await this.fetchUserInfo();
        return !!userInfo;
    }

    // Logout
    logout() {
        this.clearAuthData();
        window.location.reload();
    }

    // Get current view mode based on auth status
    async getViewMode() {
        if (await this.isOwner()) {
            return CONFIG.app.viewModes.OWNER;
        }
        return CONFIG.app.viewModes.PUBLIC;
    }
}

// Initialize auth system
let githubAuth;
if (typeof CONFIG !== 'undefined') {
    githubAuth = new GitHubAuth(CONFIG.github.clientId, CONFIG.github.repoOwner);
    window.githubAuth = githubAuth;
}
