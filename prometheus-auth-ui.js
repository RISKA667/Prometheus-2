// PROMETHEUS - AUTHENTICATION UI COMPONENTS
// BRDN Conseils - Authentication Interface
// Version: 1.1.5

'use strict';

class AuthUI {
    constructor(authManager, app) {
        this.authManager = authManager;
        this.app = app;
        this.isLoginScreenVisible = false;
        this.currentUserMenuVisible = false;
        
        this.init();
    }

    init() {
        this.createLoginModal();
        this.createUserMenu();
        this.createUserManagementModal();
        this.setupEventListeners();
        
        // Check if user is already logged in
        if (!this.authManager.isLoggedIn()) {
            this.showLoginScreen();
        } else {
            this.showUserInterface();
        }
    }

    // ========================================
    // LOGIN SCREEN
    // ========================================
    createLoginModal() {
        const loginModal = document.createElement('div');
        loginModal.id = 'loginModal';
        loginModal.className = 'login-modal';
        loginModal.innerHTML = `
            <div class="login-overlay">
                <div class="login-container">
                    <div class="login-header">
                        <div class="login-logo">
                            <h1>Prometheus</h1>
                            <p>BRDN Conseils</p>
                            <small>Legal Management System</small>
                        </div>
                    </div>
                    
                    <div class="login-form-container">
                        <form id="loginForm" onsubmit="authUI.handleLogin(event)">
                            <h2>Sign In</h2>
                            
                            <div class="form-group">
                                <label for="loginUsername">Username or Email</label>
                                <input type="text" 
                                       id="loginUsername" 
                                       required 
                                       autocomplete="username"
                                       placeholder="Enter your username or email">
                            </div>
                            
                            <div class="form-group">
                                <label for="loginPassword">Password</label>
                                <div class="password-input-container">
                                    <input type="password" 
                                           id="loginPassword" 
                                           required 
                                           autocomplete="current-password"
                                           placeholder="Enter your password">
                                    <button type="button" 
                                            class="password-toggle" 
                                            onclick="authUI.togglePasswordVisibility('loginPassword')"
                                            aria-label="Toggle password visibility">
                                        👁️
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn-login" id="loginSubmitBtn">
                                    <span class="btn-text">Sign In</span>
                                    <span class="btn-spinner" style="display: none;">⏳</span>
                                </button>
                            </div>
                            
                            <div class="login-footer">
                                <p><strong>Default Login:</strong> admin / admin123</p>
                                <small>Contact IT support for password reset</small>
                            </div>
                        </form>
                        
                        <div class="login-error" id="loginError" style="display: none;">
                            <span class="error-icon">⚠️</span>
                            <span class="error-message"></span>
                        </div>
                    </div>
                    
                    <div class="login-info">
                        <h3>System Information</h3>
                        <ul>
                            <li><strong>Version:</strong> ${APP_CONFIG.version}</li>
                            <li><strong>Environment:</strong> Production</li>
                            <li><strong>Support:</strong> it@brdn-conseils.com</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(loginModal);
    }

    showLoginScreen() {
        this.isLoginScreenVisible = true;
        const loginModal = document.getElementById('loginModal');
        const navbar = document.querySelector('.navbar');
        const mainSections = document.querySelectorAll('.main-section');
        
        if (loginModal) {
            loginModal.style.display = 'flex';
            
            // Focus username field
            setTimeout(() => {
                const usernameField = document.getElementById('loginUsername');
                if (usernameField) {
                    usernameField.focus();
                }
            }, 100);
        }
        
        // Hide main application
        if (navbar) navbar.style.display = 'none';
        mainSections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Announce to screen readers - CORRECTION: Utiliser ScreenReaderManager
        if (window.ScreenReaderManager && typeof ScreenReaderManager.announce === 'function') {
            ScreenReaderManager.announce('Please sign in to continue');
        } else {
            // Fallback si ScreenReaderManager n'est pas disponible
            console.log('Screen reader: Please sign in to continue');
        }
    }

    hideLoginScreen() {
        this.isLoginScreenVisible = false;
        const loginModal = document.getElementById('loginModal');
        
        if (loginModal) {
            loginModal.style.display = 'none';
        }
        
        this.showUserInterface();
    }

    showUserInterface() {
        const navbar = document.querySelector('.navbar');
        const dashboardSection = document.getElementById('dashboard');
        
        if (navbar) navbar.style.display = 'flex';
        if (dashboardSection) {
            dashboardSection.style.display = 'block';
            dashboardSection.classList.add('active');
        }
        
        // Update user menu
        this.updateUserMenu();
        
        // Load user's preferred section
        const currentUser = this.authManager.getCurrentUser();
        if (currentUser) {
            // Announce to screen readers - CORRECTION: Utiliser ScreenReaderManager
            if (window.ScreenReaderManager && typeof ScreenReaderManager.announce === 'function') {
                ScreenReaderManager.announce(`Welcome back, ${currentUser.firstName || currentUser.username}`);
            } else {
                console.log(`Screen reader: Welcome back, ${currentUser.firstName || currentUser.username}`);
            }
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const submitBtn = document.getElementById('loginSubmitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        const errorDiv = document.getElementById('loginError');
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnSpinner.style.display = 'inline';
            errorDiv.style.display = 'none';
            
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            // Attempt login
            const loginResult = await this.authManager.login(username, password);
            
            // Success
            this.hideLoginScreen();
            this.showSuccessMessage(`Welcome back, ${loginResult.user.firstName || loginResult.user.username}!`);
            
            // Reset form
            document.getElementById('loginForm').reset();
            
        } catch (error) {
            // Show error
            this.showLoginError(error.message);
            
            // Focus password field for retry
            document.getElementById('loginPassword').focus();
            
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
        }
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('loginError');
        const errorMessage = errorDiv.querySelector('.error-message');
        
        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.style.display = 'flex';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
            
            // Announce to screen readers - CORRECTION: Utiliser ScreenReaderManager
            if (window.ScreenReaderManager && typeof ScreenReaderManager.announce === 'function') {
                ScreenReaderManager.announce(`Login error: ${message}`);
            } else {
                console.log(`Screen reader: Login error: ${message}`);
            }
        }
    }

    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const toggle = input.nextElementSibling;
        
        if (input.type === 'password') {
            input.type = 'text';
            toggle.textContent = '🙈';
            toggle.setAttribute('aria-label', 'Hide password');
        } else {
            input.type = 'password';
            toggle.textContent = '👁️';
            toggle.setAttribute('aria-label', 'Show password');
        }
    }

    // ========================================
    // USER MENU
    // ========================================
    createUserMenu() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        
        const userMenuContainer = document.createElement('div');
        userMenuContainer.id = 'userMenuContainer';
        userMenuContainer.className = 'user-menu-container';
        userMenuContainer.innerHTML = `
            <div class="user-info" onclick="authUI.toggleUserMenu()">
                <span class="user-avatar" id="userAvatar">👤</span>
                <span class="user-name" id="currentUserName">Guest</span>
                <span class="user-role" id="currentUserRole">Not logged in</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            
            <div class="user-menu" id="userMenu" style="display: none;">
                <div class="user-menu-header">
                    <div class="user-details">
                        <span class="user-name" id="menuUserName">Guest User</span>
                        <span class="user-email" id="menuUserEmail">guest@example.com</span>
                        <span class="user-role-badge" id="menuUserRole">Guest</span>
                    </div>
                </div>
                
                <div class="user-menu-section">
                    <h4>Account</h4>
                    <button class="user-menu-item" onclick="authUI.showProfileSettings()">
                        ⚙️ Profile Settings
                    </button>
                    <button class="user-menu-item" onclick="authUI.showChangePassword()">
                        🔒 Change Password
                    </button>
                </div>
                
                <div class="user-menu-section" id="adminSection" style="display: none;">
                    <h4>Administration</h4>
                    <button class="user-menu-item" onclick="authUI.showUserManagement()">
                        👥 User Management
                    </button>
                    <button class="user-menu-item" onclick="authUI.showSystemSettings()">
                        🔧 System Settings
                    </button>
                    <button class="user-menu-item" onclick="authUI.showSecurityAudit()">
                        🛡️ Security Audit
                    </button>
                </div>
                
                <div class="user-menu-section">
                    <h4>Session</h4>
                    <div class="session-info">
                        <small>Session expires: <span id="sessionExpiry">-</span></small>
                        <button class="btn-link" onclick="authUI.extendSession()">Extend</button>
                    </div>
                </div>
                
                <div class="user-menu-footer">
                    <button class="btn-logout" onclick="authUI.handleLogout()">
                        🚪 Sign Out
                    </button>
                </div>
            </div>
        `;
        
        // Insert before timer widget
        const timerWidget = navbar.querySelector('.timer-widget');
        if (timerWidget) {
            navbar.insertBefore(userMenuContainer, timerWidget);
        } else {
            navbar.appendChild(userMenuContainer);
        }
    }

    updateUserMenu() {
        const currentUser = this.authManager.getCurrentUser();
        const currentSession = this.authManager.getCurrentSession();
        
        if (!currentUser) return;
        
        // Update user info in navbar
        const currentUserName = document.getElementById('currentUserName');
        const currentUserRole = document.getElementById('currentUserRole');
        
        if (currentUserName) {
            currentUserName.textContent = 
                currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.username;
        }
        
        if (currentUserRole) {
            currentUserRole.textContent = currentUser.role.name;
        }
        
        // Update user menu details
        const menuUserName = document.getElementById('menuUserName');
        const menuUserEmail = document.getElementById('menuUserEmail');
        const menuUserRole = document.getElementById('menuUserRole');
        
        if (menuUserName) {
            menuUserName.textContent = 
                currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.username;
        }
        
        if (menuUserEmail) {
            menuUserEmail.textContent = currentUser.email;
        }
        
        if (menuUserRole) {
            menuUserRole.textContent = currentUser.role.name;
        }
        
        // Show admin section if user has admin permissions
        const adminSection = document.getElementById('adminSection');
        if (adminSection) {
            if (this.authManager.hasPermission('users.view')) {
                adminSection.style.display = 'block';
            } else {
                adminSection.style.display = 'none';
            }
        }
        
        // Update session expiry
        if (currentSession) {
            const sessionExpiry = document.getElementById('sessionExpiry');
            if (sessionExpiry) {
                const expiryDate = new Date(currentSession.expiresAt);
                sessionExpiry.textContent = 
                    expiryDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            }
        }
        
        // Set user avatar based on role
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            const roleAvatars = {
                'founding_partner': '👑',
                'partner': '💼',
                'associate': '⚖️',
                'assistant': '📋',
                'intern': '🎓'
            };
            avatar.textContent = roleAvatars[currentUser.role.id] || '👤';
        }
    }

    toggleUserMenu() {
        const userMenu = document.getElementById('userMenu');
        const isVisible = userMenu.style.display !== 'none';
        
        if (isVisible) {
            userMenu.style.display = 'none';
            this.currentUserMenuVisible = false;
        } else {
            userMenu.style.display = 'block';
            this.currentUserMenuVisible = true;
            this.updateUserMenu();
        }
    }

    hideUserMenu() {
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.style.display = 'none';
            this.currentUserMenuVisible = false;
        }
    }

    extendSession() {
        this.authManager.extendSession();
        this.updateUserMenu();
        this.showSuccessMessage('Session extended for 8 hours');
    }

    async handleLogout() {
        if (confirm('Are you sure you want to sign out?')) {
            try {
                this.authManager.logout();
                this.showLoginScreen();
                this.showSuccessMessage('You have been signed out successfully');
            } catch (error) {
                console.error('Logout error:', error);
                this.showErrorMessage('Error during logout');
            }
        }
    }

    // ========================================
    // USER MANAGEMENT
    // ========================================
    createUserManagementModal() {
        const userMgmtModal = document.createElement('div');
        userMgmtModal.id = 'userManagementModal';
        userMgmtModal.className = 'modal-overlay';
        userMgmtModal.innerHTML = `
            <div class="modal-container large">
                <div class="modal-header">
                    <h2>👥 User Management</h2>
                    <button class="modal-close" onclick="authUI.hideUserManagement()">✕</button>
                </div>
                
                <div class="modal-content">
                    <div class="user-mgmt-toolbar">
                        <button class="btn-primary" onclick="authUI.showCreateUserForm()">
                            + Add New User
                        </button>
                        <div class="user-stats" id="userStatsDisplay">
                            <span class="stat">Total: <strong id="totalUsers">0</strong></span>
                            <span class="stat">Active: <strong id="activeUsers">0</strong></span>
                        </div>
                    </div>
                    
                    <div class="users-table-container">
                        <table class="users-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Last Login</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="usersTableBody">
                                <!-- Users will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(userMgmtModal);
    }

