// PROMETHEUS.EXE - AUTHENTICATION & USER MANAGEMENT SYSTEM
// BOURDON & Associates - Security Layer
// Version: 2.0.0 - Production Ready

'use strict';

// ========================================
// USER ROLES & PERMISSIONS SYSTEM
// ========================================
const USER_ROLES = {
    FOUNDING_PARTNER: {
        id: 'founding_partner',
        name: 'Founding Partner',
        level: 5,
        rate: 750,
        permissions: ['*'], // All permissions
        description: 'Full system access'
    },
    PARTNER: {
        id: 'partner',
        name: 'Partner',
        level: 4,
        rate: 500,
        permissions: [
            'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
            'matters.view', 'matters.create', 'matters.edit', 'matters.delete',
            'time.view', 'time.create', 'time.edit', 'time.delete',
            'billing.view', 'billing.create', 'billing.edit', 'billing.export',
            'documents.view', 'documents.upload', 'documents.edit', 'documents.delete',
            'analytics.view', 'analytics.export',
            'users.view', 'users.create', 'users.edit',
            'system.backup'
        ],
        description: 'Senior management access'
    },
    ASSOCIATE: {
        id: 'associate',
        name: 'Associate',
        level: 3,
        rate: 250,
        permissions: [
            'clients.view', 'clients.create', 'clients.edit',
            'matters.view', 'matters.create', 'matters.edit',
            'time.view', 'time.create', 'time.edit',
            'billing.view', 'billing.create',
            'documents.view', 'documents.upload', 'documents.edit',
            'analytics.view'
        ],
        description: 'Standard legal professional access'
    },
    ASSISTANT: {
        id: 'assistant',
        name: 'Legal Assistant',
        level: 2,
        rate: 150,
        permissions: [
            'clients.view', 'clients.create',
            'matters.view', 'matters.create',
            'time.view', 'time.create',
            'documents.view', 'documents.upload',
            'billing.view'
        ],
        description: 'Administrative support access'
    },
    INTERN: {
        id: 'intern',
        name: 'Intern',
        level: 1,
        rate: 50,
        permissions: [
            'clients.view',
            'matters.view',
            'time.view', 'time.create',
            'documents.view'
        ],
        description: 'Limited trainee access'
    }
};

const PERMISSIONS = {
    // Client permissions
    'clients.view': 'View clients',
    'clients.create': 'Create new clients',
    'clients.edit': 'Edit client information',
    'clients.delete': 'Delete clients',
    
    // Matter permissions
    'matters.view': 'View matters',
    'matters.create': 'Create new matters',
    'matters.edit': 'Edit matter information',
    'matters.delete': 'Delete matters',
    
    // Time tracking permissions
    'time.view': 'View time entries',
    'time.create': 'Create time entries',
    'time.edit': 'Edit time entries',
    'time.delete': 'Delete time entries',
    
    // Billing permissions
    'billing.view': 'View billing information',
    'billing.create': 'Create invoices',
    'billing.edit': 'Edit invoices',
    'billing.export': 'Export billing data',
    
    // Document permissions
    'documents.view': 'View documents',
    'documents.upload': 'Upload documents',
    'documents.edit': 'Edit document metadata',
    'documents.delete': 'Delete documents',
    
    // Analytics permissions
    'analytics.view': 'View analytics',
    'analytics.export': 'Export analytics data',
    
    // User management permissions
    'users.view': 'View users',
    'users.create': 'Create new users',
    'users.edit': 'Edit user information',
    'users.delete': 'Delete users',
    
    // System permissions
    'system.backup': 'System backup and maintenance'
};

