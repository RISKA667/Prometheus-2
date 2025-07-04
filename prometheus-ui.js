/**
 * PROMETHEUS - USER INTERFACE MANAGEMENT SYSTEM
 * BRDN Conseils - Legal Management System
 * Version: 3.0.0
 */

'use strict';

// ========================================
// UI MANAGER - MASTER CONTROLLER
// ========================================

class UIManager {
    constructor(app) {
        this.app = app;
        this.currentSection = 'dashboard';
        this.activeModals = new Set();
        this.componentCache = new Map();
        this.animationQueue = [];
        this.isAnimating = false;
        
        // Performance monitoring
        this.renderTimes = new Map();
        this.componentStats = {
            renders: 0,
            errors: 0,
            cacheHits: 0
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // Setup UI event listeners
            this.setupGlobalUIListeners();
            
            // Initialize component system
            this.initializeComponents();
            
            // Setup accessibility features
            this.setupAccessibilityFeatures();
            
            // Initialize animation system
            this.initializeAnimationSystem();
            
            console.log('✅ UIManager initialized');
            
        } catch (error) {
            console.error('❌ UIManager initialization failed:', error);
            throw error;
        }
    }
    
    setupGlobalUIListeners() {
        // Global click handler for dynamic elements
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        
        // Form submission handler
        document.addEventListener('submit', this.handleGlobalSubmit.bind(this));
        
        // Input change handler
        document.addEventListener('input', this.handleGlobalInput.bind(this));
        
        // Resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Focus management
        document.addEventListener('focusin', this.handleFocusIn.bind(this));
        document.addEventListener('focusout', this.handleFocusOut.bind(this));
    }
    
    handleGlobalClick(event) {
        const target = event.target.closest('[data-action]');
        if (target) {
            event.preventDefault();
            this.executeAction(target.dataset.action, target, event);
        }
    }
    
    handleGlobalSubmit(event) {
        const form = event.target;
        if (form.hasAttribute('data-async')) {
            event.preventDefault();
            this.handleAsyncForm(form);
        }
    }
    
    handleGlobalInput(event) {
        const input = event.target;
        if (input.hasAttribute('data-validate')) {
            this.validateField(input);
        }
        if (input.hasAttribute('data-search')) {
            this.handleSearchInput(input);
        }
    }
    
    executeAction(action, element, event) {
        try {
            const [manager, method, ...params] = action.split('.');
            const targetManager = window[manager];
            
            if (targetManager && typeof targetManager[method] === 'function') {
                targetManager[method](...params, element, event);
            } else {
                console.warn(`Action not found: ${action}`);
            }
        } catch (error) {
            console.error(`Action execution failed: ${action}`, error);
            this.app.handleError(error, 'UIManager.executeAction');
        }
    }
    
    // ========================================
    // COMPONENT SYSTEM
    // ========================================
    
    initializeComponents() {
        this.components = {
            forms: new FormComponentManager(this),
            tables: new TableComponentManager(this),
            charts: new ChartComponentManager(this),
            modals: new ModalComponentManager(this),
            cards: new CardComponentManager(this),
            lists: new ListComponentManager(this)
        };
    }
    
    renderComponent(type, id, data, options = {}) {
        const startTime = performance.now();
        
        try {
            // Check cache first
            const cacheKey = `${type}_${id}_${JSON.stringify(data)}`;
            if (options.useCache && this.componentCache.has(cacheKey)) {
                this.componentStats.cacheHits++;
                return this.componentCache.get(cacheKey);
            }
            
            const component = this.components[type];
            if (!component) {
                throw new Error(`Unknown component type: ${type}`);
            }
            
            const result = component.render(id, data, options);
            
            // Cache result if enabled
            if (options.useCache) {
                this.componentCache.set(cacheKey, result);
            }
            
            this.componentStats.renders++;
            this.recordRenderTime(type, performance.now() - startTime);
            
            return result;
            
        } catch (error) {
            this.componentStats.errors++;
            console.error(`Component render failed: ${type}/${id}`, error);
            return this.renderErrorComponent(error);
        }
    }
    
