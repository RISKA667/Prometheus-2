/**
 * PROMETHEUS - CORE APPLICATION LOGIC
 * BRDN Conseils - Legal Management System
 * Version: 3.0.1
 */

'use strict';

// ========================================
// CONFIGURATION GLOBALE CENTRALISÉE
// ========================================

const APP_CONFIG = {
    name: 'Prometheus',
    version: '3.0.1',
    company: 'BRDN Conseils',
    
    // Environnement
    isDevelopment: window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.protocol === 'file:',
    
    // Data persistence settings
    autoSaveInterval: 30000, // 30 secondes
    backupInterval: 180000,  // 3 minutes (3 heures = 10800000)
    maxBackups: 20,
    
    // UI settings
    defaultCurrency: 'EUR',
    currencySymbols: {
        USD: '$',
        EUR: '€',
        GBP: '£'
    },
    
    // Time tracking settings
    timerIncrement: 900000, // 15 minutes en millisecondes
    defaultTimeFormat: '24h',
    
    // File upload settings
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.xls', '.xlsx'],
    
    // Business rules
    billableTimeMinimum: 300000, // 5 minutes minimum billable time
    
    // Performance settings
    maxSearchResults: 50,
    searchDebounceDelay: 300,
    
    // Localization
    locale: 'en-US',
    timeZone: 'Europe/Paris',
    
    // API endpoints
    apiEndpoints: {
        legifrance: 'https://api.legifrance.gouv.fr/v1/',
        docusign: 'https://demo.docusign.net/restapi/',
        openai: 'https://api.openai.com/v1/'
    },
    
    // Security settings
    security: {
        sessionTimeout: 8 * 60 * 60 * 1000, // 8 heures
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        passwordMinLength: 8,
        requireStrongPassword: true
    },
    
    // Logging
    logging: {
        enabled: true,
        level: 'INFO', // DEBUG, INFO, WARN, ERROR
        maxLogEntries: 1000
    }
};

// ========================================
// ROLES ET PERMISSIONS CENTRALISÉS
// ========================================

const USER_ROLES = {
    FOUNDING_PARTNER: {
        id: 'founding_partner',
        name: 'Founding Partner',
        level: 5,
        rate: 750,
        permissions: ['*'], // Toutes les permissions
        description: 'Accès système complet'
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
        description: 'Accès gestion senior'
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
        description: 'Accès professionnel juridique standard'
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
        description: 'Accès support administratif'
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
        description: 'Accès limité stagiaire'
    }
};

// Practice areas configuration
const PRACTICE_AREAS = {
    MA: {
        code: 'MA',
        name: 'Mergers & Acquisitions',
        description: 'Corporate mergers, acquisitions, and restructuring',
        defaultRate: 750,
        color: '#FF6B6B'
    },
    CP: {
        code: 'CP',
        name: 'Corporate',
        description: 'Corporate law and governance',
        defaultRate: 600,
        color: '#4ECDC4'
    },
    LTG: {
        code: 'LTG',
        name: 'Litigation',
        description: 'Commercial and civil litigation',
        defaultRate: 650,
        color: '#45B7D1'
    },
    LT: {
        code: 'LT',
        name: 'Legal & Tax',
        description: 'Tax law and compliance',
        defaultRate: 550,
        color: '#96CEB4'
    },
    BK: {
        code: 'BK',
        name: 'Banking',
        description: 'Banking and financial services law',
        defaultRate: 700,
        color: '#FECA57'
    },
    MT: {
        code: 'MT',
        name: 'Monetary',
        description: 'Monetary policy and financial regulation',
        defaultRate: 700,
        color: '#FF9FF3'
    },
    FM: {
        code: 'FM',
        name: 'Financial Market',
        description: 'Capital markets and securities law',
        defaultRate: 750,
        color: '#54A0FF'
    },
    PL: {
        code: 'PL',
        name: 'Private Laws',
        description: 'Private and civil law matters',
        defaultRate: 500,
        color: '#5F27CD'
    },
    IP: {
        code: 'IP',
        name: 'Intellectual Property',
        description: 'Patents, trademarks, and IP protection',
        defaultRate: 650,
        color: '#00D2D3'
    }
};

// Document types configuration
const DOCUMENT_TYPES = {
    contract: {
        name: 'Contract',
        icon: '📄',
        extensions: ['.pdf', '.doc', '.docx'],
        requiresApproval: true
    },
    correspondence: {
        name: 'Correspondence',
        icon: '✉️',
        extensions: ['.pdf', '.doc', '.docx', '.txt'],
        requiresApproval: false
    },
    legal_opinion: {
        name: 'Legal Opinion',
        icon: '⚖️',
        extensions: ['.pdf', '.doc', '.docx'],
        requiresApproval: true
    },
    due_diligence: {
        name: 'Due Diligence',
        icon: '🔍',
        extensions: ['.pdf', '.xls', '.xlsx', '.doc', '.docx'],
        requiresApproval: false
    },
    pleading: {
        name: 'Pleading',
        icon: '📋',
        extensions: ['.pdf', '.doc', '.docx'],
        requiresApproval: true
    },
    evidence: {
        name: 'Evidence',
        icon: '🔎',
        extensions: ['.pdf', '.jpg', '.jpeg', '.png'],
        requiresApproval: false
    },
    research: {
        name: 'Legal Research',
        icon: '📚',
        extensions: ['.pdf', '.doc', '.docx'],
        requiresApproval: false
    },
    other: {
        name: 'Other',
        icon: '📁',
        extensions: ['*'],
        requiresApproval: false
    }
};

// ========================================
// SYSTÈME DE LOGGING
// ========================================

class Logger {
    constructor(config = APP_CONFIG.logging) {
        this.config = config;
        this.logs = [];
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
    }

    log(level, message, data = null, context = 'App') {
        if (!this.config.enabled) return;
        
        const currentLevel = this.levels[this.config.level];
        const logLevel = this.levels[level];
        
        if (logLevel < currentLevel) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            context: context,
            message: message,
            data: data,
            url: window.location.href,
            userAgent: navigator.userAgent.slice(0, 100)
        };

        this.logs.push(logEntry);

        // Maintenir la limite des logs
        if (this.logs.length > this.config.maxLogEntries) {
            this.logs.splice(0, this.logs.length - this.config.maxLogEntries);
        }

        // Console output en développement
        if (APP_CONFIG.isDevelopment) {
            const consoleMethods = {
                DEBUG: 'debug',
                INFO: 'info',
                WARN: 'warn',
                ERROR: 'error'
            };
            
            console[consoleMethods[level]](`[${context}] ${message}`, data || '');
        }

