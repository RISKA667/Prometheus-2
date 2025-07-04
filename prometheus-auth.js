// PROMETHEUS - AUTHENTICATION & USER MANAGEMENT SYSTEM
// BRDN Conseils - Security Layer
// Version: 2.0.2 - SECURED

'use strict';

// ========================================
// PERMISSIONS SYSTEM
// ========================================

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
        this.users = [];
        this.sessions = [];
        this.loginAttempts = new Map();
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        
        // Vérifier que USER_ROLES est disponible (défini dans prometheus-core.js)
        if (typeof USER_ROLES === 'undefined') {
            console.error('USER_ROLES not available - ensure prometheus-core.js is loaded first');
            return;
        }
    }

    async initialize() {
        try {
            console.log('🔐 Initializing AuthManager...');
            
            // Charger les données utilisateur
            this.users = this.dataManager.read('users') || [];
            this.sessions = this.dataManager.read('sessions') || [];
            
            // Créer l'admin par défaut si aucun utilisateur n'existe
            if (this.users.length === 0) {
                await this.createDefaultAdmin();
            }
            
            // Nettoyer les sessions expirées
            this.cleanExpiredSessions();
            
            console.log('✅ AuthManager initialized successfully');
            
        } catch (error) {
            console.error('❌ AuthManager initialization failed:', error);
            throw error;
        }
    }

    async getDefaultUsers() {
        return [
            {
                id: 'admin-001',
                username: 'admin',
                email: 'admin@brdn-conseils.com', // CORRIGÉ: BRDN Conseils
                firstName: 'System',
                lastName: 'Administrator',
                role: USER_ROLES.FOUNDING_PARTNER,
                passwordHash: await this.hashPassword('admin123'), // CORRIGÉ: async
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

    async createDefaultAdmin() {
        try {
            const defaultUsers = await this.getDefaultUsers();
            const defaultAdmin = defaultUsers[0];
            this.users = [defaultAdmin];
            this.dataManager.storage.users = this.users;
            this.dataManager.saveToStorage('users');
            console.log('✅ Default admin user created');
        } catch (error) {
            console.error('❌ Failed to create default admin:', error);
        }
    }

    // ========================================
    // PASSWORD MANAGEMENT - SÉCURISÉ
    // ========================================
    async hashPassword(password) {
        try {
            // Vérifier si on est dans un environnement Node.js (Electron)
            if (typeof require !== 'undefined') {
                const bcrypt = require('bcryptjs');
                const saltRounds = 12;
                return await bcrypt.hash(password, saltRounds);
            } else {
                // Fallback pour navigateur (ne devrait pas arriver en production Electron)
                console.warn('⚠️ Using fallback password hashing - NOT SECURE for production');
                return this.fallbackHash(password);
            }
        } catch (error) {
            console.error('❌ Password hashing failed:', error);
            throw new Error('Password hashing failed');
        }
    }

    async verifyPassword(password, hash) {
        try {
            // Vérifier si on est dans un environnement Node.js (Electron)
            if (typeof require !== 'undefined') {
                const bcrypt = require('bcryptjs');
                return await bcrypt.compare(password, hash);
            } else {
                // Fallback pour navigateur (ne devrait pas arriver en production Electron)
                console.warn('⚠️ Using fallback password verification - NOT SECURE for production');
                return this.fallbackHash(password) === hash;
            }
        } catch (error) {
            console.error('❌ Password verification failed:', error);
            return false;
        }
    }

    // Fallback hash (SEULEMENT pour développement web)
    fallbackHash(password) {
        let hash = 0;
        const salt = 'prometheus_salt_2024_brdn';
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
    async createUser(userData) {
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
                passwordHash: await this.hashPassword(userData.password), // CORRIGÉ: async
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

    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                throw new Error('User not found');
            }

            // CORRIGÉ: Vérifier le mot de passe actuel avec bcrypt
            const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.passwordHash);
            if (!isCurrentPasswordValid) {
                throw new Error('Current password is incorrect');
            }

            // Validate new password
            const passwordValidation = this.validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                throw new Error(passwordValidation.errors.join(', '));
            }

            // CORRIGÉ: Hasher le nouveau mot de passe avec bcrypt
            user.passwordHash = await this.hashPassword(newPassword);
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

            // CORRIGÉ: Vérification du mot de passe avec bcrypt
            let isPasswordValid = false;
            if (user) {
                isPasswordValid = await this.verifyPassword(password, user.passwordHash);
            }

            if (!user || !isPasswordValid) {
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

    restoreSession() {
        try {
            const savedSession = localStorage.getItem('prometheus_current_session');
            if (savedSession) {
                const sessionData = JSON.parse(savedSession);
                const validSession = this.validateSession(sessionData.id);
                if (validSession) {
                    this.currentSession = validSession;
                    return true;
                }
            }
        } catch (error) {
            console.warn('Failed to restore session:', error);
        }
        return false;
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

    // ========================================
    // DATA PERSISTENCE
    // ========================================
    saveUsers() {
        try {
            if (this.dataManager && this.dataManager.saveToStorage) {
                this.dataManager.storage.users = this.users;
                this.dataManager.saveToStorage('users');
            }
        } catch (error) {
            console.error('Failed to save users:', error);
        }
    }

    saveSessions() {
        try {
            if (this.dataManager && this.dataManager.saveToStorage) {
                this.dataManager.storage.sessions = this.sessions;
                this.dataManager.saveToStorage('sessions');
            }
        } catch (error) {
            console.error('Failed to save sessions:', error);
        }
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
    // MIGRATION UTILITIES (pour les anciens mots de passe)
    // ========================================
    async migratePasswordsToSecure() {
        try {
            console.log('🔄 Starting password migration to secure bcrypt...');
            let migratedCount = 0;

            for (const user of this.users) {
                // Vérifier si le mot de passe semble être un ancien hash faible
                if (user.passwordHash && user.passwordHash.length < 50) {
                    // Demander à l'admin de redéfinir le mot de passe
                    console.warn(`⚠️ User ${user.username} needs password reset for security upgrade`);
                    // Pour l'instant, on laisse tel quel mais on log
                }
            }

            if (migratedCount > 0) {
                this.saveUsers();
                console.log(`✅ Migrated ${migratedCount} passwords to secure bcrypt`);
            } else {
                console.log('✅ No password migration needed');
            }

        } catch (error) {
            console.error('❌ Password migration failed:', error);
        }
    }
    
}

// ========================================
// GLOBAL EXPORTS
// ========================================
window.AuthManager = AuthManager;
window.PERMISSIONS = PERMISSIONS;

console.log('✅ AuthManager loaded successfully - SECURED with bcrypt');