// ========================================
// AUTHENTICATION MANAGER
// ========================================
class AuthManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentSession = null;
        this.users = this.dataManager.load('users', this.getDefaultUsers());
        this.sessions = this.dataManager.load('sessions', []);
        this.loginAttempts = new Map();
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        
        // Initialize default admin if no users exist
        if (this.users.length === 0) {
            this.createDefaultAdmin();
        }
        
        // Clean expired sessions on startup
        this.cleanExpiredSessions();
    }

    getDefaultUsers() {
        return [
            {
                id: 'admin-001',
                username: 'admin',
                email: 'admin@bourdon-associates.com',
                firstName: 'System',
                lastName: 'Administrator',
                role: USER_ROLES.FOUNDING_PARTNER,
                passwordHash: this.hashPassword('admin123'), // Default password
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                preferences: {
                    language: 'en',
                    theme: 'dark',
                    notifications: true
                }
            }
        ];
    }

    createDefaultAdmin() {
        const defaultAdmin = this.getDefaultUsers()[0];
        this.users = [defaultAdmin];
        this.saveUsers();
        console.log('Default admin user created');
    }

    // ========================================
    // PASSWORD MANAGEMENT
    // ========================================
    hashPassword(password) {
        // Simple hash for demo - in production, use bcrypt or similar
        let hash = 0;
        const salt = 'prometheus_salt_2024';
        const combined = password + salt;
        
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(16);
    }

    validatePassword(password) {
        const errors = [];
        
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // ========================================
    // USER MANAGEMENT
    // ========================================
    createUser(userData) {
        try {
            // Validate input
            if (!userData.username || !userData.email || !userData.password) {
                throw new Error('Username, email, and password are required');
            }

            // Check for existing username/email
            const existingUser = this.users.find(u => 
                u.username === userData.username || u.email === userData.email
            );
            
            if (existingUser) {
                throw new Error('Username or email already exists');
            }

            // Validate password
            const passwordValidation = this.validatePassword(userData.password);
            if (!passwordValidation.isValid) {
                throw new Error(passwordValidation.errors.join(', '));
            }

            // Create user
            const user = {
                id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                username: userData.username.toLowerCase().trim(),
                email: userData.email.toLowerCase().trim(),
                firstName: userData.firstName?.trim() || '',
                lastName: userData.lastName?.trim() || '',
                role: USER_ROLES[userData.roleId] || USER_ROLES.INTERN,
                passwordHash: this.hashPassword(userData.password),
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                preferences: {
                    language: 'en',
                    theme: 'dark',
                    notifications: true
                }
            };

            this.users.push(user);
            this.saveUsers();

            // Return user without password hash
            const { passwordHash, ...userResponse } = user;
            return userResponse;

        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    updateUser(userId, updates) {
        try {
            const userIndex = this.users.findIndex(u => u.id === userId);
            if (userIndex === -1) {
                throw new Error('User not found');
            }

            const user = this.users[userIndex];
            
            // Validate email uniqueness if changed
            if (updates.email && updates.email !== user.email) {
                const emailExists = this.users.find(u => 
                    u.id !== userId && u.email === updates.email.toLowerCase()
                );
                if (emailExists) {
                    throw new Error('Email already exists');
                }
            }

            // Update user
            Object.assign(user, {
                ...updates,
                email: updates.email?.toLowerCase(),
                lastModified: new Date().toISOString()
            });

            this.users[userIndex] = user;
            this.saveUsers();

            const { passwordHash, ...userResponse } = user;
            return userResponse;

        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    deleteUser(userId) {
        try {
            const userIndex = this.users.findIndex(u => u.id === userId);
            if (userIndex === -1) {
                throw new Error('User not found');
            }

            // Prevent deletion of the last admin
            const user = this.users[userIndex];
            const adminCount = this.users.filter(u => 
                u.role.level >= USER_ROLES.PARTNER.level && u.isActive
            ).length;

            if (user.role.level >= USER_ROLES.PARTNER.level && adminCount <= 1) {
                throw new Error('Cannot delete the last administrator');
            }

            this.users.splice(userIndex, 1);
            this.saveUsers();

            // Invalidate user sessions
            this.invalidateUserSessions(userId);

            return true;

        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    changePassword(userId, currentPassword, newPassword) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            if (this.hashPassword(currentPassword) !== user.passwordHash) {
                throw new Error('Current password is incorrect');
            }

            // Validate new password
            const passwordValidation = this.validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                throw new Error(passwordValidation.errors.join(', '));
            }

            // Update password
            user.passwordHash = this.hashPassword(newPassword);
            user.lastModified = new Date().toISOString();
            
            this.saveUsers();
            
            // Invalidate all sessions for this user (force re-login)
            this.invalidateUserSessions(userId);

            return true;

        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }

    // ========================================
    // AUTHENTICATION & SESSIONS
    // ========================================
    async login(username, password) {
        try {
            const normalizedUsername = username.toLowerCase().trim();
            
            // Check for account lockout
            const attempts = this.loginAttempts.get(normalizedUsername) || { count: 0, lastAttempt: 0 };
            
            if (attempts.count >= this.maxLoginAttempts) {
                const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
                if (timeSinceLastAttempt < this.lockoutDuration) {
                    const remainingTime = Math.ceil((this.lockoutDuration - timeSinceLastAttempt) / 60000);
                    throw new Error(`Account locked. Try again in ${remainingTime} minutes.`);
                } else {
                    // Reset attempts after lockout period
                    this.loginAttempts.delete(normalizedUsername);
                }
            }

            // Find user
            const user = this.users.find(u => 
                (u.username === normalizedUsername || u.email === normalizedUsername) && u.isActive
            );

            if (!user || this.hashPassword(password) !== user.passwordHash) {
                // Increment failed attempts
                this.loginAttempts.set(normalizedUsername, {
                    count: attempts.count + 1,
                    lastAttempt: Date.now()
                });
                throw new Error('Invalid username or password');
            }

            // Reset login attempts on successful login
            this.loginAttempts.delete(normalizedUsername);

            // Create session
            const session = this.createSession(user);
            
            // Update last login
            user.lastLogin = new Date().toISOString();
            this.saveUsers();

            // Set current session
            this.currentSession = session;
            
            return {
                user: this.sanitizeUser(user),
                session: session,
                permissions: this.getUserPermissions(user)
            };

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    logout() {
        if (this.currentSession) {
            this.invalidateSession(this.currentSession.id);
            this.currentSession = null;
        }
        
        // Clear UI state
        this.clearUserInterface();
        
        return true;
    }

    createSession(user) {
        const session = {
            id: 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            userId: user.id,
            username: user.username,
            role: user.role,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
            isActive: true,
            lastActivity: new Date().toISOString()
        };

        this.sessions.push(session);
        this.saveSessions();
        
        return session;
    }

    validateSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId && s.isActive);
        
        if (!session) {
            return null;
        }

        // Check expiration
        if (new Date(session.expiresAt) < new Date()) {
            this.invalidateSession(sessionId);
            return null;
        }

        // Update last activity
        session.lastActivity = new Date().toISOString();
        this.saveSessions();

        return session;
    }

    invalidateSession(sessionId) {
        const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex !== -1) {
            this.sessions[sessionIndex].isActive = false;
            this.saveSessions();
        }
    }

    invalidateUserSessions(userId) {
        this.sessions.forEach(session => {
            if (session.userId === userId) {
                session.isActive = false;
            }
        });
        this.saveSessions();
    }

    cleanExpiredSessions() {
        const now = new Date();
        this.sessions = this.sessions.filter(session => {
            return session.isActive && new Date(session.expiresAt) > now;
        });
        this.saveSessions();
    }

    // ========================================
    // PERMISSIONS & AUTHORIZATION
    // ========================================
    hasPermission(permission, user = null) {
        const currentUser = user || this.getCurrentUser();
        if (!currentUser) {
            return false;
        }

        // Founding partners have all permissions
        if (currentUser.role.permissions.includes('*')) {
            return true;
        }

        return currentUser.role.permissions.includes(permission);
    }

    getUserPermissions(user) {
        if (user.role.permissions.includes('*')) {
            return Object.keys(PERMISSIONS);
        }
        return user.role.permissions;
    }

    requirePermission(permission) {
        if (!this.hasPermission(permission)) {
            throw new Error(`Access denied. Required permission: ${PERMISSIONS[permission] || permission}`);
        }
        return true;
    }

    // ========================================
    // SESSION MANAGEMENT
    // ========================================
    getCurrentUser() {
        if (!this.currentSession) {
            return null;
        }

        const user = this.users.find(u => u.id === this.currentSession.userId);
        return user ? this.sanitizeUser(user) : null;
    }

    getCurrentSession() {
        return this.currentSession;
    }

    isLoggedIn() {
        return this.currentSession !== null && this.validateSession(this.currentSession.id) !== null;
    }

    extendSession() {
        if (this.currentSession) {
            const session = this.sessions.find(s => s.id === this.currentSession.id);
            if (session) {
                session.expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
                session.lastActivity = new Date().toISOString();
                this.saveSessions();
            }
        }
    }

    // ========================================
    // UTILITY METHODS
    // ========================================
    sanitizeUser(user) {
        const { passwordHash, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    getAllUsers() {
        return this.users.map(user => this.sanitizeUser(user));
    }

    getActiveUsers() {
        return this.users
            .filter(user => user.isActive)
            .map(user => this.sanitizeUser(user));
    }

    getUserById(userId) {
        const user = this.users.find(u => u.id === userId);
        return user ? this.sanitizeUser(user) : null;
    }

    getUserStats() {
        const stats = {
            total: this.users.length,
            active: this.users.filter(u => u.isActive).length,
            byRole: {}
        };

        Object.values(USER_ROLES).forEach(role => {
            stats.byRole[role.name] = this.users.filter(u => 
                u.role.id === role.id && u.isActive
            ).length;
        });

        return stats;
    }

    // ========================================
    // UI INTEGRATION
    // ========================================
    clearUserInterface() {
        // Clear any cached user data from UI
        localStorage.removeItem('prometheus_current_session');
        
        // Redirect to login if needed
        this.showLoginScreen();
    }

    showLoginScreen() {
        // This will be implemented in the UI layer
        console.log('Should show login screen');
    }

    // ========================================
    // DATA PERSISTENCE
    // ========================================
    saveUsers() {
        this.dataManager.save('users', this.users);
    }

    saveSessions() {
        this.dataManager.save('sessions', this.sessions);
    }

    // ========================================
    // SECURITY AUDIT
    // ========================================
    getSecurityAuditLog() {
        const auditEvents = [];
        
        // Login attempts
        this.loginAttempts.forEach((attempts, username) => {
            if (attempts.count > 0) {
                auditEvents.push({
                    type: 'failed_login',
                    username: username,
                    attempts: attempts.count,
                    lastAttempt: new Date(attempts.lastAttempt).toISOString()
                });
            }
        });

        // Active sessions
        const activeSessions = this.sessions.filter(s => s.isActive);
        auditEvents.push({
            type: 'active_sessions',
            count: activeSessions.length,
            sessions: activeSessions.map(s => ({
                id: s.id,
                username: s.username,
                createdAt: s.createdAt,
                lastActivity: s.lastActivity
            }))
        });

        return auditEvents;
    }

    // ========================================
    // SYSTEM INITIALIZATION
    // ========================================
    initialize() {
        console.log('AuthManager initialized');
        console.log(`Users: ${this.users.length}, Active sessions: ${this.sessions.filter(s => s.isActive).length}`);
        
        // Auto-extend session every 30 minutes if user is active
        setInterval(() => {
            if (this.isLoggedIn()) {
                this.extendSession();
            }
        }, 30 * 60 * 1000);

        // Clean expired sessions every hour
        setInterval(() => {
            this.cleanExpiredSessions();
        }, 60 * 60 * 1000);
    }
     showLoginScreen() {
        if (typeof authUI !== 'undefined' && authUI.showLoginScreen) {
            authUI.showLoginScreen();
        } else {
            console.warn('AuthUI not available, showing fallback login');
            this.showFallbackLogin();
        }
    }
    
    showFallbackLogin() {
        // Fallback basique si AuthUI n'est pas chargé
        const loginPrompt = prompt('Username:');
        if (loginPrompt) {
            const passwordPrompt = prompt('Password:');
            if (passwordPrompt) {
                return this.login(loginPrompt, passwordPrompt);
            }
        }
        throw new Error('Login cancelled');
    }
    
    // CORRIGER le hachage faible (CRITIQUE pour sécurité)
    hashPassword(password) {
        // TODO: Remplacer par bcrypt en production
        // Cette implémentation est temporaire et DANGEREUSE
        console.warn('🚨 SÉCURITÉ: Hachage faible utilisé - remplacer par bcrypt');
        
        // Amélioration temporaire avec crypto API si disponible
        if (window.crypto && window.crypto.subtle) {
            // Utiliser Web Crypto API si disponible
            return this.hashPasswordCrypto(password);
        }
        
        // Fallback amélioré (mais toujours faible)
        const salt = 'prometheus_salt_2024_' + Date.now();
        let hash = 0;
        const combined = password + salt;
        
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        // Ajouter plusieurs passes
        for (let i = 0; i < 1000; i++) {
            hash = ((hash << 5) - hash) + hash;
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(16) + '_' + salt.slice(-8);
    }
    
    async hashPasswordCrypto(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'prometheus_salt_2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, USER_ROLES, PERMISSIONS };
}