        // Persister les erreurs
        if (level === 'ERROR') {
            this.persistErrorLog(logEntry);
        }
    }

    debug(message, data, context) {
        this.log('DEBUG', message, data, context);
    }

    info(message, data, context) {
        this.log('INFO', message, data, context);
    }

    warn(message, data, context) {
        this.log('WARN', message, data, context);
    }

    error(message, data, context) {
        this.log('ERROR', message, data, context);
    }

    persistErrorLog(logEntry) {
        try {
            const errorLogs = JSON.parse(localStorage.getItem('prometheus_error_logs') || '[]');
            errorLogs.push(logEntry);
            
            // Garder seulement les 100 dernières erreurs
            if (errorLogs.length > 100) {
                errorLogs.splice(0, errorLogs.length - 100);
            }
            
            localStorage.setItem('prometheus_error_logs', JSON.stringify(errorLogs));
        } catch (error) {
            console.error('Failed to persist error log:', error);
        }
    }

    getLogs(level = null) {
        if (!level) return this.logs;
        return this.logs.filter(log => log.level === level);
    }

    exportLogs() {
        const logData = JSON.stringify(this.logs, null, 2);
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `prometheus-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    clearLogs() {
        this.logs = [];
        localStorage.removeItem('prometheus_error_logs');
    }
}

// Instance globale du logger
const logger = new Logger();

// ========================================
// VALIDATION DES DONNÉES
// ========================================

class DataValidator {
    static validateClient(clientData) {
        const errors = [];
        
        if (!clientData.name || typeof clientData.name !== 'string' || clientData.name.trim().length < 2) {
            errors.push('Client name must be at least 2 characters');
        }
        
        if (clientData.name && clientData.name.length > 200) {
            errors.push('Client name cannot exceed 200 characters');
        }
        
        if (clientData.email && !this.isValidEmail(clientData.email)) {
            errors.push('Invalid email format');
        }
        
        if (!['Tier 1', 'Tier 2', 'Tier 3'].includes(clientData.tier)) {
            errors.push('Invalid client tier');
        }
        
        if (clientData.phone && !this.isValidPhone(clientData.phone)) {
            errors.push('Invalid phone number format');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    static validateMatter(matterData) {
        const errors = [];
        
        if (!matterData.title || typeof matterData.title !== 'string' || matterData.title.trim().length < 3) {
            errors.push('Matter title must be at least 3 characters');
        }
        
        if (matterData.title && matterData.title.length > 300) {
            errors.push('Matter title cannot exceed 300 characters');
        }
        
        if (!matterData.practice || !PRACTICE_AREAS[matterData.practice]) {
            errors.push('Invalid practice area');
        }
        
        if (!matterData.clientId || typeof matterData.clientId !== 'string') {
            errors.push('Valid client ID is required');
        }
        
        if (matterData.estimatedBudget !== undefined && matterData.estimatedBudget !== null) {
            const budget = parseFloat(matterData.estimatedBudget);
            if (isNaN(budget) || budget < 0) {
                errors.push('Budget must be a valid positive number');
            }
            if (budget > 10000000) {
                errors.push('Budget cannot exceed 10,000,000');
            }
        }
        
        if (matterData.description && matterData.description.length > 2000) {
            errors.push('Description cannot exceed 2000 characters');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    static validateTimeEntry(entryData) {
        const errors = [];
        
        if (!entryData.matterId || typeof entryData.matterId !== 'string') {
            errors.push('Valid matter ID is required');
        }
        
        if (!entryData.description || typeof entryData.description !== 'string' || entryData.description.trim().length < 3) {
            errors.push('Description must be at least 3 characters');
        }
        
        if (entryData.description && entryData.description.length > 500) {
            errors.push('Description cannot exceed 500 characters');
        }
        
        if (!entryData.duration || typeof entryData.duration !== 'number' || entryData.duration < APP_CONFIG.billableTimeMinimum) {
            errors.push(`Duration must be at least ${APP_CONFIG.billableTimeMinimum / 60000} minutes`);
        }
        
        if (entryData.duration > 24 * 60 * 60 * 1000) {
            errors.push('Duration cannot exceed 24 hours');
        }
        
        if (!entryData.rate || typeof entryData.rate !== 'number' || entryData.rate < 0) {
            errors.push('Valid hourly rate is required');
        }
        
        if (entryData.rate > 2000) {
            errors.push('Hourly rate cannot exceed 2000');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    static validateUser(userData) {
        const errors = [];
        
        if (!userData.username || typeof userData.username !== 'string' || userData.username.trim().length < 3) {
            errors.push('Username must be at least 3 characters');
        }
        
        if (userData.username && !/^[a-zA-Z0-9_]+$/.test(userData.username)) {
            errors.push('Username can only contain letters, numbers, and underscores');
        }
        
        if (!userData.email || !this.isValidEmail(userData.email)) {
            errors.push('Valid email address is required');
        }
        
        if (userData.password && !this.isValidPassword(userData.password)) {
            errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
        }
        
        if (!userData.roleId || !USER_ROLES[userData.roleId.toUpperCase()]) {
            errors.push('Valid role is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    }
    
    static isValidPhone(phone) {
        const phoneRegex = /^[\+]?[\d\s\(\)\-\.]{10,20}$/;
        return phoneRegex.test(phone);
    }
    
    static isValidPassword(password) {
        if (!APP_CONFIG.security.requireStrongPassword) {
            return password.length >= APP_CONFIG.security.passwordMinLength;
        }
        
        const minLength = password.length >= APP_CONFIG.security.passwordMinLength;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        
        return minLength && hasUpper && hasLower && hasNumber;
    }
    
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/[<>\"']/g, '') // Enlever les caractères dangereux
            .substring(0, 1000); // Limiter la longueur
    }
    
    static sanitizeHtml(input) {
        if (typeof input !== 'string') return input;
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
}

// ========================================
// GESTIONNAIRE D'ERREURS AMÉLIORÉ
// ========================================

class ErrorManager {
    static handleError(error, context = 'Unknown', userMessage = null) {
        // Log détaillé
        logger.error(`Error in ${context}`, {
            message: error.message,
            stack: error.stack,
            context: context
        }, context);
        
        // Message utilisateur approprié
        const displayMessage = userMessage || this.getContextualErrorMessage(context, error);
        
        // Affichage non-bloquant
        this.showUserFriendlyError(displayMessage);
        
        // Tentative de récupération automatique
        this.attemptAutoRecovery(context, error);
        
        // Metrics pour analytics
        this.recordErrorMetrics(context, error);
    }
    
    static getContextualErrorMessage(context, error) {
        const messages = {
            'DataManager': 'Data save error. Your changes might be lost.',
            'AuthManager': 'Authentication problem. Please log in again.',
            'TimeTracker': 'Time tracking error. Check your recent entries.',
            'BillingManager': 'Billing error. Contact administrator.',
            'UIManager': 'Interface error. Reload page if problem persists.',
            'ClientManager': 'Client management error. Please try again.',
            'MatterManager': 'Matter management error. Please try again.',
            'DocumentManager': 'Document error. Please try again.'
        };
        
        return messages[context] || 'An unexpected error occurred.';
    }
    
    static showUserFriendlyError(message) {
        if (window.notificationManager) {
            window.notificationManager.showError(message);
        } else {
            // Fallback robuste
            this.showFallbackError(message);
        }
    }
    
    static showFallbackError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast-fallback';
        errorDiv.innerHTML = `
            <div style="
                position: fixed; top: 20px; right: 20px; z-index: 10000;
                background: #dc3545; color: white; padding: 15px; border-radius: 5px;
                max-width: 300px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                font-family: Arial, sans-serif; font-size: 14px;
            ">
                <strong>⚠️ Error</strong><br>
                ${DataValidator.sanitizeHtml(message)}
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="float: right; background: transparent; border: none; color: white; cursor: pointer; margin-left: 10px;">✕</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    static attemptAutoRecovery(context, error) {
        const recoveryStrategies = {
            'DataManager': () => {
                setTimeout(() => {
                    if (window.prometheus?.dataManager) {
                        window.prometheus.dataManager.loadFromStorage();
                        logger.info('Auto-recovery: DataManager reloaded from storage');
                    }
                }, 1000);
            },
            'AuthManager': () => {
                setTimeout(() => {
                    if (window.prometheus?.authManager) {
                        window.prometheus.authManager.restoreSession();
                        logger.info('Auto-recovery: AuthManager session restored');
                    }
                }, 1000);
            },
            'default': () => {
                setTimeout(() => {
                    if (window.prometheus?.dataManager) {
                        window.prometheus.dataManager.saveAllData();
                        logger.info('Auto-recovery: Preventive data save');
                    }
                }, 500);
            }
        };
        
        const strategy = recoveryStrategies[context] || recoveryStrategies.default;
        strategy();
    }
    
    static recordErrorMetrics(context, error) {
        try {
            const metrics = JSON.parse(sessionStorage.getItem('prometheus_error_metrics') || '{}');
            
            if (!metrics[context]) {
                metrics[context] = { count: 0, lastError: null };
            }
            
            metrics[context].count++;
            metrics[context].lastError = Date.now();
            
            sessionStorage.setItem('prometheus_error_metrics', JSON.stringify(metrics));
        } catch (e) {
            logger.warn('Failed to record error metrics', e);
        }
    }
    
    static getErrorMetrics() {
        try {
            return JSON.parse(sessionStorage.getItem('prometheus_error_metrics') || '{}');
        } catch (e) {
            return {};
        }
    }
    
    static clearErrorMetrics() {
        sessionStorage.removeItem('prometheus_error_metrics');
    }
}