    renderErrorComponent(error) {
        return `
            <div class="component-error" role="alert">
                <div class="error-icon">⚠️</div>
                <div class="error-message">
                    <h4>Component Error</h4>
                    <p>${error.message}</p>
                </div>
            </div>
        `;
    }
    
    recordRenderTime(type, time) {
        if (!this.renderTimes.has(type)) {
            this.renderTimes.set(type, []);
        }
        
        const times = this.renderTimes.get(type);
        times.push(time);
        
        // Keep only last 100 measurements
        if (times.length > 100) {
            times.splice(0, times.length - 100);
        }
    }
    
    // ========================================
    // SECTION MANAGEMENT
    // ========================================
    
    showSection(sectionName, options = {}) {
        try {
            const startTime = performance.now();
            
            // Validate section exists
            const section = document.getElementById(sectionName);
            if (!section) {
                throw new Error(`Section not found: ${sectionName}`);
            }
            
            // Save current section state
            this.saveCurrentSectionState();
            
            // Hide current section
            this.hideCurrentSection();
            
            // Show new section
            this.showNewSection(sectionName, options);
            
            // Update navigation
            this.updateNavigation(sectionName);
            
            // Update URL if needed
            if (options.updateUrl !== false) {
                this.updateUrl(sectionName);
            }
            
            // Track section change
            this.trackSectionChange(sectionName, performance.now() - startTime);
            
            // Announce to screen readers
            ScreenReaderManager.announce(`Navigated to ${sectionName} section`);
            
        } catch (error) {
            console.error('Section navigation failed:', error);
            this.app.handleError(error, 'UIManager.showSection');
        }
    }
    
    hideCurrentSection() {
        const currentSection = document.querySelector('.main-section.active');
        if (currentSection) {
            currentSection.classList.remove('active');
            currentSection.setAttribute('aria-hidden', 'true');
            
            // Trigger hide animation
            this.animateOut(currentSection);
        }
    }
    
    showNewSection(sectionName, options) {
        const section = document.getElementById(sectionName);
        
        // Set up section
        section.classList.add('active');
        section.setAttribute('aria-hidden', 'false');
        
        // Focus management
        const heading = section.querySelector('h1');
        if (heading) {
            heading.focus();
        }
        
        // Load section data
        this.loadSectionData(sectionName, options);
        
        // Trigger show animation
        this.animateIn(section);
        
        this.currentSection = sectionName;
    }
    
