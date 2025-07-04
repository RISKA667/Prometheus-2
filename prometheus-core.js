/**
 * PROMETHEUS - CORE APPLICATION LOGIC
 * BRDN Conseils - Legal Management System
 * Version: 3.0.1
 * 
 * Ce fichier contient :
 * - DataManager (gestion des données)
 * - PrometheusApplication (classe principale)
 * - Logique d'initialisation
 * 
 * DÉPENDANCES REQUISES :
 * - prometheus-foundation.js (doit être chargé en premier)
 */

'use strict';

// Vérifier que les dépendances sont chargées
if (typeof APP_CONFIG === 'undefined' || typeof logger === 'undefined') {
    throw new Error('prometheus-foundation.js must be loaded before prometheus-core.js');
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
            users: [],
            sessions: [],
            settings: {},
            backups: []
        };
        
        this.isInitialized = false;
        this.saveInProgress = false;
        this.lastSaveTime = null;
        this.changeListeners = new Map();
    }
    
    async initialize() {
        try {
            logger.info('Initializing DataManager', null, 'DataManager');
            
            // Vérifier la compatibilité du stockage
            this.checkStorageSupport();
            
            // Charger les données depuis localStorage
            this.loadFromStorage();
            
            // Nettoyer les anciennes sauvegardes
            this.cleanOldBackups();
            
            // Valider l'intégrité des données
            this.validateDataIntegrity();
            
            this.isInitialized = true;
            logger.info('DataManager initialized successfully', null, 'DataManager');
            
        } catch (error) {
            logger.error('DataManager initialization failed', error, 'DataManager');
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
            const keys = ['clients', 'matters', 'timeEntries', 'invoices', 'documents', 'users', 'sessions', 'settings'];
            
            keys.forEach(key => {
                try {
                    const data = localStorage.getItem(`prometheus_${key}`);
                    if (data) {
                        this.storage[key] = JSON.parse(data);
                        logger.debug(`Loaded ${key}`, { 
                            count: Array.isArray(this.storage[key]) ? this.storage[key].length : 'N/A' 
                        }, 'DataManager');
                    } else {
                        // Initialiser avec un tableau vide pour les collections
                        if (['clients', 'matters', 'timeEntries', 'invoices', 'documents', 'users', 'sessions'].includes(key)) {
                            this.storage[key] = [];
                        } else {
                            this.storage[key] = {};
                        }
                    }
                } catch (parseError) {
                    logger.warn(`Failed to parse ${key} from storage`, parseError, 'DataManager');
                    // Réinitialiser avec des valeurs par défaut
                    if (['clients', 'matters', 'timeEntries', 'invoices', 'documents', 'users', 'sessions'].includes(key)) {
                        this.storage[key] = [];
                    } else {
                        this.storage[key] = {};
                    }
                }
            });
            
            logger.info('Data loaded from storage successfully', null, 'DataManager');
            
        } catch (error) {
            logger.error('Failed to load data from storage', error, 'DataManager');
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
        
        logger.info('Initialized empty storage structure', null, 'DataManager');
    }
    
    // Méthodes de sauvegarde
    save(key, data) {
        try {
            this.storage[key] = data;
            this.saveToStorage(key);
            this.notifyChangeListeners(key, data);
            return true;
        } catch (error) {
            logger.error(`Failed to save ${key}`, error, 'DataManager');
            return false;
        }
    }
    
    saveToStorage(key) {
        try {
            localStorage.setItem(`prometheus_${key}`, JSON.stringify(this.storage[key]));
            this.lastSaveTime = Date.now();
        } catch (error) {
            logger.error(`Failed to save ${key} to localStorage`, error, 'DataManager');
            throw error;
        }
    }
    
    saveAllData() {
        if (this.saveInProgress) {
            logger.debug('Save already in progress, skipping', null, 'DataManager');
            return;
        }
        
        this.saveInProgress = true;
        
        try {
            const keys = ['clients', 'matters', 'timeEntries', 'invoices', 'documents', 'users', 'sessions', 'settings'];
            
            keys.forEach(key => {
                this.saveToStorage(key);
            });
            
            logger.debug('All data saved successfully', null, 'DataManager');
            
        } catch (error) {
            logger.error('Failed to save all data', error, 'DataManager');
        } finally {
            this.saveInProgress = false;
        }
    }
    
    // Méthodes de récupération
    get(key) {
        return this.storage[key];
    }
    
    getById(collection, id) {
        const data = this.storage[collection];
        if (!Array.isArray(data)) return null;
        return data.find(item => item.id === id) || null;
    }
    
    // Méthodes de gestion des sauvegardes
    createBackup() {
        try {
            const backup = {
                id: Utils.generateId('backup'),
                timestamp: Date.now(),
                data: Utils.deepClone(this.storage)
            };
            
            this.storage.backups.push(backup);
            
            // Limiter le nombre de sauvegardes
            if (this.storage.backups.length > APP_CONFIG.maxBackups) {
                this.storage.backups = this.storage.backups.slice(-APP_CONFIG.maxBackups);
            }
            
            this.saveToStorage('backups');
            logger.info('Backup created successfully', { backupId: backup.id }, 'DataManager');
            
            return backup.id;
            
        } catch (error) {
            logger.error('Failed to create backup', error, 'DataManager');
            throw error;
        }
    }
    
    createEmergencyBackup() {
        try {
            const emergencyData = JSON.stringify(this.storage);
            localStorage.setItem('prometheus_emergency_backup', emergencyData);
            logger.info('Emergency backup created', null, 'DataManager');
        } catch (error) {
            logger.error('Failed to create emergency backup', error, 'DataManager');
        }
    }
    
    cleanOldBackups() {
        try {
            const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 jours
            this.storage.backups = this.storage.backups.filter(backup => backup.timestamp > cutoffTime);
            logger.debug('Old backups cleaned', null, 'DataManager');
        } catch (error) {
            logger.warn('Failed to clean old backups', error, 'DataManager');
        }
    }
    
    validateDataIntegrity() {
        try {
            // Vérifier les références orphelines
            const clientIds = new Set(this.storage.clients.map(c => c.id));
            
            // Nettoyer les matters sans client
            this.storage.matters = this.storage.matters.filter(matter => {
                if (!clientIds.has(matter.clientId)) {
                    logger.warn(`Matter ${matter.id} has invalid clientId ${matter.clientId}`, null, 'DataManager');
                    return false;
                }
                return true;
            });
            
            // Nettoyer les entrées de temps sans matter
            const matterIds = new Set(this.storage.matters.map(m => m.id));
            this.storage.timeEntries = this.storage.timeEntries.filter(entry => {
                if (!matterIds.has(entry.matterId)) {
                    logger.warn(`Time entry ${entry.id} has invalid matterId ${entry.matterId}`, null, 'DataManager');
                    return false;
                }
                return true;
            });
            
            logger.debug('Data integrity validation completed', null, 'DataManager');
            
        } catch (error) {
            logger.error('Data integrity validation failed', error, 'DataManager');
        }
    }
    
    // Système d'écoute des changements
    addChangeListener(key, callback) {
        if (!this.changeListeners.has(key)) {
            this.changeListeners.set(key, []);
        }
        this.changeListeners.get(key).push(callback);
    }
    
    removeChangeListener(key, callback) {
        if (this.changeListeners.has(key)) {
            const listeners = this.changeListeners.get(key);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    notifyChangeListeners(key, data) {
        if (this.changeListeners.has(key)) {
            this.changeListeners.get(key).forEach(callback => {
                try {
                    callback(data, key);
                } catch (error) {
                    logger.error('Change listener error', error, 'DataManager');
                }
            });
        }
    }
    
    // Obtenir des statistiques sur les données
    getStorageStats() {
        try {
            const stats = {};
            Object.keys(this.storage).forEach(key => {
                if (Array.isArray(this.storage[key])) {
                    stats[key] = this.storage[key].length;
                } else {
                    stats[key] = Object.keys(this.storage[key]).length;
                }
            });
            
            // Taille approximative du stockage
            const totalSize = Object.keys(this.storage).reduce((size, key) => {
                const item = localStorage.getItem(`prometheus_${key}`);
                return size + (item ? item.length : 0);
            }, 0);
            
            stats.totalStorageSize = totalSize;
            
            return stats;
            
        } catch (error) {
            logger.error('Failed to get storage stats', error, 'DataManager');
            return {};
        }
    }
}

// ========================================
// APPLICATION PRINCIPALE PROMETHEUS
// ========================================

class PrometheusApplication {
    constructor() {
        this.isInitialized = false;
        this.dataManager = null;
        this.authManager = null;
        this.uiManager = null;
        
        this.state = {
            currentUser: null,
            currentView: 'dashboard',
            isOnline: navigator.onLine,
            unsavedChanges: false,
            performance: {
                startTime: Date.now(),
                loadTime: null,
                initErrors: []
            }
        };
        
        this.config = Utils.deepClone(APP_CONFIG);
        this.backgroundServices = [];
    }
    
    /**
     * Initialisation principale de l'application
     */
    static async initialize() {
        try {
            logger.info('Starting Prometheus initialization', null, 'PrometheusApplication');
            
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
            }, 'PrometheusApplication');
            
            return app;
            
        } catch (error) {
            logger.error('Critical: Prometheus initialization failed', error, 'PrometheusApplication');
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
                logger.error(`Missing required feature: ${feature}`, null, 'PrometheusApplication');
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
            logger.error('Browser too old for Prometheus', null, 'PrometheusApplication');
            return false;
        }
        
        return true;
    }
    
    /**
     * Initialisation du core système
     */
    async initializeCore() {
        try {
            logger.info('Initializing core systems', null, 'PrometheusApplication');
            
            // Initialiser la configuration
            this.loadConfiguration();
            
            // Vérifier l'état du stockage
            this.checkStorageHealth();
            
            // Setup des event listeners
            this.setupApplicationEventListeners();
            
            logger.info('Core systems initialized', null, 'PrometheusApplication');
            
        } catch (error) {
            this.state.performance.initErrors.push('Core initialization failed');
            logger.error('Core initialization failed', error, 'PrometheusApplication');
            throw error;
        }
    }
    
    /**
     * Initialiser tous les managers - ORDRE CRITIQUE RESPECTÉ
     */
    async initializeManagers() {
        try {
            logger.info('Initializing managers', null, 'PrometheusApplication');
            
            // 1. DataManager d'abord (aucune dépendance)
            logger.debug('Initializing DataManager', null, 'PrometheusApplication');
            this.dataManager = new DataManager();
            await this.dataManager.initialize();
            
            // 2. AuthManager ensuite (dépend de DataManager)
            logger.debug('Initializing AuthManager', null, 'PrometheusApplication');
            
            // Vérifier que AuthManager est disponible
            if (typeof AuthManager === 'undefined') {
                logger.error('AuthManager class not found - check if prometheus-auth.js loaded correctly', null, 'PrometheusApplication');
                throw new Error('AuthManager class not available');
            }
            
            this.authManager = new AuthManager(this.dataManager);
            await this.authManager.initialize();
            
            // 3. Autres managers (ajoutez ici au fur et à mesure)
            // this.uiManager = new UIManager(this.dataManager);
            // this.timeTracker = new TimeTracker(this.dataManager);
            // etc.
            
            logger.info('Managers initialized successfully', null, 'PrometheusApplication');
            
        } catch (error) {
            this.state.performance.initErrors.push('Managers initialization failed');
            logger.error('Managers initialization failed', error, 'PrometheusApplication');
            throw error;
        }
    }
    
    async checkAuthentication() {
        try {
            if (this.authManager) {
                const isAuthenticated = await this.authManager.checkSession();
                if (isAuthenticated) {
                    this.state.currentUser = this.authManager.getCurrentUser();
                    logger.info('User authenticated', { userId: this.state.currentUser?.id }, 'PrometheusApplication');
                } else {
                    logger.info('No valid session found', null, 'PrometheusApplication');
                }
            }
        } catch (error) {
            logger.error('Authentication check failed', error, 'PrometheusApplication');
        }
    }
    
    async initializeUserInterface() {
        try {
            logger.debug('Initializing user interface', null, 'PrometheusApplication');
            
            // Cacher l'overlay de chargement
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            // Afficher l'interface principale
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.style.display = 'block';
            }
            
            logger.debug('User interface initialized', null, 'PrometheusApplication');
            
        } catch (error) {
            logger.error('UI initialization failed', error, 'PrometheusApplication');
        }
    }
    
    async loadApplicationData() {
        try {
            logger.debug('Loading application data', null, 'PrometheusApplication');
            
            // Charger les données nécessaires au démarrage
            if (this.dataManager) {
                const stats = this.dataManager.getStorageStats();
                logger.debug('Storage stats', stats, 'PrometheusApplication');
            }
            
        } catch (error) {
            logger.error('Failed to load application data', error, 'PrometheusApplication');
        }
    }
    
    loadConfiguration() {
        try {
            // Charger config utilisateur depuis localStorage
            const userConfig = localStorage.getItem('prometheus_user_config');
            if (userConfig) {
                const parsed = JSON.parse(userConfig);
                this.config = { ...this.config, ...parsed };
            }
            
            logger.debug('Configuration loaded', this.config, 'PrometheusApplication');
            
        } catch (error) {
            logger.warn('Failed to load user configuration', error, 'PrometheusApplication');
        }
    }
    
    checkStorageHealth() {
        try {
            const quota = this.getStorageQuota();
            logger.debug('Storage health check completed', quota, 'PrometheusApplication');
        } catch (error) {
            logger.warn('Storage health check failed', error, 'PrometheusApplication');
        }
    }
    
    async getStorageQuota() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                return await navigator.storage.estimate();
            }
            
            // Estimation basique
            let used = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    used += localStorage[key].length;
                }
            }
            
            return {
                usage: used,
                quota: 5 * 1024 * 1024 // 5MB estimé
            };
            
        } catch (error) {
            return { usage: 0, quota: 0 };
        }
    }
    
    setupApplicationEventListeners() {
        // Statut en ligne/hors ligne
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            logger.info('Back online', null, 'PrometheusApplication');
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            logger.warn('Gone offline', null, 'PrometheusApplication');
        });
        
        // Changements de visibilité de page
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.dataManager) {
                    this.dataManager.saveAllData();
                }
                logger.debug('Page hidden, data saved', null, 'PrometheusApplication');
            } else {
                this.refreshApplication();
                logger.debug('Page visible, data refreshed', null, 'PrometheusApplication');
            }
        });
        
        // Avant déchargement de page
        window.addEventListener('beforeunload', (event) => {
            if (this.state.unsavedChanges) {
                event.preventDefault();
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
            
            // Sauvegarde finale
            if (this.dataManager) {
                this.dataManager.saveAllData();
            }
        });
    }
    
    registerKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+S pour sauvegarder
            if (event.ctrlKey && event.key === 's') {
                event.preventDefault();
                if (this.dataManager) {
                    this.dataManager.saveAllData();
                }
            }
            
            // Échap pour fermer les modales
            if (event.key === 'Escape') {
                // Logique pour fermer les modales
                const modals = document.querySelectorAll('.modal.active');
                modals.forEach(modal => modal.classList.remove('active'));
            }
        });
    }
    
    startBackgroundServices() {
        // Auto-sauvegarde
        const autoSaveInterval = setInterval(() => {
            try {
                if (this.dataManager && this.state.unsavedChanges) {
                    this.dataManager.saveAllData();
                    this.state.unsavedChanges = false;
                    logger.debug('Auto-save completed', null, 'PrometheusApplication');
                }
            } catch (error) {
                logger.warn('Auto-save failed', error, 'PrometheusApplication');
            }
        }, this.config.autoSaveInterval);
        
        // Auto-backup
        const autoBackupInterval = setInterval(() => {
            try {
                if (this.dataManager) {
                    this.dataManager.createBackup();
                    logger.debug('Auto-backup completed', null, 'PrometheusApplication');
                }
            } catch (error) {
                logger.warn('Auto-backup failed', error, 'PrometheusApplication');
            }
        }, this.config.backupInterval);
        
        this.backgroundServices.push(autoSaveInterval, autoBackupInterval);
    }
    
    refreshApplication() {
        try {
            // Recharger les données si nécessaire
            // Actualiser l'interface utilisateur
            // Vérifier les notifications
            
            logger.debug('Application refreshed', null, 'PrometheusApplication');
        } catch (error) {
            logger.error('Application refresh failed', error, 'PrometheusApplication');
        }
    }
    
    // Méthodes de santé de l'application
    getApplicationHealth() {
        const health = {
            status: 'healthy',
            components: {},
            timestamp: Date.now()
        };
        
        // Vérifier DataManager
        health.components.dataManager = this.dataManager?.isInitialized ? 'healthy' : 'error';
        
        // Vérifier AuthManager
        health.components.authManager = this.authManager?.isInitialized ? 'healthy' : 'error';
        
        // Vérifier le stockage
        try {
            localStorage.setItem('health_check', 'test');
            localStorage.removeItem('health_check');
            health.components.storage = 'healthy';
        } catch (error) {
            health.components.storage = 'error';
        }
        
        // Déterminer le statut global
        const hasErrors = Object.values(health.components).some(status => status === 'error');
        if (hasErrors) {
            health.status = 'critical';
        }
        
        return health;
    }
    
    handleError(error, context = 'Unknown') {
        ErrorManager.handleError(error, context);
    }
    
    // Nettoyage lors de la fermeture
    destroy() {
        // Arrêter les services en arrière-plan
        this.backgroundServices.forEach(service => clearInterval(service));
        this.backgroundServices = [];
        
        // Sauvegarder une dernière fois
        if (this.dataManager) {
            this.dataManager.saveAllData();
        }
        
        logger.info('Prometheus application destroyed', null, 'PrometheusApplication');
    }
}

// ========================================
// INITIALISATION GLOBALE
// ========================================

// Exposer les classes principales
window.DataManager = DataManager;
window.PrometheusApplication = PrometheusApplication;

// Fonction d'initialisation globale
window.initializePrometheus = PrometheusApplication.initialize;

// Logs en mode développement
if (APP_CONFIG.isDevelopment) {
    console.log('%cPrometheus Core Module Loaded', 'color: #4a9eff; font-size: 14px; font-weight: bold;');
    console.log('Main classes available:', Object.keys({
        DataManager, PrometheusApplication
    }));
}

logger.info('Prometheus core module loaded successfully');