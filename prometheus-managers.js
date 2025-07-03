/**
 * PROMETHEUS.EXE - SPECIALIZED BUSINESS LOGIC MANAGERS
 * BOURDON & Associates - Legal Management System
 * Version: 3.0.0 - Full English Native + Vectorized Architecture
 * 
 * Specialized managers for different business domains:
 * - ClientManager: Client relationship management
 * - MatterManager: Legal matter lifecycle management
 * - TimeTracker: Time tracking and billing
 * - BillingManager: Invoice generation and accounting
 * - DocumentManager: Document lifecycle management
 * - AnalyticsManager: Business intelligence and reporting
 * - SearchManager: Global search and filtering
 */

'use strict';

// ========================================
// CLIENT MANAGER - CRM FUNCTIONALITY
// ========================================

class ClientManager {
    constructor(app) {
        this.app = app;
        this.clients = [];
        this.filteredClients = [];
        this.sortOrder = 'name_asc';
        this.activeFilters = {
            tier: '',
            search: ''
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            await this.loadClients();
            this.setupClientEventListeners();
            console.log('✅ ClientManager initialized');
        } catch (error) {
            console.error('❌ ClientManager initialization failed:', error);
            throw error;
        }
    }
    
    setupClientEventListeners() {
        // Real-time search
        const searchInput = document.getElementById('clientSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.activeFilters.search = e.target.value;
                this.filterClients();
            });
        }
        
        // Tier filter
        const tierFilter = document.getElementById('clientTierFilter');
        if (tierFilter) {
            tierFilter.addEventListener('change', (e) => {
                this.activeFilters.tier = e.target.value;
                this.filterClients();
            });
        }
    }
    
    async loadClients() {
        try {
            this.clients = this.app.dataManager.read('clients');
            this.applyFiltersAndSort();
            this.renderClients();
            this.updateClientStats();
            
            console.log(`✅ Loaded ${this.clients.length} clients`);
        } catch (error) {
            console.error('❌ Failed to load clients:', error);
            throw error;
        }
    }
    
    showCreateForm() {
        try {
            // Reset form title
            const formTitle = document.getElementById('clientFormTitle');
            if (formTitle) {
                formTitle.textContent = 'New Client';
            }
            
            // Reset submit button
            const submitBtn = document.getElementById('clientSubmitBtn');
            if (submitBtn) {
                submitBtn.innerHTML = '<span class="btn-icon">💾</span><span class="btn-text">Create Client</span>';
            }
            
            // Clear editing state
            this.editingClientId = null;
            
            // Show form
            this.app.uiManager.showForm('clientForm');
            
            // Track form open
            this.trackClientAction('form_opened', { type: 'create' });
            
        } catch (error) {
            console.error('❌ Failed to show client form:', error);
            this.app.handleError(error, 'ClientManager.showCreateForm');
        }
    }
    
    showEditForm(clientId) {
        try {
            const client = this.clients.find(c => c.id === clientId);
            if (!client) {
                throw new Error(`Client not found: ${clientId}`);
            }
            
            // Update form title
            const formTitle = document.getElementById('clientFormTitle');
            if (formTitle) {
                formTitle.textContent = 'Edit Client';
            }
            
            // Update submit button
            const submitBtn = document.getElementById('clientSubmitBtn');
            if (submitBtn) {
                submitBtn.innerHTML = '<span class="btn-icon">💾</span><span class="btn-text">Update Client</span>';
            }
            
            // Set editing state
            this.editingClientId = clientId;
            
            // Populate form with client data
            this.app.uiManager.showForm('clientForm', client);
            
            // Track form open
            this.trackClientAction('form_opened', { type: 'edit', clientId: clientId });
            
        } catch (error) {
            console.error('❌ Failed to show edit client form:', error);
            this.app.handleError(error, 'ClientManager.showEditForm');
        }
    }
    
    hideForm() {
        this.app.uiManager.hideForm('clientForm');
        this.editingClientId = null;
    }
    
    submitForm(event) {
        event.preventDefault();
        
        try {
            // Validate form
            if (!this.validateClientForm()) {
                return;
            }
            
            // Get form data
            const formData = this.getClientFormData();
            
            if (this.editingClientId) {
                this.updateClient(this.editingClientId, formData);
            } else {
                this.createClient(formData);
            }
            
        } catch (error) {
            console.error('❌ Client form submission failed:', error);
            this.app.handleError(error, 'ClientManager.submitForm');
        }
    }
    
    validateClientForm() {
        const form = document.getElementById('clientForm');
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.app.uiManager.validateField(field)) {
                isValid = false;
            }
        });
        
        // Additional business logic validation
        const clientName = document.getElementById('clientName').value.trim();
        if (clientName) {
            const existingClient = this.clients.find(client => 
                client.name.toLowerCase() === clientName.toLowerCase() && 
                client.id !== this.editingClientId
            );
            
            if (existingClient) {
                this.app.uiManager.showFieldErrors(
                    document.getElementById('clientName'),
                    ['A client with this name already exists']
                );
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    getClientFormData() {
        return {
            name: document.getElementById('clientName').value.trim(),
            tier: document.getElementById('clientTier').value,
            contact: document.getElementById('clientContact').value.trim(),
            email: document.getElementById('clientEmail').value.trim(),
            phone: document.getElementById('clientPhone').value.trim(),
            address: document.getElementById('clientAddress').value.trim(),
            notes: document.getElementById('clientNotes').value.trim()
        };
    }
    
    createClient(clientData) {
        try {
            // Create client
            const client = this.app.dataManager.create('clients', {
                ...clientData,
                status: 'active',
                totalMatters: 0,
                totalBilled: 0,
                lastActivity: new Date().toISOString()
            });
            
            // Update local array
            this.clients.push(client);
            
            // Refresh display
            this.applyFiltersAndSort();
            this.renderClients();
            this.updateClientStats();
            
            // Hide form
            this.hideForm();
            
            // Show success message
            notificationManager.showSuccess(`Client "${client.name}" created successfully`);
            
            // Track action
            this.trackClientAction('created', { clientId: client.id });
            
            // Update dashboard
            this.app.updateDashboard();
            
            return client;
            
        } catch (error) {
            console.error('❌ Failed to create client:', error);
            notificationManager.showError('Failed to create client');
            throw error;
        }
    }
    
    updateClient(clientId, clientData) {
        try {
            // Update in database
            const updatedClient = this.app.dataManager.update('clients', clientId, clientData);
            
            // Update local array
            const index = this.clients.findIndex(c => c.id === clientId);
            if (index !== -1) {
                this.clients[index] = updatedClient;
            }
            
            // Refresh display
            this.applyFiltersAndSort();
            this.renderClients();
            
            // Hide form
            this.hideForm();
            
            // Show success message
            notificationManager.showSuccess(`Client "${updatedClient.name}" updated successfully`);
            
            // Track action
            this.trackClientAction('updated', { clientId: clientId });
            
            return updatedClient;
            
        } catch (error) {
            console.error('❌ Failed to update client:', error);
            notificationManager.showError('Failed to update client');
            throw error;
        }
    }
    
    deleteClient(clientId) {
        try {
            const client = this.clients.find(c => c.id === clientId);
            if (!client) {
                throw new Error(`Client not found: ${clientId}`);
            }
            
            // Check for associated matters
            const associatedMatters = this.app.matterManager.getMattersByClient(clientId);
            if (associatedMatters.length > 0) {
                const confirmMessage = `This client has ${associatedMatters.length} associated matter(s). Are you sure you want to delete?`;
                if (!confirm(confirmMessage)) {
                    return;
                }
            }
            
            // Delete from database
            this.app.dataManager.delete('clients', clientId);
            
            // Remove from local array
            this.clients = this.clients.filter(c => c.id !== clientId);
            
            // Refresh display
            this.applyFiltersAndSort();
            this.renderClients();
            this.updateClientStats();
            
            // Show success message
            notificationManager.showSuccess(`Client "${client.name}" deleted successfully`);
            
            // Track action
            this.trackClientAction('deleted', { clientId: clientId });
            
            // Update dashboard
            this.app.updateDashboard();
            
        } catch (error) {
            console.error('❌ Failed to delete client:', error);
            notificationManager.showError('Failed to delete client');
            throw error;
        }
    }
    
    filterClients() {
        try {
            this.filteredClients = this.clients.filter(client => {
                // Search filter
                if (this.activeFilters.search) {
                    const searchTerm = this.activeFilters.search.toLowerCase();
                    const searchableFields = [client.name, client.contact, client.email].join(' ').toLowerCase();
                    if (!searchableFields.includes(searchTerm)) {
                        return false;
                    }
                }
                
                // Tier filter
                if (this.activeFilters.tier && client.tier !== this.activeFilters.tier) {
                    return false;
                }
                
                return true;
            });
            
            this.sortClients();
            this.renderClients();
            
        } catch (error) {
            console.error('❌ Failed to filter clients:', error);
        }
    }
    
    sortClients() {
        const [field, direction] = this.sortOrder.split('_');
        
        this.filteredClients.sort((a, b) => {
            let aValue = a[field];
            let bValue = b[field];
            
            // Handle different data types
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (direction === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
    }
    
    applyFiltersAndSort() {
        this.filteredClients = [...this.clients];
        this.filterClients();
    }
    
    renderClients() {
        const container = document.getElementById('clientsList');
        if (!container) return;
        
        if (this.filteredClients.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }
        
        container.innerHTML = this.filteredClients.map(client => this.renderClientCard(client)).join('');
    }
    
    renderClientCard(client) {
        const matterCount = this.app.matterManager.getMattersByClient(client.id).length;
        const lastActivityDate = client.lastActivity ? new Date(client.lastActivity) : new Date(client.createdAt);
        
        return `
            <div class="client-card" data-client-id="${client.id}">
                <header class="card-header">
                    <h4>${this.app.escapeHtml(client.name)}</h4>
                    <span class="client-tier tier-${client.tier.toLowerCase().replace(' ', '-')}">${client.tier}</span>
                </header>
                
                <div class="card-content">
                    <div class="client-info">
                        <div class="info-row">
                            <span class="info-label">Contact:</span>
                            <span class="info-value">${this.app.escapeHtml(client.contact) || 'Not specified'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${this.app.escapeHtml(client.email) || 'Not specified'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Phone:</span>
                            <span class="info-value">${this.app.escapeHtml(client.phone) || 'Not specified'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Active Matters:</span>
                            <span class="info-value">${matterCount}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Last Activity:</span>
                            <span class="info-value">${this.app.formatRelativeTime(lastActivityDate)}</span>
                        </div>
                    </div>
                    
                    ${client.notes ? `
                        <div class="client-notes">
                            <span class="notes-label">Notes:</span>
                            <p class="notes-content">${this.app.escapeHtml(client.notes)}</p>
                        </div>
                    ` : ''}
                </div>
                
                <footer class="card-actions">
                    <button class="btn-small btn-primary" 
                            onclick="clientManager.showEditForm('${client.id}')" 
                            aria-label="Edit ${this.app.escapeHtml(client.name)}">
                        <span class="btn-icon">✏️</span>
                        Edit
                    </button>
                    <button class="btn-small" 
                            onclick="matterManager.showCreateFormForClient('${client.id}')" 
                            aria-label="Create matter for ${this.app.escapeHtml(client.name)}">
                        <span class="btn-icon">⚖️</span>
                        New Matter
                    </button>
                    <button class="btn-small btn-danger" 
                            onclick="clientManager.deleteClient('${client.id}')" 
                            aria-label="Delete ${this.app.escapeHtml(client.name)}">
                        <span class="btn-icon">🗑️</span>
                        Delete
                    </button>
                </footer>
            </div>
        `;
    }
    
    renderEmptyState() {
        if (this.activeFilters.search || this.activeFilters.tier) {
            return `
                <div class="empty-state filtered">
                    <div class="empty-icon">🔍</div>
                    <h3>No clients found</h3>
                    <p>No clients match your current filters</p>
                    <button class="btn-secondary" onclick="clientManager.clearFilters()">
                        Clear Filters
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <h3>No clients yet</h3>
                    <p>Create your first client to get started</p>
                    <button class="btn-primary" onclick="clientManager.showCreateForm()">
                        <span class="btn-icon">+</span>
                        Create First Client
                    </button>
                </div>
            `;
        }
    }
    
    clearFilters() {
        this.activeFilters = { tier: '', search: '' };
        
        // Reset UI controls
        const searchInput = document.getElementById('clientSearch');
        const tierFilter = document.getElementById('clientTierFilter');
        
        if (searchInput) searchInput.value = '';
        if (tierFilter) tierFilter.value = '';
        
        this.filterClients();
    }
    
    updateClientStats() {
        // Update client count in dashboard
        const totalClientsElement = document.getElementById('totalClients');
        if (totalClientsElement) {
            totalClientsElement.textContent = this.clients.length;
        }
    }
    
    // Search functionality
    search(searchTerm) {
        this.activeFilters.search = searchTerm;
        this.filterClients();
    }
    
    // Utility methods
    getActiveClients() {
        return this.clients.filter(client => client.status === 'active');
    }
    
    getClientCount() {
        return this.clients.length;
    }
    
    getClientById(clientId) {
        return this.clients.find(client => client.id === clientId);
    }
    
    getClientsByTier(tier) {
        return this.clients.filter(client => client.tier === tier);
    }
    
    // Analytics
    getClientAnalytics() {
        const analytics = {
            total: this.clients.length,
            byTier: {},
            averageMattersPerClient: 0,
            topClientsByBilling: []
        };
        
        // Count by tier
        this.clients.forEach(client => {
            analytics.byTier[client.tier] = (analytics.byTier[client.tier] || 0) + 1;
        });
        
        // Calculate average matters per client
        const totalMatters = this.clients.reduce((sum, client) => sum + (client.totalMatters || 0), 0);
        analytics.averageMattersPerClient = this.clients.length > 0 ? totalMatters / this.clients.length : 0;
        
        return analytics;
    }
    
    // Event tracking
    trackClientAction(action, data = {}) {
        const event = {
            type: 'client_action',
            action: action,
            timestamp: Date.now(),
            data: data
        };
        
        // Store for analytics
        const events = JSON.parse(sessionStorage.getItem('prometheus_client_events') || '[]');
        events.push(event);
        
        // Keep only last 1000 events
        if (events.length > 1000) {
            events.splice(0, events.length - 1000);
        }
        
        sessionStorage.setItem('prometheus_client_events', JSON.stringify(events));
    }
    
    // Export functionality
    exportClients(format = 'csv') {
        try {
            const data = this.clients.map(client => ({
                name: client.name,
                tier: client.tier,
                contact: client.contact,
                email: client.email,
                phone: client.phone,
                address: client.address,
                notes: client.notes,
                createdAt: client.createdAt,
                lastActivity: client.lastActivity
            }));
            
            const exported = this.app.dataManager.convertToCSV(data);
            
            // Download file
            const blob = new Blob([exported], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            notificationManager.showSuccess('Clients exported successfully');
            
        } catch (error) {
            console.error('❌ Failed to export clients:', error);
            notificationManager.showError('Failed to export clients');
        }
    }
}

// ========================================
// MATTER MANAGER - LEGAL MATTER LIFECYCLE
// ========================================

class MatterManager {
    constructor(app) {
        this.app = app;
        this.matters = [];
        this.filteredMatters = [];
        this.sortOrder = 'createdAt_desc';
        this.activeFilters = {
            practiceArea: '',
            status: '',
            client: '',
            search: ''
        };
        
        this.editingMatterId = null;
        this.initialize();
    }
    
    async initialize() {
        try {
            await this.loadMatters();
            this.setupMatterEventListeners();
            console.log('✅ MatterManager initialized');
        } catch (error) {
            console.error('❌ MatterManager initialization failed:', error);
            throw error;
        }
    }
    
    setupMatterEventListeners() {
        // Real-time search
        const searchInput = document.getElementById('matterSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.activeFilters.search = e.target.value;
                this.filterMatters();
            });
        }
        
        // Practice area filter
        const practiceFilter = document.getElementById('practiceAreaFilter');
        if (practiceFilter) {
            practiceFilter.addEventListener('change', (e) => {
                this.activeFilters.practiceArea = e.target.value;
                this.filterMatters();
            });
        }
        
        // Status filter
        const statusFilter = document.getElementById('matterStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.activeFilters.status = e.target.value;
                this.filterMatters();
            });
        }
    }
    
    async loadMatters() {
        try {
            this.matters = this.app.dataManager.read('matters');
            this.updateMatterClientSelects();
            this.applyFiltersAndSort();
            this.renderMatters();
            this.updateMatterStats();
            
            console.log(`✅ Loaded ${this.matters.length} matters`);
        } catch (error) {
            console.error('❌ Failed to load matters:', error);
            throw error;
        }
    }
    
    updateMatterClientSelects() {
        const selects = [
            'matterClient',
            'timerMatter',
            'documentMatter',
            'filterMatter'
        ];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            const currentValue = select.value;
            
            if (selectId === 'matterClient') {
                // Client selection for matter creation
                select.innerHTML = '<option value="">Select Client</option>';
                this.app.clientManager.getActiveClients().forEach(client => {
                    select.innerHTML += `<option value="${client.id}">${this.app.escapeHtml(client.name)}</option>`;
                });
            } else {
                // Matter selection for other components
                select.innerHTML = '<option value="">Select a matter</option>';
                this.matters.forEach(matter => {
                    const client = this.app.clientManager.getClientById(matter.clientId);
                    const displayName = client ? `${matter.code} - ${matter.title}` : `${matter.code} - ${matter.title} (Client deleted)`;
                    select.innerHTML += `<option value="${matter.id}">${this.app.escapeHtml(displayName)}</option>`;
                });
            }
            
            select.value = currentValue;
        });
    }
    
    showCreateForm() {
        try {
            // Update form title
            const formTitle = document.getElementById('matterFormTitle');
            if (formTitle) {
                formTitle.textContent = 'New Matter';
            }
            
            // Update submit button
            const submitBtn = document.getElementById('matterSubmitBtn');
            if (submitBtn) {
                submitBtn.innerHTML = '<span class="btn-icon">💾</span><span class="btn-text">Create Matter</span>';
            }
            
            // Clear editing state
            this.editingMatterId = null;
            
            // Update client dropdown
            this.updateMatterClientSelects();
            
            // Show form
            this.app.uiManager.showForm('matterForm');
            
            // Track form open
            this.trackMatterAction('form_opened', { type: 'create' });
            
        } catch (error) {
            console.error('❌ Failed to show matter form:', error);
            this.app.handleError(error, 'MatterManager.showCreateForm');
        }
    }
    
    showCreateFormForClient(clientId) {
        this.showCreateForm();
        
        // Pre-select client
        const clientSelect = document.getElementById('matterClient');
        if (clientSelect) {
            clientSelect.value = clientId;
        }
    }
    
    showEditForm(matterId) {
        try {
            const matter = this.matters.find(m => m.id === matterId);
            if (!matter) {
                throw new Error(`Matter not found: ${matterId}`);
            }
            
            // Update form title
            const formTitle = document.getElementById('matterFormTitle');
            if (formTitle) {
                formTitle.textContent = 'Edit Matter';
            }
            
            // Update submit button
            const submitBtn = document.getElementById('matterSubmitBtn');
            if (submitBtn) {
                submitBtn.innerHTML = '<span class="btn-icon">💾</span><span class="btn-text">Update Matter</span>';
            }
            
            // Set editing state
            this.editingMatterId = matterId;
            
            // Update client dropdown
            this.updateMatterClientSelects();
            
            // Populate form with matter data
            this.app.uiManager.showForm('matterForm', matter);
            
            // Track form open
            this.trackMatterAction('form_opened', { type: 'edit', matterId: matterId });
            
        } catch (error) {
            console.error('❌ Failed to show edit matter form:', error);
            this.app.handleError(error, 'MatterManager.showEditForm');
        }
    }
    
    hideForm() {
        this.app.uiManager.hideForm('matterForm');
        this.editingMatterId = null;
    }
    
    submitForm(event) {
        event.preventDefault();
        
        try {
            // Validate form
            if (!this.validateMatterForm()) {
                return;
            }
            
            // Get form data
            const formData = this.getMatterFormData();
            
            if (this.editingMatterId) {
                this.updateMatter(this.editingMatterId, formData);
            } else {
                this.createMatter(formData);
            }
            
        } catch (error) {
            console.error('❌ Matter form submission failed:', error);
            this.app.handleError(error, 'MatterManager.submitForm');
        }
    }
    
    validateMatterForm() {
        const form = document.getElementById('matterForm');
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.app.uiManager.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    getMatterFormData() {
        return {
            practice: document.getElementById('matterPractice').value,
            clientId: document.getElementById('matterClient').value,
            title: document.getElementById('matterTitle').value.trim(),
            description: document.getElementById('matterDescription').value.trim(),
            status: document.getElementById('matterStatus').value,
            estimatedBudget: parseFloat(document.getElementById('matterBudget').value) || 0
        };
    }
    
    createMatter(matterData) {
        try {
            // Generate matter code
            const matterCode = this.generateMatterCode(matterData.practice, matterData.clientId);
            
            // Create matter
            const matter = this.app.dataManager.create('matters', {
                ...matterData,
                code: matterCode,
                totalTime: 0,
                totalValue: 0,
                billedAmount: 0,
                unbilledAmount: 0
            });
            
            // Update local array
            this.matters.push(matter);
            
            // Update client selects
            this.updateMatterClientSelects();
            
            // Refresh display
            this.applyFiltersAndSort();
            this.renderMatters();
            this.updateMatterStats();
            
            // Hide form
            this.hideForm();
            
            // Show success message
            notificationManager.showSuccess(`Matter "${matter.title}" created successfully`);
            
            // Track action
            this.trackMatterAction('created', { matterId: matter.id });
            
            // Update dashboard
            this.app.updateDashboard();
            
            return matter;
            
        } catch (error) {
            console.error('❌ Failed to create matter:', error);
            notificationManager.showError('Failed to create matter');
            throw error;
        }
    }
    
    updateMatter(matterId, matterData) {
        try {
            // Update in database
            const updatedMatter = this.app.dataManager.update('matters', matterId, matterData);
            
            // Update local array
            const index = this.matters.findIndex(m => m.id === matterId);
            if (index !== -1) {
                this.matters[index] = updatedMatter;
            }
            
            // Update client selects
            this.updateMatterClientSelects();
            
            // Refresh display
            this.applyFiltersAndSort();
            this.renderMatters();
            
            // Hide form
            this.hideForm();
            
            // Show success message
            notificationManager.showSuccess(`Matter "${updatedMatter.title}" updated successfully`);
            
            // Track action
            this.trackMatterAction('updated', { matterId: matterId });
            
            return updatedMatter;
            
        } catch (error) {
            console.error('❌ Failed to update matter:', error);
            notificationManager.showError('Failed to update matter');
            throw error;
        }
    }
    
    deleteMatter(matterId) {
        try {
            const matter = this.matters.find(m => m.id === matterId);
            if (!matter) {
                throw new Error(`Matter not found: ${matterId}`);
            }
            
            // Check for associated time entries and documents
            const timeEntries = this.app.timeTracker.getTimeEntriesByMatter(matterId);
            const documents = this.app.documentManager.getDocumentsByMatter(matterId);
            
            if (timeEntries.length > 0 || documents.length > 0) {
                const confirmMessage = `This matter has ${timeEntries.length} time entries and ${documents.length} documents. Are you sure you want to delete?`;
                if (!confirm(confirmMessage)) {
                    return;
                }
            }
            
            // Delete from database
            this.app.dataManager.delete('matters', matterId);
            
            // Remove from local array
            this.matters = this.matters.filter(m => m.id !== matterId);
            
            // Update client selects
            this.updateMatterClientSelects();
            
            // Refresh display
            this.applyFiltersAndSort();
            this.renderMatters();
            this.updateMatterStats();
            
            // Show success message
            notificationManager.showSuccess(`Matter "${matter.title}" deleted successfully`);
            
            // Track action
            this.trackMatterAction('deleted', { matterId: matterId });
            
            // Update dashboard
            this.app.updateDashboard();
            
        } catch (error) {
            console.error('❌ Failed to delete matter:', error);
            notificationManager.showError('Failed to delete matter');
            throw error;
        }
    }
    
    generateMatterCode(practice, clientId) {
        const client = this.app.clientManager.getClientById(clientId);
        if (!client) {
            throw new Error('Client not found for matter code generation');
        }
        
        const year = new Date().getFullYear();
        const clientPrefix = client.name.toUpperCase().slice(0, 3).replace(/[^A-Z]/g, '');
        const clientMatters = this.matters.filter(m => m.clientId === clientId);
        const sequence = String(clientMatters.length + 1).padStart(3, '0');
        
        return `${practice}-${clientPrefix}-${year}-${sequence}`;
    }
    
    filterMatters() {
        try {
            this.filteredMatters = this.matters.filter(matter => {
                // Search filter
                if (this.activeFilters.search) {
                    const searchTerm = this.activeFilters.search.toLowerCase();
                    const searchableFields = [
                        matter.title, 
                        matter.code, 
                        matter.description,
                        matter.practice
                    ].join(' ').toLowerCase();
                    if (!searchableFields.includes(searchTerm)) {
                        return false;
                    }
                }
                
                // Practice area filter
                if (this.activeFilters.practiceArea && matter.practice !== this.activeFilters.practiceArea) {
                    return false;
                }
                
                // Status filter
                if (this.activeFilters.status && matter.status !== this.activeFilters.status) {
                    return false;
                }
                
                // Client filter
                if (this.activeFilters.client && matter.clientId !== this.activeFilters.client) {
                    return false;
                }
                
                return true;
            });
            
            this.sortMatters();
            this.renderMatters();
            
        } catch (error) {
            console.error('❌ Failed to filter matters:', error);
        }
    }
    
    sortMatters() {
        const [field, direction] = this.sortOrder.split('_');
        
        this.filteredMatters.sort((a, b) => {
            let aValue = a[field];
            let bValue = b[field];
            
            // Handle different data types
            if (field === 'createdAt' || field === 'updatedAt') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (direction === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
    }
    
    applyFiltersAndSort() {
        this.filteredMatters = [...this.matters];
        this.filterMatters();
    }
    
    renderMatters() {
        const container = document.getElementById('mattersList');
        if (!container) return;
        
        if (this.filteredMatters.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }
        
        container.innerHTML = this.filteredMatters.map(matter => this.renderMatterCard(matter)).join('');
    }
    
    renderMatterCard(matter) {
        const client = this.app.clientManager.getClientById(matter.clientId);
        const practiceArea = PRACTICE_AREAS[matter.practice];
        const timeEntries = this.app.timeTracker.getTimeEntriesByMatter(matter.id);
        const totalHours = timeEntries.reduce((sum, entry) => sum + entry.duration, 0) / 3600000;
        
        return `
            <div class="matter-card" data-matter-id="${matter.id}">
                <header class="card-header">
                    <div class="matter-title-section">
                        <h4>${this.app.escapeHtml(matter.title)}</h4>
                        <span class="matter-code">${matter.code}</span>
                    </div>
                    <span class="practice-badge" style="background-color: ${practiceArea?.color || '#666'}">
                        ${matter.practice}
                    </span>
                </header>
                
                <div class="card-content">
                    <div class="matter-info">
                        <div class="info-row">
                            <span class="info-label">Practice Area:</span>
                            <span class="info-value">${practiceArea?.name || matter.practice}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Client:</span>
                            <span class="info-value">${client ? this.app.escapeHtml(client.name) : 'Client deleted'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status:</span>
                            <span class="info-value status-${matter.status.toLowerCase().replace(' ', '-')}">${matter.status}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Total Hours:</span>
                            <span class="info-value">${totalHours.toFixed(1)}h</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Total Value:</span>
                            <span class="info-value">${this.app.formatCurrency(matter.totalValue || 0)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Created:</span>
                            <span class="info-value">${new Date(matter.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    ${matter.description ? `
                        <div class="matter-description">
                            <span class="description-label">Description:</span>
                            <p class="description-content">${this.app.escapeHtml(matter.description)}</p>
                        </div>
                    ` : ''}
                    
                    ${matter.estimatedBudget > 0 ? `
                        <div class="matter-budget">
                            <span class="budget-label">Estimated Budget:</span>
                            <span class="budget-amount">${this.app.formatCurrency(matter.estimatedBudget)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <footer class="card-actions">
                    <button class="btn-small btn-primary" 
                            onclick="matterManager.showEditForm('${matter.id}')" 
                            aria-label="Edit ${this.app.escapeHtml(matter.title)}">
                        <span class="btn-icon">✏️</span>
                        Edit
                    </button>
                    <button class="btn-small" 
                            onclick="timeTracker.startTimerForMatter('${matter.id}')" 
                            aria-label="Start timer for ${this.app.escapeHtml(matter.title)}">
                        <span class="btn-icon">⏱️</span>
                        Start Timer
                    </button>
                    <button class="btn-small" 
                            onclick="documentManager.showUploadFormForMatter('${matter.id}')" 
                            aria-label="Upload document for ${this.app.escapeHtml(matter.title)}">
                        <span class="btn-icon">📁</span>
                        Upload Doc
                    </button>
                    <button class="btn-small btn-danger" 
                            onclick="matterManager.deleteMatter('${matter.id}')" 
                            aria-label="Delete ${this.app.escapeHtml(matter.title)}">
                        <span class="btn-icon">🗑️</span>
                        Delete
                    </button>
                </footer>
            </div>
        `;
    }
    
    renderEmptyState() {
        if (Object.values(this.activeFilters).some(filter => filter)) {
            return `
                <div class="empty-state filtered">
                    <div class="empty-icon">🔍</div>
                    <h3>No matters found</h3>
                    <p>No matters match your current filters</p>
                    <button class="btn-secondary" onclick="matterManager.clearFilters()">
                        Clear Filters
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="empty-state">
                    <div class="empty-icon">⚖️</div>
                    <h3>No matters yet</h3>
                    <p>Create your first matter to get started</p>
                    <button class="btn-primary" onclick="matterManager.showCreateForm()">
                        <span class="btn-icon">+</span>
                        Create First Matter
                    </button>
                </div>
            `;
        }
    }
    
    clearFilters() {
        this.activeFilters = { practiceArea: '', status: '', client: '', search: '' };
        
        // Reset UI controls
        const searchInput = document.getElementById('matterSearch');
        const practiceFilter = document.getElementById('practiceAreaFilter');
        const statusFilter = document.getElementById('matterStatusFilter');
        
        if (searchInput) searchInput.value = '';
        if (practiceFilter) practiceFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        
        this.filterMatters();
    }
    
    updateMatterStats() {
        // Update matter count in dashboard
        const totalMattersElement = document.getElementById('totalMatters');
        if (totalMattersElement) {
            totalMattersElement.textContent = this.getActiveMatters().length;
        }
    }
    
    updateRecentMattersWidget() {
        const container = document.getElementById('recentMattersList');
        if (!container) return;
        
        const recentMatters = this.getRecentMatters(5);
        
        if (recentMatters.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚖️</div>
                    <p>No matters created yet</p>
                    <button class="btn-primary btn-sm" onclick="matterManager.showCreateForm()">
                        Create First Matter
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = recentMatters.map(matter => {
            const client = this.app.clientManager.getClientById(matter.clientId);
            return `
                <div class="widget-item matter-item">
                    <div class="item-content">
                        <h5>${this.app.escapeHtml(matter.title)}</h5>
                        <span class="item-code">${matter.code}</span>
                        <span class="item-meta">${client ? this.app.escapeHtml(client.name) : 'Client deleted'}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-link" onclick="matterManager.showEditForm('${matter.id}')">
                            Edit
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Search functionality
    search(searchTerm) {
        this.activeFilters.search = searchTerm;
        this.filterMatters();
    }
    
    // Utility methods
    getActiveMatters() {
        return this.matters.filter(matter => matter.status === 'Active');
    }
    
    getMatterCount() {
        return this.matters.length;
    }
    
    getMatterById(matterId) {
        return this.matters.find(matter => matter.id === matterId);
    }
    
    getMattersByClient(clientId) {
        return this.matters.filter(matter => matter.clientId === clientId);
    }
    
    getMattersByPracticeArea(practiceArea) {
        return this.matters.filter(matter => matter.practice === practiceArea);
    }
    
    getRecentMatters(limit = 10) {
        return [...this.matters]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }
    
    // Analytics
    getMatterAnalytics() {
        const analytics = {
            total: this.matters.length,
            byPracticeArea: {},
            byStatus: {},
            averageValue: 0,
            totalValue: 0
        };
        
        // Count by practice area
        this.matters.forEach(matter => {
            analytics.byPracticeArea[matter.practice] = (analytics.byPracticeArea[matter.practice] || 0) + 1;
            analytics.byStatus[matter.status] = (analytics.byStatus[matter.status] || 0) + 1;
            analytics.totalValue += matter.totalValue || 0;
        });
        
        analytics.averageValue = this.matters.length > 0 ? analytics.totalValue / this.matters.length : 0;
        
        return analytics;
    }
    
    // Event tracking
    trackMatterAction(action, data = {}) {
        const event = {
            type: 'matter_action',
            action: action,
            timestamp: Date.now(),
            data: data
        };
        
        // Store for analytics
        const events = JSON.parse(sessionStorage.getItem('prometheus_matter_events') || '[]');
        events.push(event);
        
        // Keep only last 1000 events
        if (events.length > 1000) {
            events.splice(0, events.length - 1000);
        }
        
        sessionStorage.setItem('prometheus_matter_events', JSON.stringify(events));
    }
}

// Export managers globally
window.ClientManager = ClientManager;
window.MatterManager = MatterManager;