// ========================================
// APPLICATION PRINCIPALE CORRIGÉE
// ========================================

class PrometheusApplication {
    constructor() {
        this.isInitialized = false;
        this.dataManager = null;
        this.authManager = null;
        this.uiManager = null;
        this.searchManager = null;
        this.timeTracker = null;
        this.clientManager = null;
        this.matterManager = null;
        this.billingManager = null;
        this.documentManager = null;
        this.analyticsManager = null;
        this.currentUser = null;
        
        // Application state
        this.state = {
            activeSection: 'dashboard',
            unsavedChanges: false,
            isOnline: navigator.onLine,
            performance: {
                startTime: Date.now(),
                loadTime: null,
                initErrors: []
            },
            lastBackup: null,
            lastAutoSave: null
        };
        
        // Configuration environnement
        this.config = APP_CONFIG;
        
        // Event listeners pour lifecycle
        this.setupApplicationEventListeners();
        
        logger.info('PrometheusApplication instance created', this.state);
    }
    
    /**
     * Point d'entrée principal - Initialize the entire Prometheus application
     */
    static async initialize() {
        try {
            logger.info('Starting Prometheus initialization');
            
            // Vérifications préliminaires
            if (!PrometheusApplication.checkBrowserCompatibility()) {
                throw new Error('Browser not compatible with Prometheus');
            }
            
            // Créer instance singleton
            if (!window.prometheus) {
                window.prometheus = new PrometheusApplication();
            }
            
            const app = window.prometheus;
            
            // Initialisation séquentielle avec gestion d'erreurs
            await app.initializeCore();
            await app.initializeManagers();
            await app.checkAuthentication();
            await app.initializeUserInterface();
            await app.loadApplicationData();
            
            // Setup final
            app.registerKeyboardShortcuts();
            app.startBackgroundServices();
            
            // Marquer comme initialisé
            app.isInitialized = true;
            app.state.performance.loadTime = Date.now() - app.state.performance.startTime;
            
            logger.info('Prometheus initialized successfully', {
                loadTime: app.state.performance.loadTime,
                errors: app.state.performance.initErrors.length
            });
            
            // Annoncer aux screen readers
            if (window.ScreenReaderManager) {
                ScreenReaderManager.announce('Prometheus application loaded successfully');
            }
            
            return app;
            
        } catch (error) {
            logger.error('Critical: Prometheus initialization failed', error);
            ErrorManager.handleError(error, 'PrometheusApplication.initialize', 
                'Application failed to start. Please refresh the page.');
            throw error;
        }
    }
    
    /**
     * Vérifications de compatibilité navigateur
     */
    static checkBrowserCompatibility() {
        const requiredFeatures = [
            'localStorage',
            'JSON',
            'Promise',
            'fetch'
        ];
        
        for (const feature of requiredFeatures) {
            if (!window[feature]) {
                logger.error(`Missing required feature: ${feature}`);
                return false;
            }
        }
        
        // Vérifier version minimum
        const isModernBrowser = (
            'requestAnimationFrame' in window &&
            'addEventListener' in window &&
            'querySelectorAll' in document
        );
        
        if (!isModernBrowser) {
            logger.error('Browser too old for Prometheus');
            return false;
        }
        
        return true;
    }
    
    /**
     * Initialisation du core système
     */
    async initializeCore() {
        try {
            logger.info('Initializing core systems');
            
            // Initialiser les handlers d'erreurs globaux
            this.setupGlobalErrorHandlers();
            
            // Initialiser la configuration
            this.loadConfiguration();
            
            // Vérifier l'état du stockage
            this.checkStorageHealth();
            
            logger.info('Core systems initialized');
            
        } catch (error) {
            this.state.performance.initErrors.push('Core initialization failed');
            logger.error('Core initialization failed', error);
            throw error;
        }
    }
    
    /**
     * Initialiser tous les managers - ORDRE CRITIQUE RESPECTÉ
     */
    async initializeManagers() {
        try {
            logger.info('Initializing managers');
            
            // 1. DataManager d'abord (aucune dépendance)
            logger.debug('Initializing DataManager');
            this.dataManager = new DataManager();
            await this.dataManager.initialize();
            
            // 2. AuthManager ensuite (dépend de DataManager)
            logger.debug('Initializing AuthManager');
            
            // Vérifier que AuthManager est disponible
            if (typeof AuthManager === 'undefined') {
                logger.error('AuthManager class not found - check if prometheus-auth.js loaded correctly');
                throw new Error('AuthManager class not available');
            }
            
            this.authManager = new AuthManager(this.dataManager);
            await this.authManager.initialize();
            
            // 3. Vérifier que les autres classes sont disponibles avant de les instancier
            logger.debug('Initializing business managers');
            
            // Initialiser seulement les managers qui sont disponibles
            if (typeof SearchManager !== 'undefined') {
                this.searchManager = new SearchManager(this);
            } else {
                logger.warn('SearchManager not available');
            }
            
            if (typeof TimeTracker !== 'undefined') {
                this.timeTracker = new TimeTracker(this);
            } else {
                logger.warn('TimeTracker not available');
            }
            
            if (typeof ClientManager !== 'undefined') {
                this.clientManager = new ClientManager(this);
            } else {
                logger.warn('ClientManager not available');
            }
            
            if (typeof MatterManager !== 'undefined') {
                this.matterManager = new MatterManager(this);
            } else {
                logger.warn('MatterManager not available');
            }
            
            if (typeof BillingManager !== 'undefined') {
                this.billingManager = new BillingManager(this);
            } else {
                logger.warn('BillingManager not available');
            }
            
            if (typeof DocumentManager !== 'undefined') {
                this.documentManager = new DocumentManager(this);
            } else {
                logger.warn('DocumentManager not available');
            }
            
            if (typeof AnalyticsManager !== 'undefined') {
                this.analyticsManager = new AnalyticsManager(this);
            } else {
                logger.warn('AnalyticsManager not available');
            }
            
            // 4. UIManager en dernier (dépend de tous les autres)
            logger.debug('Initializing UIManager');
            
            if (typeof UIManager !== 'undefined') {
                this.uiManager = new UIManager(this);
                if (this.uiManager.initialize) {
                    await this.uiManager.initialize();
                }
            } else {
                logger.warn('UIManager not available');
            }
            
            // Exposer les managers globalement pour onClick handlers
            this.exposeGlobalManagers();
            
            logger.info('All available managers initialized successfully');
            
        } catch (error) {
            this.state.performance.initErrors.push('Manager initialization failed');
            logger.error('Manager initialization failed', error);
            throw error;
        }
    }
    
    /**
     * Vérifier l'authentification et afficher login si nécessaire
     */
    async checkAuthentication() {
        try {
            logger.debug('Checking authentication status');
            
            if (!this.authManager.isLoggedIn()) {
                logger.info('User not authenticated, showing login');
                await this.showLoginScreen();
            } else {
                this.currentUser = this.authManager.getCurrentUser();
                logger.info('User authenticated', { userId: this.currentUser?.id });
            }
            
        } catch (error) {
            this.state.performance.initErrors.push('Authentication check failed');
            logger.error('Authentication check failed', error);
            // Ne pas lancer l'erreur ici, continuer avec l'écran de login
            await this.showLoginScreen();
        }
    }
    