    updateNavigation(sectionName) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-current', 'false');
        });
        
        const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.setAttribute('aria-current', 'page');
        }
    }
    
    loadSectionData(sectionName, options) {
        const dataLoaders = {
            dashboard: () => this.app.updateDashboard(),
            clients: () => this.app.clientManager.loadClients(),
            matters: () => this.app.matterManager.loadMatters(),
            timetracking: () => this.app.timeTracker.loadTimeEntries(),
            billing: () => this.app.billingManager.loadBillingData(),
            documents: () => this.app.documentManager.loadDocuments(),
            analytics: () => this.app.analyticsManager.loadAnalytics()
        };
        
        const loader = dataLoaders[sectionName];
        if (loader) {
            try {
                loader();
            } catch (error) {
                console.error(`Failed to load data for section: ${sectionName}`, error);
            }
        }
    }
    
    // ========================================
    // MODAL MANAGEMENT
    // ========================================
    
    showModal(modalId, options = {}) {
        try {
            const modal = document.getElementById(modalId);
            if (!modal) {
                throw new Error(`Modal not found: ${modalId}`);
            }
            
            // Setup modal
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            
            // Focus management
            const firstFocusable = modal.querySelector('input, select, textarea, button');
            if (firstFocusable) {
                firstFocusable.focus();
            }
            
            // Add to active modals
            this.activeModals.add(modalId);
            
            // Setup backdrop click
            if (options.closeOnBackdrop !== false) {
                this.setupBackdropClose(modal);
            }
            
            // Setup escape key
            this.setupEscapeClose(modal);
            
            // Animate in
            this.animateModalIn(modal);
            
            // Track modal open
            this.trackModalOpen(modalId);
            
        } catch (error) {
            console.error('Modal show failed:', error);
            this.app.handleError(error, 'UIManager.showModal');
        }
    }
    
    hideModal(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (!modal) {
                return;
            }
            
            // Animate out
            this.animateModalOut(modal, () => {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            });
            
            // Remove from active modals
            this.activeModals.delete(modalId);
            
            // Restore focus
            this.restoreFocus();
            
            // Track modal close
            this.trackModalClose(modalId);
            
        } catch (error) {
            console.error('Modal hide failed:', error);
        }
    }
    
    setupBackdropClose(modal) {
        const backdrop = modal.querySelector('.modal-overlay, .form-container');
        if (backdrop) {
            backdrop.addEventListener('click', (event) => {
                if (event.target === backdrop) {
                    this.hideModal(modal.id);
                }
            });
        }
    }
    
    setupEscapeClose(modal) {
        const escapeHandler = (event) => {
            if (event.key === 'Escape') {
                this.hideModal(modal.id);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        
        document.addEventListener('keydown', escapeHandler);
    }
    
    // ========================================
    // FORM MANAGEMENT
    // ========================================
    
    showForm(formId, data = {}, options = {}) {
        try {
            const form = document.getElementById(formId);
            if (!form) {
                throw new Error(`Form not found: ${formId}`);
            }
            
            // Reset form
            this.resetForm(form);
            
            // Populate with data
            if (Object.keys(data).length > 0) {
                this.populateForm(form, data);
            }
            
            // Show form
            form.style.display = 'block';
            
            // Focus first field
            const firstField = form.querySelector('input, select, textarea');
            if (firstField) {
                firstField.focus();
            }
            
            // Setup validation
            this.setupFormValidation(form);
            
            // Track form open
            this.trackFormOpen(formId);
            
        } catch (error) {
            console.error('Form show failed:', error);
            this.app.handleError(error, 'UIManager.showForm');
        }
    }
    
    hideForm(formId) {
        try {
            const form = document.getElementById(formId);
            if (!form) {
                return;
            }
            
            form.style.display = 'none';
            this.resetForm(form);
            
            // Track form close
            this.trackFormClose(formId);
            
        } catch (error) {
            console.error('Form hide failed:', error);
        }
    }
    
    resetForm(form) {
        const formElement = form.querySelector('form');
        if (formElement) {
            formElement.reset();
        }
        
        // Clear validation errors
        form.querySelectorAll('.field-error').forEach(error => {
            error.textContent = '';
        });
        
        // Remove error classes
        form.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });
    }
    
    populateForm(form, data) {
        Object.entries(data).forEach(([key, value]) => {
            const field = form.querySelector(`[name="${key}"], #${key}`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = value;
                } else if (field.type === 'radio') {
                    const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
                    if (radio) {
                        radio.checked = true;
                    }
                } else {
                    field.value = value;
                }
            }
        });
    }
    
    setupFormValidation(form) {
        const fields = form.querySelectorAll('[data-validate]');
        fields.forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.clearFieldError(field));
        });
    }
    
    validateField(field) {
        const rules = field.dataset.validate.split('|');
        const value = field.value.trim();
        const errors = [];
        
        rules.forEach(rule => {
            const [ruleName, ...params] = rule.split(':');
            const validator = this.getValidator(ruleName);
            
            if (validator && !validator(value, params)) {
                errors.push(this.getValidationMessage(ruleName, params));
            }
        });
        
        this.showFieldErrors(field, errors);
        return errors.length === 0;
    }
    
    getValidator(ruleName) {
        const validators = {
            required: (value) => value.length > 0,
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            min: (value, params) => value.length >= parseInt(params[0]),
            max: (value, params) => value.length <= parseInt(params[0]),
            numeric: (value) => /^\d+$/.test(value),
            phone: (value) => /^[\+]?[\d\s\(\)\-\.]+$/.test(value)
        };
        
        return validators[ruleName];
    }
    
    getValidationMessage(ruleName, params) {
        const messages = {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            min: `Minimum ${params[0]} characters required`,
            max: `Maximum ${params[0]} characters allowed`,
            numeric: 'Please enter numbers only',
            phone: 'Please enter a valid phone number'
        };
        
        return messages[ruleName] || 'Invalid value';
    }
    
    showFieldErrors(field, errors) {
        const errorElement = field.parentElement.querySelector('.field-error');
        
        if (errors.length > 0) {
            field.classList.add('error');
            if (errorElement) {
                errorElement.textContent = errors[0];
            }
        } else {
            field.classList.remove('error');
            if (errorElement) {
                errorElement.textContent = '';
            }
        }
    }
    
    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentElement.querySelector('.field-error');
        if (errorElement) {
            errorElement.textContent = '';
        }
    }
    
    // ========================================
    // NOTIFICATION SYSTEM
    // ========================================
    
    showNotification(message, type = 'info', duration = 4000) {
        const notification = this.createNotification(message, type, duration);
        const container = document.getElementById('notificationContainer');
        
        if (container) {
            container.appendChild(notification);
            
            // Animate in
            requestAnimationFrame(() => {
                notification.classList.add('show');
            });
            
            // Auto-remove
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }
    }
    
    createNotification(message, type, duration) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || icons.info}</span>
                <span class="notification-message">${this.app.escapeHtml(message)}</span>
                <button class="notification-close" onclick="this.closest('.notification').remove()" aria-label="Close notification">✕</button>
            </div>
            <div class="notification-progress">
                <div class="progress-bar" style="animation-duration: ${duration}ms;"></div>
            </div>
        `;
        
        return notification;
    }
    
    removeNotification(notification) {
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }
    
    // ========================================
    // ANIMATION SYSTEM
    // ========================================
    
    initializeAnimationSystem() {
        this.animations = {
            fadeIn: 'fadeIn 0.3s ease-out',
            fadeOut: 'fadeOut 0.3s ease-out',
            slideInUp: 'slideInUp 0.4s ease-out',
            slideOutDown: 'slideOutDown 0.4s ease-out',
            scaleIn: 'scaleIn 0.3s ease-out',
            scaleOut: 'scaleOut 0.3s ease-out'
        };
        
        // Check for reduced motion preference
        this.respectsReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    
    animateIn(element, animation = 'fadeIn') {
        if (this.respectsReducedMotion) {
            return;
        }
        
        element.style.animation = this.animations[animation];
        element.addEventListener('animationend', () => {
            element.style.animation = '';
        }, { once: true });
    }
    
    animateOut(element, animation = 'fadeOut') {
        if (this.respectsReducedMotion) {
            return;
        }
        
        element.style.animation = this.animations[animation];
        element.addEventListener('animationend', () => {
            element.style.animation = '';
        }, { once: true });
    }
    
    animateModalIn(modal) {
        this.animateIn(modal.querySelector('.modal-container, .form-container'), 'scaleIn');
    }
    
    animateModalOut(modal, callback) {
        const container = modal.querySelector('.modal-container, .form-container');
        this.animateOut(container, 'scaleOut');
        
        if (callback) {
            container.addEventListener('animationend', callback, { once: true });
        }
    }
    
    // ========================================
    // ACCESSIBILITY FEATURES
    // ========================================
    
    setupAccessibilityFeatures() {
        // Skip links
        this.setupSkipLinks();
        
        // Focus management
        this.setupFocusManagement();
        
        // Keyboard navigation
        this.setupKeyboardNavigation();
        
        // Screen reader support
        this.setupScreenReaderSupport();
    }
    
    setupSkipLinks() {
        const skipLinks = document.querySelectorAll('.skip-link');
        skipLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.focus();
                }
            });
        });
    }
    
    setupFocusManagement() {
        // Store last focused element
        this.lastFocusedElement = null;
        
        document.addEventListener('focusin', (event) => {
            this.lastFocusedElement = event.target;
        });
    }
    
    restoreFocus() {
        if (this.lastFocusedElement && document.contains(this.lastFocusedElement)) {
            this.lastFocusedElement.focus();
        }
    }
    
    setupKeyboardNavigation() {
        // Tab trapping in modals
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab' && this.activeModals.size > 0) {
                this.trapFocusInModal(event);
            }
        });
    }
    
    trapFocusInModal(event) {
        const activeModal = document.querySelector('.form-container:not([style*="display: none"]), .search-modal:not([style*="display: none"])');
        if (!activeModal) return;
        
        const focusableElements = activeModal.querySelectorAll(
            'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey && document.activeElement === firstFocusable) {
            event.preventDefault();
            lastFocusable.focus();
        } else if (!event.shiftKey && document.activeElement === lastFocusable) {
            event.preventDefault();
            firstFocusable.focus();
        }
    }
    
    setupScreenReaderSupport() {
        // Live regions for dynamic content
        this.setupLiveRegions();
        
        // Proper labeling
        this.ensureProperLabeling();
    }
    
    setupLiveRegions() {
        const liveRegions = document.querySelectorAll('[aria-live]');
        liveRegions.forEach(region => {
            // Ensure proper ARIA attributes
            if (!region.hasAttribute('aria-atomic')) {
                region.setAttribute('aria-atomic', 'true');
            }
        });
    }
    
    ensureProperLabeling() {
        // Check for unlabeled form controls
        const formControls = document.querySelectorAll('input, select, textarea');
        formControls.forEach(control => {
            if (!control.hasAttribute('aria-label') && !control.hasAttribute('aria-labelledby')) {
                const label = control.parentElement.querySelector('label');
                if (label && !label.hasAttribute('for')) {
                    label.setAttribute('for', control.id || this.generateId());
                }
            }
        });
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    handleResize() {
        // Responsive behavior
        this.updateResponsiveClasses();
        
        // Recalculate layouts
        this.recalculateLayouts();
    }
    
    updateResponsiveClasses() {
        const width = window.innerWidth;
        const body = document.body;
        
        body.classList.remove('mobile', 'tablet', 'desktop');
        
        if (width < 768) {
            body.classList.add('mobile');
        } else if (width < 1024) {
            body.classList.add('tablet');
        } else {
            body.classList.add('desktop');
        }
    }
    
    recalculateLayouts() {
        // Trigger layout recalculation for charts and complex components
        if (this.app.analyticsManager) {
            this.app.analyticsManager.resizeCharts();
        }
    }
    
    handleFocusIn(event) {
        // Add focus indicator class to parent
        const parent = event.target.closest('.form-group, .nav-btn, .btn-primary, .btn-secondary');
        if (parent) {
            parent.classList.add('focused');
        }
    }
    
    handleFocusOut(event) {
        // Remove focus indicator class from parent
        const parent = event.target.closest('.form-group, .nav-btn, .btn-primary, .btn-secondary');
        if (parent) {
            parent.classList.remove('focused');
        }
    }
    
    generateId() {
        return 'ui_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // ========================================
    // PERFORMANCE MONITORING
    // ========================================
    
    getPerformanceStats() {
        const stats = {
            componentStats: this.componentStats,
            renderTimes: {},
            averageRenderTimes: {}
        };
        
        // Calculate average render times
        this.renderTimes.forEach((times, type) => {
            stats.renderTimes[type] = times;
            stats.averageRenderTimes[type] = times.reduce((sum, time) => sum + time, 0) / times.length;
        });
        
        return stats;
    }
    
    // ========================================
    // TRACKING & ANALYTICS
    // ========================================
    
    trackSectionChange(sectionName, loadTime) {
        console.log(`📊 Section: ${sectionName}, Load time: ${loadTime.toFixed(2)}ms`);
        
        // Could send to analytics service
        this.recordEvent('section_change', {
            section: sectionName,
            loadTime: loadTime,
            timestamp: Date.now()
        });
    }
    
    trackModalOpen(modalId) {
        this.recordEvent('modal_open', {
            modalId: modalId,
            timestamp: Date.now()
        });
    }
    
    trackModalClose(modalId) {
        this.recordEvent('modal_close', {
            modalId: modalId,
            timestamp: Date.now()
        });
    }
    
    trackFormOpen(formId) {
        this.recordEvent('form_open', {
            formId: formId,
            timestamp: Date.now()
        });
    }
    
    trackFormClose(formId) {
        this.recordEvent('form_close', {
            formId: formId,
            timestamp: Date.now()
        });
    }
    
    recordEvent(eventType, data) {
        // Store events for analytics
        const events = JSON.parse(sessionStorage.getItem('prometheus_ui_events') || '[]');
        events.push({
            type: eventType,
            data: data
        });
        
        // Keep only last 1000 events
        if (events.length > 1000) {
            events.splice(0, events.length - 1000);
        }
        
        sessionStorage.setItem('prometheus_ui_events', JSON.stringify(events));
    }
    
    saveCurrentSectionState() {
        // Save current section scroll position and form data
        const currentSection = document.querySelector('.main-section.active');
        if (currentSection) {
            const state = {
                scrollTop: currentSection.scrollTop,
                formData: this.getCurrentFormData(currentSection)
            };
            
            sessionStorage.setItem(`prometheus_section_${this.currentSection}`, JSON.stringify(state));
        }
    }
    
    getCurrentFormData(section) {
        const forms = section.querySelectorAll('form');
        const formData = {};
        
        forms.forEach(form => {
            const data = new FormData(form);
            formData[form.id] = Object.fromEntries(data);
        });
        
        return formData;
    }
    
    updateUrl(sectionName) {
        if (history.pushState) {
            const url = new URL(window.location);
            url.searchParams.set('section', sectionName);
            history.pushState({ section: sectionName }, '', url);
        }
    }
    
    handleAsyncForm(form) {
        // Handle form submission asynchronously
        const formData = new FormData(form);
        const action = form.action || form.dataset.action;
        
        if (action) {
            this.executeAction(action, form, { formData });
        }
    }
    
    handleSearchInput(input) {
        const searchTerm = input.value.trim();
        const searchType = input.dataset.search;
        
        // Debounce search
        clearTimeout(input.searchTimeout);
        input.searchTimeout = setTimeout(() => {
            this.performSearch(searchTerm, searchType);
        }, APP_CONFIG.searchDebounceDelay);
    }
    
    performSearch(term, type) {
        if (term.length < 2) return;
        
        try {
            const manager = this.getSearchManager(type);
            if (manager && typeof manager.search === 'function') {
                manager.search(term);
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    }
    
    getSearchManager(type) {
        const managers = {
            clients: this.app.clientManager,
            matters: this.app.matterManager,
            documents: this.app.documentManager,
            global: this.app.searchManager
        };
        
        return managers[type];
    }
}

// ========================================
// NAVIGATION MANAGER
// ========================================

class NavigationManager {
    constructor(app) {
        this.app = app;
        this.history = [];
        this.currentIndex = -1;
        
        this.setupNavigationListeners();
    }
    
    setupNavigationListeners() {
        // Browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.section) {
                this.showSection(event.state.section, { updateUrl: false });
            }
        });
        
        // Handle URL on page load
        this.handleInitialUrl();
    }
    
    handleInitialUrl() {
        const params = new URLSearchParams(window.location.search);
        const section = params.get('section');
        
        if (section && document.getElementById(section)) {
            this.showSection(section);
        }
    }
    
    showSection(sectionName, options = {}) {
        // Add to history
        this.addToHistory(sectionName);
        
        // Delegate to UI manager
        this.app.uiManager.showSection(sectionName, options);
    }
    
    addToHistory(sectionName) {
        this.currentIndex++;
        this.history = this.history.slice(0, this.currentIndex);
        this.history.push(sectionName);
    }
    
    goBack() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.showSection(this.history[this.currentIndex], { updateUrl: false });
        }
    }
    
    goForward() {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            this.showSection(this.history[this.currentIndex], { updateUrl: false });
        }
    }
}

// ========================================
// NOTIFICATION MANAGER
// ========================================

class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.maxNotifications = 5;
        this.defaultDuration = 4000;
    }
    
    showSuccess(message, duration = this.defaultDuration) {
        return this.show(message, 'success', duration);
    }
    
    showError(message, duration = this.defaultDuration * 2) {
        return this.show(message, 'error', duration);
    }
    
    showWarning(message, duration = this.defaultDuration) {
        return this.show(message, 'warning', duration);
    }
    
    showInfo(message, duration = this.defaultDuration) {
        return this.show(message, 'info', duration);
    }
    
    show(message, type = 'info', duration = this.defaultDuration) {
        if (window.prometheus && window.prometheus.uiManager) {
            window.prometheus.uiManager.showNotification(message, type, duration);
        } else {
            // Fallback for early initialization
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    clear() {
        const container = document.getElementById('notificationContainer');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// ========================================
// KEYBOARD MANAGER
// ========================================

class KeyboardManager {
    constructor(app) {
        this.app = app;
        this.shortcuts = new Map();
        this.isEnabled = true;
        
        this.setupKeyboardShortcuts();
        this.setupHelpSystem();
    }
    
    setupKeyboardShortcuts() {
        // Register default shortcuts
        this.registerShortcut('ctrl+d', () => navigationManager.showSection('dashboard'), 'Go to Dashboard');
        this.registerShortcut('ctrl+r', () => searchManager.showGlobalSearch(), 'Global Search');
        this.registerShortcut('ctrl+n', () => this.showQuickCreate(), 'Quick Create');
        this.registerShortcut('ctrl+t', () => timeTracker.toggleTimer(), 'Toggle Timer');
        this.registerShortcut('ctrl+s', () => this.saveData(), 'Save Data');
        this.registerShortcut('alt+c', () => navigationManager.showSection('clients'), 'Go to Clients');
        this.registerShortcut('alt+m', () => navigationManager.showSection('matters'), 'Go to Matters');
        this.registerShortcut('alt+d', () => navigationManager.showSection('documents'), 'Go to Documents');
        this.registerShortcut('alt+a', () => navigationManager.showSection('analytics'), 'Go to Analytics');
        this.registerShortcut('f1', () => this.toggleHelp(), 'Toggle Help');
        this.registerShortcut('escape', () => this.handleEscape(), 'Close/Cancel');
    }
    
    registerShortcut(combination, callback, description) {
        this.shortcuts.set(combination, {
            callback: callback,
            description: description
        });
    }
    
    showQuickCreate() {
        if (this.app.uiManager) {
            this.app.uiManager.quickCreateMenu();
        }
    }
    
    saveData() {
        if (this.app.dataManager) {
            this.app.dataManager.saveAllData();
            notificationManager.showSuccess('Data saved successfully');
        }
    }
    
    handleEscape() {
        if (this.app.uiManager) {
            this.app.uiManager.handleEscapeKey();
        }
    }
    
    toggleHelp() {
        const hints = document.getElementById('keyboardHints');
        if (hints) {
            const isVisible = hints.style.display !== 'none';
            hints.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    toggleHints() {
        this.toggleHelp();
    }
    
    setupHelpSystem() {
        // Auto-hide hints after 10 seconds for new users
        const hintsHidden = localStorage.getItem('prometheus_hints_hidden') === 'true';
        const hints = document.getElementById('keyboardHints');
        
        if (hints && !hintsHidden) {
            setTimeout(() => {
                hints.style.opacity = '0.7';
                setTimeout(() => {
                    hints.style.display = 'none';
                    localStorage.setItem('prometheus_hints_hidden', 'true');
                }, 3000);
            }, 10000);
        }
    }
    
    getShortcuts() {
        return Array.from(this.shortcuts.entries()).map(([combination, data]) => ({
            combination: combination,
            description: data.description
        }));
    }
    
    enable() {
        this.isEnabled = true;
    }
    
    disable() {
        this.isEnabled = false;
    }
}

// ========================================
// COMPONENT MANAGERS
// ========================================

class FormComponentManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }
    
    render(id, data, options) {
        // Render form components
        return `<form id="${id}" class="modern-form">${this.renderFields(data.fields)}</form>`;
    }
    
    renderFields(fields) {
        return fields.map(field => this.renderField(field)).join('');
    }
    
    renderField(field) {
        const types = {
            text: this.renderTextInput,
            email: this.renderEmailInput,
            select: this.renderSelect,
            textarea: this.renderTextarea
        };
        
        const renderer = types[field.type] || types.text;
        return renderer.call(this, field);
    }
    
    renderTextInput(field) {
        return `
            <div class="form-group">
                <label for="${field.id}">${field.label}</label>
                <input type="text" id="${field.id}" name="${field.name}" 
                       placeholder="${field.placeholder || ''}"
                       ${field.required ? 'required' : ''}>
                <span class="field-error"></span>
            </div>
        `;
    }
    
    renderEmailInput(field) {
        return `
            <div class="form-group">
                <label for="${field.id}">${field.label}</label>
                <input type="email" id="${field.id}" name="${field.name}" 
                       placeholder="${field.placeholder || ''}"
                       ${field.required ? 'required' : ''}>
                <span class="field-error"></span>
            </div>
        `;
    }
    
    renderSelect(field) {
        const options = field.options.map(option => 
            `<option value="${option.value}">${option.label}</option>`
        ).join('');
        
        return `
            <div class="form-group">
                <label for="${field.id}">${field.label}</label>
                <select id="${field.id}" name="${field.name}" ${field.required ? 'required' : ''}>
                    ${options}
                </select>
                <span class="field-error"></span>
            </div>
        `;
    }
    
    renderTextarea(field) {
        return `
            <div class="form-group">
                <label for="${field.id}">${field.label}</label>
                <textarea id="${field.id}" name="${field.name}" 
                          placeholder="${field.placeholder || ''}"
                          rows="${field.rows || 4}"
                          ${field.required ? 'required' : ''}></textarea>
                <span class="field-error"></span>
            </div>
        `;
    }
}

class TableComponentManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }
    
    render(id, data, options) {
        const { columns, rows } = data;
        
        return `
            <div class="table-container">
                <table id="${id}" class="data-table">
                    ${this.renderHeader(columns)}
                    ${this.renderBody(rows, columns)}
                </table>
            </div>
        `;
    }
    
    renderHeader(columns) {
        const headers = columns.map(col => 
            `<th>${col.label}</th>`
        ).join('');
        
        return `<thead><tr>${headers}</tr></thead>`;
    }
    
    renderBody(rows, columns) {
        const rowsHtml = rows.map(row => {
            const cells = columns.map(col => 
                `<td>${row[col.key] || ''}</td>`
            ).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        
        return `<tbody>${rowsHtml}</tbody>`;
    }
}

class ChartComponentManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }
    
    render(id, data, options) {
        return `
            <div class="chart-container">
                <canvas id="${id}" width="400" height="200"></canvas>
            </div>
        `;
    }
}

class ModalComponentManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }
    
    render(id, data, options) {
        return `
            <div id="${id}" class="modal-overlay" style="display: none;">
                <div class="modal-container">
                    <header class="modal-header">
                        <h2>${data.title}</h2>
                        <button class="modal-close" onclick="uiManager.hideModal('${id}')">✕</button>
                    </header>
                    <div class="modal-content">
                        ${data.content}
                    </div>
                </div>
            </div>
        `;
    }
}

class CardComponentManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }
    
    render(id, data, options) {
        return `
            <div id="${id}" class="card">
                <header class="card-header">
                    <h3>${data.title}</h3>
                </header>
                <div class="card-content">
                    ${data.content}
                </div>
            </div>
        `;
    }
}

class ListComponentManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }
    
    render(id, data, options) {
        const items = data.items.map(item => 
            `<li class="list-item">${item}</li>`
        ).join('');
        
        return `
            <ul id="${id}" class="component-list">
                ${items}
            </ul>
        `;
    }
}

window.UIManager = UIManager;
window.NavigationManager = NavigationManager;
window.NotificationManager = NotificationManager;
window.KeyboardManager = KeyboardManager;