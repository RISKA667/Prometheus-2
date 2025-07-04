/**
 * PROMETHEUS - FOUNDATION LAYER
 * BRDN Conseils - Legal Management System
 * Version: 3.0.1
 * 
 * Ce fichier contient :
 * - Configuration globale
 * - Rôles et permissions
 * - Classes utilitaires (Validation, Logging, ErrorManager)
 * - Constantes et helpers de base
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
    backupInterval: 180000,  // 3 minutes
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
        permissions: ['all']
    },
    PARTNER: {
        id: 'partner',
        name: 'Partner',
        permissions: ['client_management', 'matter_management', 'billing', 'reporting', 'user_management']
    },
    SENIOR_ASSOCIATE: {
        id: 'senior_associate',
        name: 'Senior Associate',
        permissions: ['client_management', 'matter_management', 'billing', 'time_tracking']
    },
    ASSOCIATE: {
        id: 'associate',
        name: 'Associate',
        permissions: ['matter_management', 'time_tracking', 'document_management']
    },
    PARALEGAL: {
        id: 'paralegal',
        name: 'Paralegal',
        permissions: ['time_tracking', 'document_management', 'basic_client_access']
    },
    ADMIN: {
        id: 'admin',
        name: 'Administrative Assistant',
        permissions: ['billing', 'scheduling', 'basic_client_access']
    }
};

const PRACTICE_AREAS = {
    CORPORATE: {
        id: 'corporate',
        name: 'Corporate Law',
        defaultRate: 350
    },
    LITIGATION: {
        id: 'litigation',
        name: 'Litigation',
        defaultRate: 400
    },
    EMPLOYMENT: {
        id: 'employment',
        name: 'Employment Law',
        defaultRate: 300
    },
    REAL_ESTATE: {
        id: 'real_estate',
        name: 'Real Estate',
        defaultRate: 275
    },
    INTELLECTUAL_PROPERTY: {
        id: 'ip',
        name: 'Intellectual Property',
        defaultRate: 425
    },
    TAX: {
        id: 'tax',
        name: 'Tax Law',
        defaultRate: 375
    }
};

// ========================================
// LOGGER SYSTÈME AMÉLIORÉ
// ========================================

class Logger {
    constructor() {
        this.logs = [];
        this.maxEntries = APP_CONFIG.logging.maxLogEntries;
        this.enabled = APP_CONFIG.logging.enabled;
        this.level = APP_CONFIG.logging.level;
        
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
    }
    
    log(level, message, data = null, context = 'System') {
        if (!this.enabled || this.levels[level] < this.levels[this.level]) {
            return;
        }
        
        const entry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            data: data,
            context: context,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100)
        };
        
        this.logs.push(entry);
        
        // Limiter le nombre d'entrées
        if (this.logs.length > this.maxEntries) {
            this.logs = this.logs.slice(-this.maxEntries);
        }
        
        // Log dans la console en développement
        if (APP_CONFIG.isDevelopment) {
            const consoleMethod = level.toLowerCase();
            if (console[consoleMethod]) {
                console[consoleMethod](`[${context}] ${message}`, data || '');
            }
        }
        
        // Déclencher événement pour monitoring externe
        if (level === 'ERROR') {
            window.dispatchEvent(new CustomEvent('prometheus:error', {
                detail: entry
            }));
        }
    }
    
    debug(message, data = null, context = 'System') {
        this.log('DEBUG', message, data, context);
    }
    
    info(message, data = null, context = 'System') {
        this.log('INFO', message, data, context);
    }
    
    warn(message, data = null, context = 'System') {
        this.log('WARN', message, data, context);
    }
    
    error(message, data = null, context = 'System') {
        this.log('ERROR', message, data, context);
    }
    
    getLogs(level = null) {
        if (!level) return this.logs;
        return this.logs.filter(log => log.level === level);
    }
    
    clearLogs() {
        this.logs = [];
    }
    
    exportLogs() {
        return {
            timestamp: new Date().toISOString(),
            appVersion: APP_CONFIG.version,
            logs: this.logs
        };
    }
}

// Instance globale du logger
const logger = new Logger();

// ========================================
// VALIDATEUR CENTRALISÉ ET AMÉLIORÉ
// ========================================

class Validator {
    static isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email) && email.length <= 254;
    }
    
    static isValidPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        const phoneRegex = /^[\+]?[\d\s\(\)\-\.]{10,20}$/;
        return phoneRegex.test(phone);
    }
    
    static isValidPassword(password) {
        if (!password || typeof password !== 'string') return false;
        
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
    
    static validateClient(clientData) {
        const errors = [];
        
        if (!clientData.name || typeof clientData.name !== 'string' || clientData.name.trim().length < 2) {
            errors.push('Client name must be at least 2 characters');
        }
        
        if (clientData.name && clientData.name.length > 200) {
            errors.push('Client name cannot exceed 200 characters');
        }
        
        if (!clientData.email || !this.isValidEmail(clientData.email)) {
            errors.push('Valid email address is required');
        }
        
        if (!clientData.type || !['Individual', 'Company', 'Organization'].includes(clientData.type)) {
            errors.push('Invalid client type');
        }
        
        if (!clientData.tier || !['Tier 1', 'Tier 2', 'Tier 3'].includes(clientData.tier)) {
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
        
        if (!entryData.rate || typeof entryData.rate !== 'number' || entryData.rate <= 0) {
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
}

// ========================================
// GESTIONNAIRE D'ERREURS AMÉLIORÉ
// ========================================

class ErrorManager {
    static errorMetrics = {};
    
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
        
        return messages[context] || 'An unexpected error occurred. Please try again.';
    }
    
    static showUserFriendlyError(message) {
        // Ne pas afficher si le message est déjà affiché
        if (this.lastErrorMessage === message && Date.now() - this.lastErrorTime < 5000) {
            return;
        }
        
        this.lastErrorMessage = message;
        this.lastErrorTime = Date.now();
        
        // Créer notification d'erreur temporaire
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Ajouter au conteneur de notifications
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Auto-suppression après 5 secondes
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    static attemptAutoRecovery(context, error) {
        switch (context) {
            case 'DataManager':
                // Tentative de sauvegarde de secours
                try {
                    if (window.prometheus && window.prometheus.dataManager) {
                        window.prometheus.dataManager.createEmergencyBackup();
                    }
                } catch (recoveryError) {
                    logger.error('Auto-recovery failed', recoveryError, 'ErrorManager');
                }
                break;
                
            case 'AuthManager':
                // Redirection vers login après délai
                setTimeout(() => {
                    if (window.prometheus && window.prometheus.authManager) {
                        window.prometheus.authManager.logout();
                    }
                }, 3000);
                break;
        }
    }
    
    static recordErrorMetrics(context, error) {
        if (!this.errorMetrics[context]) {
            this.errorMetrics[context] = {
                count: 0,
                lastError: null,
                errorTypes: {}
            };
        }
        
        this.errorMetrics[context].count++;
        this.errorMetrics[context].lastError = Date.now();
        
        const errorType = error.name || 'Unknown';
        if (!this.errorMetrics[context].errorTypes[errorType]) {
            this.errorMetrics[context].errorTypes[errorType] = 0;
        }
        this.errorMetrics[context].errorTypes[errorType]++;
    }
    
    static getErrorMetrics() {
        return this.errorMetrics;
    }
    
    static clearErrorMetrics() {
        this.errorMetrics = {};
    }
}

// ========================================
// UTILITAIRES GLOBAUX
// ========================================

class Utils {
    static formatCurrency(amount, currency = APP_CONFIG.defaultCurrency) {
        const symbol = APP_CONFIG.currencySymbols[currency] || currency;
        return `${symbol}${amount.toLocaleString(APP_CONFIG.locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
    
    static formatDuration(milliseconds) {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
    
    static generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 8);
        return `${prefix}${prefix ? '_' : ''}${timestamp}_${randomPart}`;
    }
    
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    static throttle(func, delay) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }
    
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }
}

// ========================================
// GESTIONNAIRES D'ERREURS GLOBAUX
// ========================================

window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    ErrorManager.handleError(error, 'GlobalJavaScriptError');
});

window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || new Error('Unhandled promise rejection');
    ErrorManager.handleError(reason, 'UnhandledPromiseRejection');
});

// ========================================
// EXPORTS GLOBAUX
// ========================================

// Exposer les utilitaires globalement
window.APP_CONFIG = APP_CONFIG;
window.USER_ROLES = USER_ROLES;
window.PRACTICE_AREAS = PRACTICE_AREAS;
window.logger = logger;
window.Validator = Validator;
window.ErrorManager = ErrorManager;
window.Utils = Utils;

// Logs en mode développement
if (APP_CONFIG.isDevelopment) {
    console.log('%cPrometheus Foundation Layer Loaded', 'color: #4a9eff; font-size: 14px; font-weight: bold;');
    console.log('Global utilities available:', Object.keys({
        APP_CONFIG, USER_ROLES, PRACTICE_AREAS, logger, Validator, ErrorManager, Utils
    }));
}

logger.info('Prometheus foundation layer loaded successfully');