    /**
     * Afficher l'écran de login
     */
    async showLoginScreen() {
        try {
            // Créer l'interface d'authentification si elle n'existe pas
            if (!window.authUI && typeof AuthUI !== 'undefined') {
                window.authUI = new AuthUI(this.authManager, this);
            }
            
            if (window.authUI && typeof window.authUI.showLoginScreen === 'function') {
                window.authUI.showLoginScreen();
            } else {
                logger.warn('AuthUI not available, showing fallback login');
                this.showFallbackLogin();
            }
            
        } catch (error) {
            logger.error('Failed to show login screen', error);
            this.showFallbackLogin();
        }
    }
    
    /**
     * Login de secours basique
     */
    showFallbackLogin() {
        const loginPrompt = prompt('Username (default: admin):') || 'admin';
        if (loginPrompt) {
            const passwordPrompt = prompt('Password (default: admin123):') || 'admin123';
            if (passwordPrompt) {
                this.authManager.login(loginPrompt, passwordPrompt)
                    .then(() => {
                        this.currentUser = this.authManager.getCurrentUser();
                        logger.info('Fallback login successful');
                    })
                    .catch(error => {
                        logger.error('Fallback login failed', error);
                        alert('Login failed: ' + error.message);
                    });
            }
        }
    }
    
    /**
     * Initialiser l'interface utilisateur
     */
    async initializeUserInterface() {
        try {
            logger.debug('Initializing UI components');
            
            // Initialiser les managers d'interface
            if (typeof NavigationManager !== 'undefined') {
                window.navigationManager = new NavigationManager(this);
            }
            
            if (typeof KeyboardManager !== 'undefined') {
                window.keyboardManager = new KeyboardManager(this);
            }
            
            if (typeof NotificationManager !== 'undefined') {
                window.notificationManager = new NotificationManager();
            }
            
            if (typeof ScreenReaderManager !== 'undefined') {
                window.screenReaderManager = new ScreenReaderManager();
            }
            
            logger.info('UI components initialized');
            
        } catch (error) {
            this.state.performance.initErrors.push('UI initialization failed');
            logger.error('UI initialization failed', error);
            throw error;
        }
    }
    
    /**
     * Charger toutes les données de l'application
     */
    async loadApplicationData() {
        try {
            logger.debug('Loading application data');
            
            // Charger les données en parallèle pour de meilleures performances
            const loadPromises = [];
            
            if (this.clientManager) {
                loadPromises.push(this.clientManager.loadClients().catch(e => logger.warn('Client loading failed', e)));
            }
            
            if (this.matterManager) {
                loadPromises.push(this.matterManager.loadMatters().catch(e => logger.warn('Matter loading failed', e)));
            }
            
            if (this.timeTracker) {
                loadPromises.push(this.timeTracker.loadTimeEntries().catch(e => logger.warn('Time entries loading failed', e)));
            }
            
            if (this.billingManager) {
                loadPromises.push(this.billingManager.loadBillingData().catch(e => logger.warn('Billing data loading failed', e)));
            }
            
            if (this.documentManager) {
                loadPromises.push(this.documentManager.loadDocuments().catch(e => logger.warn('Documents loading failed', e)));
            }
            
            // Attendre toutes les promesses (même si certaines échouent)
            await Promise.allSettled(loadPromises);
            
            // Mettre à jour le dashboard
            this.updateDashboard();
            
            logger.info('Application data loaded');
            
        } catch (error) {
            this.state.performance.initErrors.push('Data loading failed');
            logger.error('Data loading failed', error);
            // Ne pas lancer l'erreur, permettre à l'app de démarrer
        }
    }
    
    /**
     * Enregistrer les raccourcis clavier globaux
     */
    registerKeyboardShortcuts() {
        try {
            logger.debug('Registering keyboard shortcuts');
            
            document.addEventListener('keydown', (event) => {
                // Ignorer si l'utilisateur tape dans un champ
                if (this.isTypingInInput(event.target)) {
                    return;
                }
                
                const { key, ctrlKey, altKey, shiftKey } = event;
                
                // Raccourcis globaux de navigation
                if (ctrlKey) {
                    switch (key.toLowerCase()) {
                        case 'd':
                            event.preventDefault();
                            if (window.navigationManager) {
                                window.navigationManager.showSection('dashboard');
                            }
                            break;
                        case 'r':
                            event.preventDefault();
                            if (this.searchManager) {
                                this.searchManager.showGlobalSearch();
                            }
                            break;
                        case 'n':
                            event.preventDefault();
                            if (shiftKey && this.matterManager) {
                                this.matterManager.showCreateForm();
                            } else {
                                this.showQuickCreateMenu();
                            }
                            break;
                        case 't':
                            event.preventDefault();
                            if (this.timeTracker) {
                                this.timeTracker.toggleTimer();
                            }
                            break;
                        case 's':
                            event.preventDefault();
                            this.dataManager.saveAllData();
                            if (window.notificationManager) {
                                window.notificationManager.showSuccess('Data saved successfully');
                            }
                            break;
                    }
                }
                
                // Raccourcis Alt
                if (altKey) {
                    switch (key.toLowerCase()) {
                        case 'c':
                            event.preventDefault();
                            if (window.navigationManager) {
                                window.navigationManager.showSection('clients');
                            }
                            break;
                        case 'm':
                            event.preventDefault();
                            if (window.navigationManager) {
                                window.navigationManager.showSection('matters');
                            }
                            break;
                        case 'd':
                            event.preventDefault();
                            if (window.navigationManager) {
                                window.navigationManager.showSection('documents');
                            }
                            break;
                        case 'a':
                            event.preventDefault();
                            if (window.navigationManager) {
                                window.navigationManager.showSection('analytics');
                            }
                            break;
                    }
                }
                
                // Touches de fonction
                switch (key) {
                    case 'F5':
                        event.preventDefault();
                        this.refreshApplication();
                        break;
                    case 'Escape':
                        this.handleEscapeKey();
                        break;
                }
            });
            
            logger.debug('Keyboard shortcuts registered');
            
        } catch (error) {
            logger.warn('Failed to register keyboard shortcuts', error);
        }
    }
    
    /**
     * Démarrer les services en arrière-plan
     */
    startBackgroundServices() {
        try {
            logger.debug('Starting background services');
            
            // Auto-sauvegarde
            this.startAutoSave();
            
            // Sauvegarde de sécurité
            this.startAutoBackup();
            
            // Nettoyage périodique
            this.startPeriodicCleanup();
            
            // Monitoring de santé
            this.startHealthMonitoring();
            
            logger.info('Background services started');
            
        } catch (error) {
            logger.warn('Failed to start some background services', error);
        }
    }
    
    /**
     * Démarrer l'auto-sauvegarde
     */
    startAutoSave() {
        setInterval(() => {
            try {
                if (this.state.unsavedChanges && this.dataManager) {
                    this.dataManager.saveAllData();
                    this.state.unsavedChanges = false;
                    this.state.lastAutoSave = Date.now();
                    logger.debug('Auto-save completed');
                }
            } catch (error) {
                logger.warn('Auto-save failed', error);
            }
        }, this.config.autoSaveInterval);
    }
    
    /**
     * Démarrer la sauvegarde automatique
     */
    startAutoBackup() {
        setInterval(() => {
            try {
                if (this.dataManager) {
                    this.dataManager.createBackup();
                    this.state.lastBackup = Date.now();
                    logger.debug('Auto-backup completed');
                }
            } catch (error) {
                logger.warn('Auto-backup failed', error);
            }
        }, this.config.backupInterval);
    }
    