    showUserManagement() {
        if (!this.authManager.hasPermission('users.view')) {
            this.showErrorMessage('Access denied: Insufficient permissions');
            return;
        }
        
        const modal = document.getElementById('userManagementModal');
        modal.style.display = 'flex';
        
        this.loadUsersTable();
        this.hideUserMenu();
    }

    hideUserManagement() {
        const modal = document.getElementById('userManagementModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    loadUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        const totalUsers = document.getElementById('totalUsers');
        const activeUsers = document.getElementById('activeUsers');
        
        if (!tbody) return;
        
        const users = this.authManager.getAllUsers();
        const stats = this.authManager.getUserStats();
        
        // Update stats
        if (totalUsers) totalUsers.textContent = stats.total;
        if (activeUsers) activeUsers.textContent = stats.active;
        
        // Load users
        tbody.innerHTML = users.map(user => `
            <tr class="user-row ${!user.isActive ? 'inactive' : ''}">
                <td>
                    <div class="user-cell">
                        <span class="user-avatar-small">${this.getUserAvatar(user.role.id)}</span>
                        <div class="user-info">
                            <strong>${user.firstName} ${user.lastName}</strong>
                            <small>${user.email}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="role-badge role-${user.role.id}">${user.role.name}</span>
                </td>
                <td>
                    <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <small>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</small>
                </td>
                <td>
                    <div class="user-actions">
                        <button class="btn-small" onclick="authUI.editUser('${user.id}')" title="Edit user">
                            ✏️
                        </button>
                        ${user.id !== this.authManager.getCurrentUser()?.id ? `
                            <button class="btn-small btn-danger" onclick="authUI.deleteUser('${user.id}')" title="Delete user">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getUserAvatar(roleId) {
        const roleAvatars = {
            'founding_partner': '👑',
            'partner': '💼',
            'associate': '⚖️',
            'assistant': '📋',
            'intern': '🎓'
        };
        return roleAvatars[roleId] || '👤';
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================
    setupEventListeners() {
        // Close user menu when clicking outside
        document.addEventListener('click', (event) => {
            const userMenuContainer = document.getElementById('userMenuContainer');
            if (userMenuContainer && !userMenuContainer.contains(event.target) && this.currentUserMenuVisible) {
                this.hideUserMenu();
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'L') {
                event.preventDefault();
                if (this.authManager.isLoggedIn()) {
                    this.handleLogout();
                } else {
                    this.showLoginScreen();
                }
            }
        });

        // Auto-logout on prolonged inactivity (30 minutes)
        let inactivityTimer;
        const resetInactivityTimer = () => {
            clearTimeout(inactivityTimer);
            if (this.authManager.isLoggedIn()) {
                inactivityTimer = setTimeout(() => {
                    if (confirm('You have been inactive for 30 minutes. Continue session?')) {
                        this.authManager.extendSession();
                        resetInactivityTimer();
                    } else {
                        this.handleLogout();
                    }
                }, 30 * 60 * 1000); // 30 minutes
            }
        };

        // Reset timer on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetInactivityTimer, true);
        });

        resetInactivityTimer();
    }

    // ========================================
    // UTILITY METHODS
    // ========================================
    showSuccessMessage(message) {
        if (window.notificationManager && window.notificationManager.showSuccess) {
            window.notificationManager.showSuccess(message);
        } else {
            console.log('Success:', message);
        }
    }

    showErrorMessage(message) {
        if (window.notificationManager && window.notificationManager.showError) {
            window.notificationManager.showError(message);
        } else {
            console.error('Error:', message);
            alert(message);
        }
    }

    showProfileSettings() {
        this.showErrorMessage('Profile settings coming soon');
    }

    showChangePassword() {
        this.showErrorMessage('Change password form coming soon');
    }

    showSystemSettings() {
        this.showErrorMessage('System settings coming soon');
    }

    showSecurityAudit() {
        const auditLog = this.authManager.getSecurityAuditLog();
        console.log('Security Audit Log:', auditLog);
        this.showSuccessMessage('Security audit logged to console');
    }

    showCreateUserForm() {
        this.showErrorMessage('Create user form coming soon');
    }

    editUser(userId) {
        this.showErrorMessage(`Edit user ${userId} coming soon`);
    }

    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                this.authManager.deleteUser(userId);
                this.loadUsersTable();
                this.showSuccessMessage('User deleted successfully');
            } catch (error) {
                this.showErrorMessage(error.message);
            }
        }
    }
}

let authUI;