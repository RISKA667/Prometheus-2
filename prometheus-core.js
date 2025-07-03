/**
 * PROMETHEUS.EXE - CORE APPLICATION LOGIC
 * BOURDON & Associates - Legal Management System
 * Version: 3.0.0 - Full English Native + Vectorized Architecture
 * 
 * Core business logic, data management, and application state management
 */

'use strict';

// ========================================
// APPLICATION CONSTANTS & CONFIGURATION
// ========================================

const APP_CONFIG = {
    name: 'Prometheus',
    version: '3.0.0',
    company: 'BOURDON & Associates',
    
    // Data persistence settings
    autoSaveInterval: 30000, // 30 seconds
    backupInterval: 300000,  // 5 minutes
    maxBackups: 10,
    
    // UI settings
    defaultCurrency: 'USD',
    currencySymbols: {
        USD: '$',
        EUR: '€',
        GBP: '£'
    },
    
    // Time tracking settings
    timerIncrement: 900000, // 15 minutes in milliseconds
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
    timeZone: 'America/New_York',
    
    // API endpoints (for future implementation)
    apiEndpoints: {
        legifrance: 'https://api.legifrance.gouv.fr/v1/',
        docusign: 'https://demo.docusign.net/restapi/',
        openai: 'https://api.openai.com/v1/'
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

// User roles and billing rates
const USER_ROLES = {
    intern: {
        name: 'Intern',
        rate: 50,
        level: 1,
        permissions: ['time.create', 'documents.view', 'matters.view']
    },
    assistant: {
        name: 'Legal Assistant',
        rate: 150,
        level: 2,
        permissions: ['time.create', 'time.edit', 'documents.upload', 'clients.view', 'matters.view']
    },
    associate: {
        name: 'Associate',
        rate: 250,
        level: 3,
        permissions: ['*']
    },
    partner: {
        name: 'Partner',
        rate: 500,
        level: 4,
        permissions: ['*']
    },
    founding_partner: {
        name: 'Founding Partner',
        rate: 750,
        level: 5,
        permissions: ['*']
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
// CORE APPLICATION CLASS
// ========================================

class PrometheusApplication {
    constructor() {
        this.isInitialized = false;
        this.dataManager = null;
        this.authManager = null;
        this.uiManager = null;
        this.searchManager = null;
        this.timeTracker = null;
        this.currentUser = null;
        
        // Application state
        this.state = {
            activeSection: 'dashboard',
            unsavedChanges: false,
            isOnline: navigator.onLine,
            performance: {
                startTime: Date.now(),
                loadTime: null
            }
        };
        
        // Event listeners for application lifecycle
        this.setupApplicationEventListeners();
    }
    
    /**
     * Initialize the entire Prometheus application
     */
    static async initialize() {
        try {
            // Create singleton instance
            if (!window.prometheus) {
                window.prometheus = new PrometheusApplication();
            }
            
            const app = window.prometheus;
            
            // Initialize core managers
            await app.initializeManagers();
            
            // Check authentication status
            await app.checkAuthentication();
            
            // Initialize UI
            await app.initializeUserInterface();
            
            // Load application data
            await app.loadApplicationData();
            
            // Register keyboard shortcuts
            app.registerKeyboardShortcuts();
            
            // Start auto-save
            app.startAutoSave();
            
            // Mark as initialized
            app.isInitialized = true;
            app.state.performance.loadTime = Date.now() - app.state.performance.startTime;
            
            console.log(`✅ Prometheus initialized successfully in ${app.state.performance.loadTime}ms`);
            
            return app;
            
        } catch (error) {
            console.error('❌ Failed to initialize Prometheus:', error);
            ErrorManager.showCriticalError('Application initialization failed', error);
            throw error;
        }
    }
    
    /**
     * Initialize all core managers
     */
    async initializeManagers() {
        try {
            // Initialize data manager first
            this.dataManager = new DataManager();
            await this.dataManager.initialize();
            
            // Initialize authentication manager
            this.authManager = new AuthenticationManager(this.dataManager);
            await this.authManager.initialize();
            
            // Initialize other managers
            this.searchManager = new SearchManager(this);
            this.timeTracker = new TimeTracker(this);
            this.clientManager = new ClientManager(this);
            this.matterManager = new MatterManager(this);
            this.billingManager = new BillingManager(this);
            this.documentManager = new DocumentManager(this);
            this.analyticsManager = new AnalyticsManager(this);
            
            // Initialize UI manager last
            this.uiManager = new UIManager(this);
            
            console.log('✅ All managers initialized');
            
        } catch (error) {
            console.error('❌ Manager initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Check authentication status and show login if needed
     */
    async checkAuthentication() {
        try {
            if (!this.authManager.isAuthenticated()) {
                // Show login screen
                await this.authManager.showLogin();
            } else {
                this.currentUser = this.authManager.getCurrentUser();
                console.log(`✅ Authenticated as: ${this.currentUser.name}`);
            }
        } catch (error) {
            console.error('❌ Authentication check failed:', error);
            throw error;
        }
    }
    
    /**
     * Initialize user interface
     */
    async initializeUserInterface() {
        try {
            // Initialize navigation manager
            window.navigationManager = new NavigationManager(this);
            
            // Initialize keyboard manager
            window.keyboardManager = new KeyboardManager(this);
            
            // Initialize notification manager
            window.notificationManager = new NotificationManager();
            
            // Initialize error manager
            window.errorManager = new ErrorManager();
            
            // Initialize screen reader manager
            window.screenReaderManager = new ScreenReaderManager();
            
            // Expose managers globally for onclick handlers
            this.exposeGlobalManagers();
            
            console.log('✅ UI managers initialized');
            
        } catch (error) {
            console.error('❌ UI initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Load all application data
     */
    async loadApplicationData() {
        try {
            // Load data in parallel for better performance
            await Promise.all([
                this.clientManager.loadClients(),
                this.matterManager.loadMatters(),
                this.timeTracker.loadTimeEntries(),
                this.billingManager.loadInvoices(),
                this.documentManager.loadDocuments()
            ]);
            
            // Update dashboard
            this.updateDashboard();
            
            console.log('✅ Application data loaded');
            
        } catch (error) {
            console.error('❌ Data loading failed:', error);
            throw error;
        }
    }
    
    /**
     * Register global keyboard shortcuts
     */
    registerKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ignore if user is typing in input fields
            if (this.isTypingInInput(event.target)) {
                return;
            }
            
            const { key, ctrlKey, altKey, shiftKey } = event;
            
            // Global navigation shortcuts
            if (ctrlKey) {
                switch (key.toLowerCase()) {
                    case 'd':
                        event.preventDefault();
                        navigationManager.showSection('dashboard');
                        break;
                    case 'r':
                        event.preventDefault();
                        this.searchManager.showGlobalSearch();
                        break;
                    case 'n':
                        event.preventDefault();
                        if (shiftKey) {
                            this.matterManager.showCreateForm();
                        } else {
                            this.quickCreateMenu();
                        }
                        break;
                    case 't':
                        event.preventDefault();
                        this.timeTracker.toggleTimer();
                        break;
                    case 's':
                        event.preventDefault();
                        this.dataManager.saveAllData();
                        notificationManager.showSuccess('Data saved successfully');
                        break;
                }
            }
            
            // Alt key shortcuts
            if (altKey) {
                switch (key.toLowerCase()) {
                    case 'c':
                        event.preventDefault();
                        navigationManager.showSection('clients');
                        break;
                    case 'm':
                        event.preventDefault();
                        navigationManager.showSection('matters');
                        break;
                    case 'd':
                        event.preventDefault();
                        navigationManager.showSection('documents');
                        break;
                    case 'a':
                        event.preventDefault();
                        navigationManager.showSection('analytics');
                        break;
                }
            }
            
            // Function keys
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
    }
    
    /**
     * Check if user is typing in an input field
     */
    isTypingInInput(target) {
        const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
        return inputTags.includes(target.tagName) || target.contentEditable === 'true';
    }
    
    /**
     * Handle escape key press
     */
    handleEscapeKey() {
        // Close any open modals or forms
        const openModals = document.querySelectorAll('.form-container:not([style*="display: none"]), .search-modal:not([style*="display: none"])');
        
        if (openModals.length > 0) {
            openModals.forEach(modal => {
                if (modal.id === 'globalSearchModal') {
                    this.searchManager.hideGlobalSearch();
                } else {
                    modal.style.display = 'none';
                }
            });
        }
    }
    
    /**
     * Show quick create menu
     */
    quickCreateMenu() {
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
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (menu.parentElement) {
                menu.remove();
            }
        }, 10000);
    }
    
    /**
     * Start auto-save functionality
     */
    startAutoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            if (this.state.unsavedChanges) {
                this.dataManager.saveAllData();
                this.state.unsavedChanges = false;
            }
        }, APP_CONFIG.autoSaveInterval);
        
        // Create backups every 5 minutes
        setInterval(() => {
            this.dataManager.createBackup();
        }, APP_CONFIG.backupInterval);
    }
    
    /**
     * Setup application event listeners
     */
    setupApplicationEventListeners() {
        // Online/offline status
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            notificationManager.showInfo('Back online');
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            notificationManager.showWarning('Working offline');
        });
        
        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.dataManager.saveAllData();
            } else {
                this.refreshApplication();
            }
        });
        
        // Before unload - save data
        window.addEventListener('beforeunload', (event) => {
            if (this.state.unsavedChanges) {
                event.preventDefault();
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                this.dataManager.saveAllData();
            }
        });
        
        // Performance monitoring
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perf = performance.getEntriesByType('navigation')[0];
                if (perf && perf.loadEventEnd > 3000) {
                    console.warn(`⚠️ Slow page load: ${perf.loadEventEnd}ms`);
                }
            }, 0);
        });
    }
    
    /**
     * Expose managers globally for HTML onclick handlers
     */
    exposeGlobalManagers() {
        // Manager references for onclick handlers
        window.clientManager = this.clientManager;
        window.matterManager = this.matterManager;
        window.timeTracker = this.timeTracker;
        window.billingManager = this.billingManager;
        window.documentManager = this.documentManager;
        window.analyticsManager = this.analyticsManager;
        window.searchManager = this.searchManager;
        window.dataManager = this.dataManager;
    }
    
    /**
     * Update dashboard with latest data
     */
    updateDashboard() {
        try {
            // Update statistics
            const stats = this.calculateDashboardStats();
            this.updateDashboardStats(stats);
            
            // Update recent activities
            this.updateRecentActivities();
            
            // Update widgets
            this.updateDashboardWidgets();
            
        } catch (error) {
            console.error('Dashboard update failed:', error);
        }
    }
    
    /**
     * Calculate dashboard statistics
     */
    calculateDashboardStats() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Get current month data
        const monthlyTimeEntries = this.timeTracker.getTimeEntriesForPeriod(
            new Date(currentYear, currentMonth, 1),
            new Date(currentYear, currentMonth + 1, 0)
        );
        
        return {
            totalClients: this.clientManager.getActiveClients().length,
            totalMatters: this.matterManager.getActiveMatters().length,
            monthlyHours: monthlyTimeEntries.reduce((sum, entry) => sum + entry.duration, 0) / 3600000, // Convert to hours
            monthlyRevenue: monthlyTimeEntries.reduce((sum, entry) => sum + entry.value, 0)
        };
    }
    
    /**
     * Update dashboard statistics display
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
     * Update recent activities feed
     */
    updateRecentActivities() {
        // This would show recent actions across the application
        const activities = this.getRecentActivities();
        const container = document.getElementById('recentActivitiesList');
        
        if (container && activities.length > 0) {
            container.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <span class="activity-icon">${activity.icon}</span>
                    <div class="activity-content">
                        <span class="activity-description">${activity.description}</span>
                        <span class="activity-time">${this.formatRelativeTime(activity.timestamp)}</span>
                    </div>
                </div>
            `).join('');
        }
    }
    
    /**
     * Get recent activities across the application
     */
    getRecentActivities() {
        const activities = [];
        
        // Get recent matters
        const recentMatters = this.matterManager.getRecentMatters(3);
        recentMatters.forEach(matter => {
            activities.push({
                icon: '⚖️',
                description: `Created matter: ${matter.title}`,
                timestamp: matter.createdAt,
                type: 'matter'
            });
        });
        
        // Get recent time entries
        const recentTimeEntries = this.timeTracker.getRecentTimeEntries(3);
        recentTimeEntries.forEach(entry => {
            activities.push({
                icon: '⏱️',
                description: `Logged ${this.formatDuration(entry.duration)} on ${entry.matterCode}`,
                timestamp: entry.createdAt,
                type: 'time'
            });
        });
        
        // Get recent invoices
        const recentInvoices = this.billingManager.getRecentInvoices(2);
        recentInvoices.forEach(invoice => {
            activities.push({
                icon: '💰',
                description: `Generated invoice ${invoice.number}`,
                timestamp: invoice.createdAt,
                type: 'invoice'
            });
        });
        
        // Sort by timestamp and return latest 10
        return activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
    }
    
    /**
     * Update dashboard widgets
     */
    updateDashboardWidgets() {
        // Update recent matters widget
        this.matterManager.updateRecentMattersWidget();
        
        // Update today's time widget
        this.timeTracker.updateTodayTimeWidget();
    }
    
    /**
     * Refresh entire application
     */
    async refreshApplication() {
        try {
            notificationManager.showInfo('Refreshing application...');
            
            // Reload all data
            await this.loadApplicationData();
            
            // Update UI
            this.updateDashboard();
            
            // Refresh current section
            const currentSection = this.state.activeSection;
            navigationManager.showSection(currentSection);
            
            notificationManager.showSuccess('Application refreshed');
            
        } catch (error) {
            console.error('Application refresh failed:', error);
            notificationManager.showError('Failed to refresh application');
        }
    }
    
    /**
     * Format currency values
     */
    formatCurrency(amount, currency = APP_CONFIG.defaultCurrency) {
        const formatter = new Intl.NumberFormat(APP_CONFIG.locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
        
        return formatter.format(amount);
    }
    
    /**
     * Format duration in milliseconds to human readable format
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
     * Format relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(timestamp) {
        const rtf = new Intl.RelativeTimeFormat(APP_CONFIG.locale, { numeric: 'auto' });
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
    }
    
    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Mark application as having unsaved changes
     */
    markUnsavedChanges() {
        this.state.unsavedChanges = true;
    }
    
    /**
     * Get application information for debugging
     */
    getApplicationInfo() {
        return {
            name: APP_CONFIG.name,
            version: APP_CONFIG.version,
            isInitialized: this.isInitialized,
            currentUser: this.currentUser?.name || 'Not logged in',
            activeSection: this.state.activeSection,
            isOnline: this.state.isOnline,
            loadTime: this.state.performance.loadTime,
            dataStats: {
                clients: this.clientManager?.getClientCount() || 0,
                matters: this.matterManager?.getMatterCount() || 0,
                timeEntries: this.timeTracker?.getTimeEntryCount() || 0,
                invoices: this.billingManager?.getInvoiceCount() || 0,
                documents: this.documentManager?.getDocumentCount() || 0
            }
        };
    }
    
    /**
     * Handle application errors gracefully
     */
    handleError(error, context = 'Unknown') {
        console.error(`❌ Prometheus Error in ${context}:`, error);
        
        // Log error for debugging
        this.logError(error, context);
        
        // Show user-friendly error message
        notificationManager.showError(`An error occurred: ${error.message}`);
        
        // Try to recover if possible
        this.attemptRecovery(error, context);
    }
    
    /**
     * Log errors for debugging
     */
    logError(error, context) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            context: context,
            message: error.message,
            stack: error.stack,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Store in session storage for debugging
        const errorLogs = JSON.parse(sessionStorage.getItem('prometheus_error_logs') || '[]');
        errorLogs.push(errorLog);
        
        // Keep only last 50 errors
        if (errorLogs.length > 50) {
            errorLogs.splice(0, errorLogs.length - 50);
        }
        
        sessionStorage.setItem('prometheus_error_logs', JSON.stringify(errorLogs));
    }
    
    /**
     * Attempt to recover from errors
     */
    attemptRecovery(error, context) {
        try {
            switch (context) {
                case 'DataManager':
                    // Try to reload data from backup
                    this.dataManager.loadFromBackup();
                    break;
                case 'UIManager':
                    // Try to reset UI state
                    this.refreshApplication();
                    break;
                default:
                    // Generic recovery - save current state
                    this.dataManager.saveAllData();
                    break;
            }
        } catch (recoveryError) {
            console.error('❌ Recovery failed:', recoveryError);
        }
    }
}

// ========================================
// DATA MANAGER CLASS
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
    }
    
    async initialize() {
        try {
            // Check browser compatibility
            this.checkStorageSupport();
            
            // Load data from localStorage
            this.loadFromStorage();
            
            // Clean old backups
            this.cleanOldBackups();
            
            this.isInitialized = true;
            console.log('✅ DataManager initialized');
            
        } catch (error) {
            console.error('❌ DataManager initialization failed:', error);
            throw error;
        }
    }
    
    checkStorageSupport() {
        if (typeof Storage === 'undefined') {
            throw new Error('Browser does not support localStorage');
        }
    }
    
    loadFromStorage() {
        try {
            const keys = ['clients', 'matters', 'timeEntries', 'invoices', 'documents', 'settings'];
            
            keys.forEach(key => {
                const data = localStorage.getItem(`prometheus_${key}`);
                if (data) {
                    this.storage[key] = JSON.parse(data);
                }
            });
            
            console.log('✅ Data loaded from storage');
            
        } catch (error) {
            console.error('❌ Failed to load data from storage:', error);
            this.loadFromBackup();
        }
    }
    
    saveToStorage(key = null) {
        try {
            if (key) {
                localStorage.setItem(`prometheus_${key}`, JSON.stringify(this.storage[key]));
            } else {
                // Save all data
                Object.keys(this.storage).forEach(k => {
                    if (k !== 'backups') {
                        localStorage.setItem(`prometheus_${k}`, JSON.stringify(this.storage[k]));
                    }
                });
            }
            
            console.log(`✅ Data saved to storage${key ? ` (${key})` : ''}`);
            
        } catch (error) {
            console.error('❌ Failed to save data to storage:', error);
            throw error;
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
            
            // Keep only last 10 backups
            if (this.storage.backups.length > APP_CONFIG.maxBackups) {
                this.storage.backups = this.storage.backups.slice(-APP_CONFIG.maxBackups);
            }
            
            localStorage.setItem('prometheus_backups', JSON.stringify(this.storage.backups));
            
            console.log('✅ Backup created');
            
        } catch (error) {
            console.error('❌ Failed to create backup:', error);
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
                : backups[backups.length - 1]; // Latest backup
            
            if (!backup) {
                throw new Error('Backup not found');
            }
            
            this.storage = { ...backup.data, backups: backups };
            this.saveAllData();
            
            console.log('✅ Data restored from backup');
            notificationManager.showSuccess('Data restored from backup');
            
        } catch (error) {
            console.error('❌ Failed to load from backup:', error);
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
                console.log(`🧹 Cleaned ${backups.length - cleanedBackups.length} old backups`);
            }
            
        } catch (error) {
            console.error('❌ Failed to clean old backups:', error);
        }
    }
    
    // CRUD operations for different data types
    
    // Generic CRUD methods
    create(type, data) {
        const item = {
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...data
        };
        
        this.storage[type].push(item);
        this.saveToStorage(type);
        window.prometheus.markUnsavedChanges();
        
        return item;
    }
    
    read(type, id = null) {
        if (id) {
            return this.storage[type].find(item => item.id === id);
        }
        return [...this.storage[type]];
    }
    
    update(type, id, data) {
        const index = this.storage[type].findIndex(item => item.id === id);
        if (index === -1) {
            throw new Error(`${type} with id ${id} not found`);
        }
        
        this.storage[type][index] = {
            ...this.storage[type][index],
            ...data,
            updatedAt: new Date().toISOString()
        };
        
        this.saveToStorage(type);
        window.prometheus.markUnsavedChanges();
        
        return this.storage[type][index];
    }
    
    delete(type, id) {
        const index = this.storage[type].findIndex(item => item.id === id);
        if (index === -1) {
            throw new Error(`${type} with id ${id} not found`);
        }
        
        const deleted = this.storage[type].splice(index, 1)[0];
        this.saveToStorage(type);
        window.prometheus.markUnsavedChanges();
        
        return deleted;
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Search functionality
    search(type, query, fields = []) {
        const items = this.storage[type];
        const searchTerm = query.toLowerCase();
        
        return items.filter(item => {
            if (fields.length === 0) {
                // Search all string fields
                return Object.values(item).some(value => 
                    typeof value === 'string' && value.toLowerCase().includes(searchTerm)
                );
            } else {
                // Search specified fields only
                return fields.some(field => {
                    const value = item[field];
                    return typeof value === 'string' && value.toLowerCase().includes(searchTerm);
                });
            }
        });
    }
    
    // Get statistics
    getStats() {
        return {
            clients: this.storage.clients.length,
            matters: this.storage.matters.length,
            timeEntries: this.storage.timeEntries.length,
            invoices: this.storage.invoices.length,
            documents: this.storage.documents.length,
            backups: this.storage.backups.length
        };
    }
    
    // Export data
    exportData(type = null, format = 'json') {
        const data = type ? this.storage[type] : this.storage;
        
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data);
            default:
                throw new Error(`Unsupported export format: ${format}`);
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
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    // Refresh data from storage
    refreshData() {
        this.loadFromStorage();
    }
}

// ========================================
// UTILITY CLASSES
// ========================================

class ErrorManager {
    static showCriticalError(message, error) {
        console.error('❌ Critical Error:', message, error);
        
        const errorBoundary = document.getElementById('errorBoundary');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorBoundary && errorMessage) {
            errorMessage.textContent = message;
            errorBoundary.style.display = 'flex';
        } else {
            alert(`Critical Error: ${message}\n\nPlease refresh the page and try again.`);
        }
    }
    
    static hideError() {
        const errorBoundary = document.getElementById('errorBoundary');
        if (errorBoundary) {
            errorBoundary.style.display = 'none';
        }
    }
    
    static handleGlobalError(event) {
        console.error('❌ Global Error:', event.error);
        ErrorManager.showCriticalError('An unexpected error occurred', event.error);
    }
    
    static handleUnhandledRejection(event) {
        console.error('❌ Unhandled Promise Rejection:', event.reason);
        ErrorManager.showCriticalError('A promise was rejected', event.reason);
    }
}

class ScreenReaderManager {
    static announce(message) {
        const announcer = document.getElementById('srAnnouncements');
        if (announcer) {
            announcer.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }
}

// Expose classes globally
window.PrometheusApplication = PrometheusApplication;
window.DataManager = DataManager;
window.ErrorManager = ErrorManager;
window.ScreenReaderManager = ScreenReaderManager;
window.APP_CONFIG = APP_CONFIG;
window.PRACTICE_AREAS = PRACTICE_AREAS;
window.USER_ROLES = USER_ROLES;
window.DOCUMENT_TYPES = DOCUMENT_TYPES;