    /**
     * Nettoyage périodique
     */
    startPeriodicCleanup() {
        setInterval(() => {
            try {
                // Nettoyer les logs anciens
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours
                const cutoff = Date.now() - maxAge;
                
                logger.logs = logger.logs.filter(log => 
                    new Date(log.timestamp).getTime() > cutoff
                );
                
                // Nettoyer les métriques d'erreurs
                const errorMetrics = ErrorManager.getErrorMetrics();
                Object.keys(errorMetrics).forEach(context => {
                    if (errorMetrics[context].lastError < cutoff) {
                        delete errorMetrics[context];
                    }
                });
                
                logger.debug('Periodic cleanup completed');
                
            } catch (error) {
                logger.warn('Periodic cleanup failed', error);
            }
        }, 60 * 60 * 1000); // Chaque heure
    }
    
    /**
     * Monitoring de santé
     */
    startHealthMonitoring() {
        setInterval(() => {
            try {
                const health = this.getApplicationHealth();
                
                if (health.status === 'critical') {
                    logger.error('Application health critical', health);
                    
                    if (window.notificationManager) {
                        window.notificationManager.showError(
                            'Application health issues detected. Some features may not work properly.'
                        );
                    }
                } else if (health.status === 'warning') {
                    logger.warn('Application health warning', health);
                }
                
            } catch (error) {
                logger.warn('Health monitoring failed', error);
            }
        }, 5 * 60 * 1000); // Toutes les 5 minutes
    }
    
    /**
     * Obtenir l'état de santé de l'application
     */
    getApplicationHealth() {
        const health = {
            status: 'healthy',
            checks: {},
            timestamp: Date.now()
        };
        
        try {
            // Vérifier le stockage
            health.checks.storage = this.checkStorageHealth();
            
            // Vérifier les managers
            health.checks.managers = {
                dataManager: !!this.dataManager,
                authManager: !!this.authManager,
                uiManager: !!this.uiManager
            };
            
            // Vérifier les métriques d'erreur
            const errorMetrics = ErrorManager.getErrorMetrics();
            const totalErrors = Object.values(errorMetrics).reduce((sum, metric) => sum + metric.count, 0);
            health.checks.errors = {
                total: totalErrors,
                critical: totalErrors > 50
            };
            
            // Vérifier la mémoire
            health.checks.memory = {
                logEntries: logger.logs.length,
                maxReached: logger.logs.length >= this.config.logging.maxLogEntries
            };
            
            // Déterminer le statut global
            if (health.checks.errors.critical || !health.checks.storage.available) {
                health.status = 'critical';
            } else if (totalErrors > 10 || health.checks.memory.maxReached) {
                health.status = 'warning';
            }
            
        } catch (error) {
            health.status = 'critical';
            health.error = error.message;
        }
        
        return health;
    }
    
    /**
     * Vérifier la santé du stockage
     */
    checkStorageHealth() {
        try {
            const testKey = 'prometheus_storage_test';
            const testValue = Date.now().toString();
            
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            return {
                available: retrieved === testValue,
                quota: this.getStorageQuota()
            };
            
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }
    
    /**
     * Obtenir le quota de stockage
     */
    getStorageQuota() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                return navigator.storage.estimate();
            }
            
            // Estimation basique
            let used = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    used += localStorage[key].length;
                }
            }
            
            return Promise.resolve({
                usage: used,
                quota: 5 * 1024 * 1024 // 5MB estimé
            });
            
        } catch (error) {
            return Promise.resolve({ usage: 0, quota: 0 });
        }
    }
    
    /**
     * Setup des gestionnaires d'erreurs globaux
     */
    setupGlobalErrorHandlers() {
        // Erreurs JavaScript globales
        window.addEventListener('error', (event) => {
            ErrorManager.handleError(event.error || new Error(event.message), 
                'GlobalError', 'An unexpected error occurred');
        });
        
        // Promesses rejetées
        window.addEventListener('unhandledrejection', (event) => {
            ErrorManager.handleError(event.reason || new Error('Unhandled promise rejection'), 
                'UnhandledRejection', 'An operation failed unexpectedly');
        });
    }
    
    /**
     * Charger la configuration
     */
    loadConfiguration() {
        try {
            // Charger config utilisateur depuis localStorage
            const userConfig = localStorage.getItem('prometheus_user_config');
            if (userConfig) {
                const parsed = JSON.parse(userConfig);
                this.config = { ...this.config, ...parsed };
            }
            
            logger.debug('Configuration loaded', this.config);
            
        } catch (error) {
            logger.warn('Failed to load user configuration', error);
        }
    }
    
    /**
     * Listeners d'événements de l'application
     */
    setupApplicationEventListeners() {
        // Statut en ligne/hors ligne
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            logger.info('Back online');
            if (window.notificationManager) {
                window.notificationManager.showInfo('Back online');
            }
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            logger.warn('Gone offline');
            if (window.notificationManager) {
                window.notificationManager.showWarning('Working offline');
            }
        });
        
        // Changements de visibilité de page
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.dataManager) {
                    this.dataManager.saveAllData();
                }
                logger.debug('Page hidden, data saved');
            } else {
                this.refreshApplication();
                logger.debug('Page visible, data refreshed');
            }
        });
        
        // Avant déchargement de page
        window.addEventListener('beforeunload', (event) => {
            if (this.state.unsavedChanges) {
                event.preventDefault();
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                
                if (this.dataManager) {
                    this.dataManager.saveAllData();
                }
            }
        });
        
        // Monitoring de performances
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perf = performance.getEntriesByType('navigation')[0];
                if (perf && perf.loadEventEnd > 3000) {
                    logger.warn('Slow page load detected', { loadTime: perf.loadEventEnd });
                }
            }, 0);
        });
    }
    
    /**
     * Exposer les managers globalement pour les gestionnaires onClick
     */
    exposeGlobalManagers() {
        window.clientManager = this.clientManager;
        window.matterManager = this.matterManager;
        window.timeTracker = this.timeTracker;
        window.billingManager = this.billingManager;
        window.documentManager = this.documentManager;
        window.analyticsManager = this.analyticsManager;
        window.searchManager = this.searchManager;
        window.dataManager = this.dataManager;
        window.authManager = this.authManager;
    }
    
    /**
     * Mettre à jour le tableau de bord
     */
    updateDashboard() {
        try {
            if (!this.isInitialized) return;
            
            logger.debug('Updating dashboard');
            
            // Calculer les statistiques
            const stats = this.calculateDashboardStats();
            this.updateDashboardStats(stats);
            
            // Mettre à jour les activités récentes
            this.updateRecentActivities();
            
            // Mettre à jour les widgets
            this.updateDashboardWidgets();
            
        } catch (error) {
            logger.warn('Dashboard update failed', error);
        }
    }
    
    /**
     * Calculer les statistiques du tableau de bord
     */
    calculateDashboardStats() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        const stats = {
            totalClients: 0,
            totalMatters: 0,
            monthlyHours: 0,
            monthlyRevenue: 0
        };
        
        try {
            // Clients actifs
            if (this.clientManager) {
                stats.totalClients = this.clientManager.getActiveClients().length;
            }
            
            // Matters actifs
            if (this.matterManager) {
                stats.totalMatters = this.matterManager.getActiveMatters().length;
            }
            
            // Heures et revenus du mois
            if (this.timeTracker) {
                const monthlyTimeEntries = this.timeTracker.getTimeEntriesForPeriod(
                    new Date(currentYear, currentMonth, 1),
                    new Date(currentYear, currentMonth + 1, 0)
                );
                
                stats.monthlyHours = monthlyTimeEntries.reduce((sum, entry) => sum + entry.duration, 0) / 3600000;
                stats.monthlyRevenue = monthlyTimeEntries.reduce((sum, entry) => sum + entry.value, 0);
            }
            
        } catch (error) {
            logger.warn('Failed to calculate dashboard stats', error);
        }
        
        return stats;
    }
    
    /**
     * Mettre à jour l'affichage des statistiques du tableau de bord
     */
    updateDashboardStats(stats) {
        const elements = {
            totalClients: stats.totalClients,
            totalMatters: stats.totalMatters,
            totalHours: stats.monthlyHours.toFixed(1),
            totalRevenue: this.formatCurrency(stats.monthlyRevenue)
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.setAttribute('aria-label', `${id.replace('total', '')}: ${value}`);
            }
        });
    }
    
    /**
     * Mettre à jour les activités récentes
     */
    updateRecentActivities() {
        try {
            const activities = this.getRecentActivities();
            const container = document.getElementById('recentActivitiesList');
            
            if (container && activities.length > 0) {
                container.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <span class="activity-icon">${activity.icon}</span>
                        <div class="activity-content">
                            <span class="activity-description">${DataValidator.sanitizeHtml(activity.description)}</span>
                            <span class="activity-time">${this.formatRelativeTime(activity.timestamp)}</span>
                        </div>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            logger.warn('Failed to update recent activities', error);
        }
    }
    
    /**
     * Obtenir les activités récentes
     */
    getRecentActivities() {
        const activities = [];
        
        try {
            // Matters récents
            if (this.matterManager) {
                const recentMatters = this.matterManager.getRecentMatters(3);
                recentMatters.forEach(matter => {
                    activities.push({
                        icon: '⚖️',
                        description: `Created matter: ${matter.title}`,
                        timestamp: matter.createdAt,
                        type: 'matter'
                    });
                });
            }
            
            // Entrées de temps récentes
            if (this.timeTracker) {
                const recentTimeEntries = this.timeTracker.getRecentTimeEntries(3);
                recentTimeEntries.forEach(entry => {
                    activities.push({
                        icon: '⏱️',
                        description: `Logged ${this.formatDuration(entry.duration)} on ${entry.matterCode}`,
                        timestamp: entry.createdAt,
                        type: 'time'
                    });
                });
            }
            
            // Factures récentes
            if (this.billingManager) {
                const recentInvoices = this.billingManager.getRecentInvoices(2);
                recentInvoices.forEach(invoice => {
                    activities.push({
                        icon: '💰',
                        description: `Generated invoice ${invoice.number}`,
                        timestamp: invoice.createdAt,
                        type: 'invoice'
                    });
                });
            }
            
        } catch (error) {
            logger.warn('Failed to get recent activities', error);
        }
        
        // Trier par timestamp et retourner les 10 derniers
        return activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
    }
    
    /**
     * Mettre à jour les widgets du tableau de bord
     */
    updateDashboardWidgets() {
        try {
            if (this.matterManager) {
                this.matterManager.updateRecentMattersWidget();
            }
            
            if (this.timeTracker) {
                this.timeTracker.updateTodayTimeWidget();
            }
            
        } catch (error) {
            logger.warn('Failed to update dashboard widgets', error);
        }
    }
    
    /**
     * Rafraîchir toute l'application
     */
    async refreshApplication() {
        try {
            logger.info('Refreshing application');
            
            if (window.notificationManager) {
                window.notificationManager.showInfo('Refreshing application...');
            }
            
            // Recharger toutes les données
            await this.loadApplicationData();
            
            // Mettre à jour l'interface
            this.updateDashboard();
            
            // Rafraîchir la section actuelle
            const currentSection = this.state.activeSection;
            if (window.navigationManager) {
                window.navigationManager.showSection(currentSection);
            }
            
            if (window.notificationManager) {
                window.notificationManager.showSuccess('Application refreshed');
            }
            
            logger.info('Application refreshed successfully');
            
        } catch (error) {
            logger.error('Application refresh failed', error);
            if (window.notificationManager) {
                window.notificationManager.showError('Failed to refresh application');
            }
        }
    }
    
    /**
     * Afficher le menu de création rapide
     */
    showQuickCreateMenu() {
        try {
            const menu = document.createElement('div');
            menu.className = 'quick-create-menu';
            menu.innerHTML = `
                <div class="quick-menu-overlay" onclick="this.parentElement.remove()"></div>
                <div class="quick-menu-content">
                    <h4>Quick Create</h4>
                    <button onclick="clientManager.showCreateForm(); this.closest('.quick-create-menu').remove();">
                        <span>👥</span> New Client
                    </button>
                    <button onclick="matterManager.showCreateForm(); this.closest('.quick-create-menu').remove();">
                        <span>⚖️</span> New Matter
                    </button>
                    <button onclick="timeTracker.startTimer(); this.closest('.quick-create-menu').remove();">
                        <span>⏱️</span> Start Timer
                    </button>
                    <button onclick="billingManager.generateInvoice(); this.closest('.quick-create-menu').remove();">
                        <span>💰</span> New Invoice
                    </button>
                    <button onclick="documentManager.showUploadForm(); this.closest('.quick-create-menu').remove();">
                        <span>📁</span> Upload Document
                    </button>
                </div>
            `;
            
            document.body.appendChild(menu);
            
            // Auto-suppression après 10 secondes
            setTimeout(() => {
                if (menu.parentElement) {
                    menu.remove();
                }
            }, 10000);
            
        } catch (error) {
            logger.warn('Failed to show quick create menu', error);
        }
    }
    
    /**
     * Vérifier si l'utilisateur tape dans un champ de saisie
     */
    isTypingInInput(target) {
        const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
        return inputTags.includes(target.tagName) || target.contentEditable === 'true';
    }
    
    /**
     * Gérer la touche Escape
     */
    handleEscapeKey() {
        const openModals = document.querySelectorAll('.form-container:not([style*="display: none"]), .search-modal:not([style*="display: none"])');
        
        if (openModals.length > 0) {
            openModals.forEach(modal => {
                if (modal.id === 'globalSearchModal' && this.searchManager) {
                    this.searchManager.hideGlobalSearch();
                } else {
                    modal.style.display = 'none';
                }
            });
        }
    }
    
    /**
     * Formater les valeurs monétaires
     */
    formatCurrency(amount, currency = this.config.defaultCurrency) {
        try {
            const formatter = new Intl.NumberFormat(this.config.locale, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });
            
            return formatter.format(amount);
            
        } catch (error) {
            logger.warn('Currency formatting failed', error);
            return `${this.config.currencySymbols[currency] || '$'}${amount.toFixed(2)}`;
        }
    }
    
    /**
     * Formater la durée en millisecondes
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        } else {
            return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
        }
    }
    
    /**
     * Formater le temps relatif
     */
    formatRelativeTime(timestamp) {
        try {
            const rtf = new Intl.RelativeTimeFormat(this.config.locale, { numeric: 'auto' });
            const now = Date.now();
            const diff = now - new Date(timestamp).getTime();
            
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) {
                return rtf.format(-days, 'day');
            } else if (hours > 0) {
                return rtf.format(-hours, 'hour');
            } else if (minutes > 0) {
                return rtf.format(-minutes, 'minute');
            } else {
                return rtf.format(-seconds, 'second');
            }
            
        } catch (error) {
            logger.warn('Relative time formatting failed', error);
            return new Date(timestamp).toLocaleString();
        }
    }
    
    /**
     * Générer un ID unique
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * Échapper le HTML pour éviter XSS
     */
    escapeHtml(text) {
        return DataValidator.sanitizeHtml(text);
    }
    
    /**
     * Marquer l'application comme ayant des changements non sauvegardés
     */
    markUnsavedChanges() {
        this.state.unsavedChanges = true;
    }
    
    /**
     * Obtenir les informations de l'application
     */
    getApplicationInfo() {
        return {
            name: this.config.name,
            version: this.config.version,
            isInitialized: this.isInitialized,
            currentUser: this.currentUser?.name || 'Not logged in',
            activeSection: this.state.activeSection,
            isOnline: this.state.isOnline,
            loadTime: this.state.performance.loadTime,
            initErrors: this.state.performance.initErrors,
            health: this.getApplicationHealth(),
            dataStats: {
                clients: this.clientManager?.getClientCount() || 0,
                matters: this.matterManager?.getMatterCount() || 0,
                timeEntries: this.timeTracker?.getTimeEntryCount() || 0,
                invoices: this.billingManager?.getInvoiceCount() || 0,
                documents: this.documentManager?.getDocumentCount() || 0
            },
            errorMetrics: ErrorManager.getErrorMetrics(),
            logs: logger.getLogs('ERROR')
        };
    }
    
    /**
     * Gérer les erreurs de l'application de manière centralisée
     */
    handleError(error, context = 'Unknown') {
        ErrorManager.handleError(error, context);
    }
}

// ========================================
// DATA MANAGER AMÉLIORÉ
// ========================================

class DataManager {
    constructor() {
        this.storage = {
            clients: [],
            matters: [],
            timeEntries: [],
            invoices: [],
            documents: [],
            settings: {},
            backups: []
        };
        
        this.isInitialized = false;
        this.saveInProgress = false;
        this.lastSaveTime = null;
    }
    
    async initialize() {
        try {
            logger.info('Initializing DataManager');
            
            // Vérifier la compatibilité du stockage
            this.checkStorageSupport();
            
            // Charger les données depuis localStorage
            this.loadFromStorage();
            
            // Nettoyer les anciennes sauvegardes
            this.cleanOldBackups();
            
            // Valider l'intégrité des données
            this.validateDataIntegrity();
            
            this.isInitialized = true;
            logger.info('DataManager initialized successfully');
            
        } catch (error) {
            logger.error('DataManager initialization failed', error);
            throw error;
        }
    }
    
    checkStorageSupport() {
        if (typeof Storage === 'undefined') {
            throw new Error('Browser does not support localStorage');
        }
        
        // Test d'écriture
        try {
            const testKey = 'prometheus_storage_test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
        } catch (error) {
            throw new Error('localStorage is not writable');
        }
    }
    
    loadFromStorage() {
        try {
            const keys = ['clients', 'matters', 'timeEntries', 'invoices', 'documents', 'settings', 'users', 'sessions'];
            
            keys.forEach(key => {
                try {
                    const data = localStorage.getItem(`prometheus_${key}`);
                    if (data) {
                        this.storage[key] = JSON.parse(data);
                        logger.debug(`Loaded ${key}`, { count: Array.isArray(this.storage[key]) ? this.storage[key].length : 'N/A' });
                    } else {
                        // Initialiser avec un tableau vide pour les collections
                        if (['clients', 'matters', 'timeEntries', 'invoices', 'documents', 'users', 'sessions'].includes(key)) {
                            this.storage[key] = [];
                        } else {
                            this.storage[key] = {};
                        }
                    }
                } catch (parseError) {
                    logger.warn(`Failed to parse ${key} from storage`, parseError);
                    // Réinitialiser avec des valeurs par défaut
                    if (['clients', 'matters', 'timeEntries', 'invoices', 'documents', 'users', 'sessions'].includes(key)) {
                        this.storage[key] = [];
                    } else {
                        this.storage[key] = {};
                    }
                }
            });
            
            logger.info('Data loaded from storage successfully');
            
        } catch (error) {
            logger.error('Failed to load data from storage', error);
            this.initializeEmptyStorage();
        }
    }
    
    initializeEmptyStorage() {
        this.storage = {
            clients: [],
            matters: [],
            timeEntries: [],
            invoices: [],
            documents: [],
            users: [],
            sessions: [],
            settings: {},
            backups: []
        };
        
        logger.info('Initialized empty storage structure');
    }
    
    // Méthode helper pour AuthManager
    save(key, data) {
        try {
            this.storage[key] = data;
            this.saveToStorage(key);
            return true;
        } catch (error) {
            logger.error(`Failed to save ${key}`, error);
            return false;
        }
    }
    
    // Méthode helper pour AuthManager
    load(key, defaultValue = null) {
        try {
            return this.storage[key] || defaultValue;
        } catch (error) {
            logger.error(`Failed to load ${key}`, error);
            return defaultValue;
        }
    }
    
    validateDataIntegrity() {
        try {
            let hasCorruption = false;
            
            // Valider les clients
            if (Array.isArray(this.storage.clients)) {
                this.storage.clients = this.storage.clients.filter(client => {
                    const validation = DataValidator.validateClient(client);
                    if (!validation.isValid) {
                        logger.warn('Invalid client data found', { clientId: client.id, errors: validation.errors });
                        hasCorruption = true;
                        return false;
                    }
                    return true;
                });
            }
            
            // Valider les matters
            if (Array.isArray(this.storage.matters)) {
                this.storage.matters = this.storage.matters.filter(matter => {
                    const validation = DataValidator.validateMatter(matter);
                    if (!validation.isValid) {
                        logger.warn('Invalid matter data found', { matterId: matter.id, errors: validation.errors });
                        hasCorruption = true;
                        return false;
                    }
                    return true;
                });
            }
            
            // Valider les time entries
            if (Array.isArray(this.storage.timeEntries)) {
                this.storage.timeEntries = this.storage.timeEntries.filter(entry => {
                    const validation = DataValidator.validateTimeEntry(entry);
                    if (!validation.isValid) {
                        logger.warn('Invalid time entry data found', { entryId: entry.id, errors: validation.errors });
                        hasCorruption = true;
                        return false;
                    }
                    return true;
                });
            }
            
            if (hasCorruption) {
                logger.warn('Data corruption detected and cleaned');
                this.saveAllData(); // Sauvegarder les données nettoyées
            }
            
        } catch (error) {
            logger.error('Data integrity validation failed', error);
        }
    }
    
    saveToStorage(key = null) {
        if (this.saveInProgress) {
            logger.debug('Save already in progress, skipping');
            return;
        }
        
        try {
            this.saveInProgress = true;
            
            if (key) {
                localStorage.setItem(`prometheus_${key}`, JSON.stringify(this.storage[key]));
                logger.debug(`Saved ${key} to storage`);
            } else {
                // Sauvegarder toutes les données
                Object.keys(this.storage).forEach(k => {
                    if (k !== 'backups') {
                        localStorage.setItem(`prometheus_${k}`, JSON.stringify(this.storage[k]));
                    }
                });
                logger.debug('Saved all data to storage');
            }
            
            this.lastSaveTime = Date.now();
            
        } catch (error) {
            logger.error('Failed to save data to storage', error);
            throw error;
        } finally {
            this.saveInProgress = false;
        }
    }
    
    saveAllData() {
        this.saveToStorage();
    }
    
    createBackup() {
        try {
            const backup = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                version: APP_CONFIG.version,
                data: {
                    clients: [...this.storage.clients],
                    matters: [...this.storage.matters],
                    timeEntries: [...this.storage.timeEntries],
                    invoices: [...this.storage.invoices],
                    documents: [...this.storage.documents],
                    settings: { ...this.storage.settings }
                }
            };
            
            this.storage.backups.push(backup);
            
            // Garder seulement les X dernières sauvegardes
            if (this.storage.backups.length > APP_CONFIG.maxBackups) {
                this.storage.backups = this.storage.backups.slice(-APP_CONFIG.maxBackups);
            }
            
            localStorage.setItem('prometheus_backups', JSON.stringify(this.storage.backups));
            
            logger.info('Backup created successfully', { backupId: backup.id });
            
        } catch (error) {
            logger.error('Failed to create backup', error);
            throw error;
        }
    }
    
    loadFromBackup(backupId = null) {
        try {
            const backups = JSON.parse(localStorage.getItem('prometheus_backups') || '[]');
            
            if (backups.length === 0) {
                throw new Error('No backups available');
            }
            
            const backup = backupId 
                ? backups.find(b => b.id === backupId)
                : backups[backups.length - 1]; // Dernière sauvegarde
            
            if (!backup) {
                throw new Error('Backup not found');
            }
            
            this.storage = { ...backup.data, backups: backups };
            this.saveAllData();
            
            logger.info('Data restored from backup', { backupId: backup.id });
            
            if (window.notificationManager) {
                window.notificationManager.showSuccess('Data restored from backup');
            }
            
        } catch (error) {
            logger.error('Failed to load from backup', error);
            throw error;
        }
    }
    
    cleanOldBackups() {
        try {
            const backups = JSON.parse(localStorage.getItem('prometheus_backups') || '[]');
            const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            const cleanedBackups = backups.filter(backup => backup.id > oneWeekAgo);
            
            if (cleanedBackups.length !== backups.length) {
                localStorage.setItem('prometheus_backups', JSON.stringify(cleanedBackups));
                logger.info(`Cleaned ${backups.length - cleanedBackups.length} old backups`);
            }
            
        } catch (error) {
            logger.warn('Failed to clean old backups', error);
        }
    }
    
    // ========================================
    // OPÉRATIONS CRUD AVEC VALIDATION
    // ========================================
    
    create(type, data) {
        try {
            // Valider les données selon le type
            const validation = this.validateDataByType(type, data);
            if (!validation.isValid) {
                throw new Error(`Invalid ${type} data: ${validation.errors.join(', ')}`);
            }
            
            const item = {
                id: this.generateId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...data
            };
            
            this.storage[type].push(item);
            this.saveToStorage(type);
            
            if (window.prometheus) {
                window.prometheus.markUnsavedChanges();
            }
            
            logger.debug(`Created ${type}`, { id: item.id });
            
            return item;
            
        } catch (error) {
            logger.error(`Failed to create ${type}`, error);
            throw error;
        }
    }
    
    read(type, id = null) {
        try {
            if (id) {
                return this.storage[type].find(item => item.id === id);
            }
            return [...this.storage[type]];
        } catch (error) {
            logger.error(`Failed to read ${type}`, error);
            return id ? null : [];
        }
    }
    
    update(type, id, data) {
        try {
            const index = this.storage[type].findIndex(item => item.id === id);
            if (index === -1) {
                throw new Error(`${type} with id ${id} not found`);
            }
            
            // Valider les nouvelles données
            const mergedData = { ...this.storage[type][index], ...data };
            const validation = this.validateDataByType(type, mergedData);
            if (!validation.isValid) {
                throw new Error(`Invalid ${type} data: ${validation.errors.join(', ')}`);
            }
            
            this.storage[type][index] = {
                ...this.storage[type][index],
                ...data,
                updatedAt: new Date().toISOString()
            };
            
            this.saveToStorage(type);
            
            if (window.prometheus) {
                window.prometheus.markUnsavedChanges();
            }
            
            logger.debug(`Updated ${type}`, { id: id });
            
            return this.storage[type][index];
            
        } catch (error) {
            logger.error(`Failed to update ${type}`, error);
            throw error;
        }
    }
    
    delete(type, id) {
        try {
            const index = this.storage[type].findIndex(item => item.id === id);
            if (index === -1) {
                throw new Error(`${type} with id ${id} not found`);
            }
            
            const deleted = this.storage[type].splice(index, 1)[0];
            this.saveToStorage(type);
            
            if (window.prometheus) {
                window.prometheus.markUnsavedChanges();
            }
            
            logger.debug(`Deleted ${type}`, { id: id });
            
            return deleted;
            
        } catch (error) {
            logger.error(`Failed to delete ${type}`, error);
            throw error;
        }
    }
    
    validateDataByType(type, data) {
        const validators = {
            clients: DataValidator.validateClient,
            matters: DataValidator.validateMatter,
            timeEntries: DataValidator.validateTimeEntry,
            users: DataValidator.validateUser
        };
        
        const validator = validators[type];
        if (validator) {
            return validator(data);
        }
        
        // Validation générique
        return { isValid: true, errors: [] };
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // ========================================
    // FONCTIONNALITÉS DE RECHERCHE
    // ========================================
    
    search(type, query, fields = []) {
        try {
            const items = this.storage[type];
            const searchTerm = query.toLowerCase().trim();
            
            if (!searchTerm) return items;
            
            return items.filter(item => {
                if (fields.length === 0) {
                    // Recherche dans tous les champs string
                    return Object.values(item).some(value => 
                        typeof value === 'string' && value.toLowerCase().includes(searchTerm)
                    );
                } else {
                    // Recherche dans les champs spécifiés uniquement
                    return fields.some(field => {
                        const value = item[field];
                        return typeof value === 'string' && value.toLowerCase().includes(searchTerm);
                    });
                }
            });
            
        } catch (error) {
            logger.warn(`Search failed for ${type}`, error);
            return [];
        }
    }
    
    // ========================================
    // STATISTIQUES ET EXPORT
    // ========================================
    
    getStats() {
        return {
            clients: this.storage.clients.length,
            matters: this.storage.matters.length,
            timeEntries: this.storage.timeEntries.length,
            invoices: this.storage.invoices.length,
            documents: this.storage.documents.length,
            backups: this.storage.backups.length,
            lastSave: this.lastSaveTime
        };
    }
    
    exportData(type = null, format = 'json') {
        try {
            const data = type ? this.storage[type] : this.storage;
            
            switch (format) {
                case 'json':
                    return JSON.stringify(data, null, 2);
                case 'csv':
                    return this.convertToCSV(data);
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
        } catch (error) {
            logger.error('Data export failed', error);
            throw error;
        }
    }
    
    convertToCSV(data) {
        if (!Array.isArray(data)) {
            throw new Error('CSV export requires array data');
        }
        
        if (data.length === 0) {
            return '';
        }
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(item => {
            const values = headers.map(header => {
                const value = item[header];
                if (typeof value === 'string') {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    refreshData() {
        this.loadFromStorage();
        logger.info('Data refreshed from storage');
    }
}

// ========================================
// CLASSES UTILITAIRES
// ========================================

class ScreenReaderManager {
    static announce(message) {
        const announcer = document.getElementById('srAnnouncements');
        if (announcer) {
            announcer.textContent = message;
            logger.debug('Screen reader announcement', { message });
            
            // Nettoyer après l'annonce
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }
}

// ========================================
// EXPOSITION GLOBALE (via namespace unique)
// ========================================

if (!window.prometheus) {
    window.prometheus = {
        PrometheusApplication,
        DataManager,
        ErrorManager,
        ScreenReaderManager,
        DataValidator,
        Logger,
        logger,
        APP_CONFIG,
        USER_ROLES,
        PRACTICE_AREAS,
        DOCUMENT_TYPES
    };
}

// ========================================
// GESTION D'ERREURS GLOBALES
// ========================================

window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    window.prometheus?.ErrorManager?.handleError?.(error, 'GlobalJavaScriptError');
});

window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || new Error('Unhandled promise rejection');
    window.prometheus?.ErrorManager?.handleError?.(reason, 'UnhandledPromiseRejection');
});

// ========================================
// LOGS EN MODE DÉVELOPPEMENT
// ========================================

if (window.prometheus.APP_CONFIG?.isDevelopment) {
    console.log('%cPrometheus Legal Management System', 'color: #4a9eff; font-size: 16px; font-weight: bold;');
    console.log('%cVersion 3.0.1 - Development Mode', 'color: #888; font-size: 12px;');
    console.log('%cBRDN Conseils', 'color: #4a9eff; font-size: 14px;');
    console.log('');
    console.log('Available global object: window.prometheus');
    console.log(Object.keys(window.prometheus).map(key => `- ${key}`).join('\n'));
}

// ========================================
// CONFIRMATION DE CHARGEMENT
// ========================================

window.prometheus?.logger?.info?.('Prometheus core module loaded successfully');