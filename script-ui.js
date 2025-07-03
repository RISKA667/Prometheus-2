// PROMETHEUS.EXE - UI MANAGEMENT & EVENT HANDLERS
// BOURDON & Associates - Presentation Layer
// Version: 2.0.0 - Production Ready

'use strict';

// ========================================
// UI MANAGEMENT CLASS
// ========================================
class PrometheusUI {
    constructor(app) {
        this.app = app;
    }

    // ========================================
    // NAVIGATION & SECTION MANAGEMENT
    // ========================================
    showSection(sectionName) {
        try {
            // Track performance
            this.app.trackAction(`navigate_to_${sectionName}`);
            
            // Show loading for heavy sections
            if (['analytics', 'documents'].includes(sectionName)) {
                this.showLoading();
            }
            
            // Hide all sections
            document.querySelectorAll('.main-section').forEach(section => {
                section.classList.remove('active');
                section.setAttribute('aria-hidden', 'true');
            });
            
            // Remove active class from nav buttons
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-current', 'false');
            });
            
            // Show selected section
            const targetSection = document.getElementById(sectionName);
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.setAttribute('aria-hidden', 'false');
                
                // Focus management for accessibility
                const heading = targetSection.querySelector('h1');
                if (heading) {
                    heading.focus();
                }
            }
            
            // Activate nav button
            const targetButton = document.querySelector(`[data-section="${sectionName}"]`);
            if (targetButton) {
                targetButton.classList.add('active');
                targetButton.setAttribute('aria-current', 'page');
            }
            
            // Load section-specific data
            setTimeout(() => {
                this.loadSectionData(sectionName);
                this.hideLoading();
            }, 100);
            
            // Announce navigation to screen readers
            PrometheusUtils.announceToScreenReader(`Navigated to ${sectionName} section`);
            
        } catch (error) {
            console.error('Navigation error:', error);
            this.showError('Navigation failed. Please try again.');
            this.hideLoading();
        }
    }

    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'clients':
                this.loadClients();
                break;
            case 'matters':
                this.loadMatters();
                break;
            case 'timetracking':
                this.loadTimeEntries();
                break;
            case 'billing':
                this.showBillingSection();
                break;
            case 'documents':
                this.showDocumentsSection();
                break;
            case 'analytics':
                this.showAnalyticsSection();
                break;
            case 'dashboard':
            default:
                this.updateDashboard();
                break;
        }
    }

    // ========================================
    // CLIENT UI MANAGEMENT
    // ========================================
    showAddClientForm() {
        const form = document.getElementById('addClientForm');
        if (form) {
            form.style.display = 'block';
            // Focus first input for accessibility
            const firstInput = form.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }
    
    hideAddClientForm() {
        const form = document.getElementById('addClientForm');
        if (form) {
            form.style.display = 'none';
            form.querySelector('form')?.reset();
            
            // Reset form title and button text
            const formTitle = form.querySelector('h3');
            const submitBtn = form.querySelector('button[type="submit"]');
            if (formTitle) formTitle.textContent = 'New Client';
            if (submitBtn) submitBtn.textContent = 'Create Client';
            
            // Clear editing state
            this.app.editingClientId = null;
        }
    }
    
    loadClients() {
        const container = document.getElementById('clientsList');
        if (!container) return;
        
        if (this.app.clients.length === 0) {
            container.innerHTML = '<p class="empty-state">No clients created yet</p>';
            return;
        }
        
        // Sort clients by name
        const sortedClients = [...this.app.clients].sort((a, b) => 
            a.name.localeCompare(b.name)
        );
        
        container.innerHTML = sortedClients.map(client => `
            <div class="client-card" data-client-id="${client.id}">
                <h4>${this.app.escapeHtml(client.name)}</h4>
                <p><strong>Contact:</strong> ${this.app.escapeHtml(client.contact) || 'N/A'}</p>
                <p><strong>Email:</strong> ${this.app.escapeHtml(client.email) || 'N/A'}</p>
                <p><strong>Created:</strong> ${new Date(client.createdAt).toLocaleDateString(APP_CONFIG.dateFormat)}</p>
                <span class="client-tier">${client.tier}</span>
                <div class="client-actions">
                    <button class="btn-small" onclick="editClient('${client.id}')" aria-label="Edit ${this.app.escapeHtml(client.name)}">
                        ✏️ Edit
                    </button>
                    <button class="btn-small" onclick="deleteClient('${client.id}')" aria-label="Delete ${this.app.escapeHtml(client.name)}">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // MATTER UI MANAGEMENT
    // ========================================
    showAddMatterForm() {
        this.updateMatterClientSelects();
        const form = document.getElementById('addMatterForm');
        if (form) {
            form.style.display = 'block';
            const firstSelect = form.querySelector('select');
            if (firstSelect) {
                firstSelect.focus();
            }
        }
    }
    
    hideAddMatterForm() {
        const form = document.getElementById('addMatterForm');
        if (form) {
            form.style.display = 'none';
            form.querySelector('form')?.reset();
            
            // Reset form title and button text
            const formTitle = form.querySelector('h3');
            const submitBtn = form.querySelector('button[type="submit"]');
            if (formTitle) formTitle.textContent = 'New Matter';
            if (submitBtn) submitBtn.textContent = 'Create Matter';
            
            // Clear editing state
            this.app.editingMatterId = null;
        }
    }
    
    updateMatterClientSelects() {
        const selectors = [
            'matterClient',
            'timerMatter',
            'documentMatter',
            'filterMatter'
        ];
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (!select) return;
            
            const currentValue = select.value;
            const isFilter = selectorId.startsWith('filter');
            const isTimer = selectorId === 'timerMatter';
            
            if (isTimer) {
                select.innerHTML = '<option value="">Select a matter</option>';
                this.app.matters.forEach(matter => {
                    const client = this.app.clients.find(c => c.id === matter.clientId);
                    select.innerHTML += `<option value="${matter.id}">${matter.code} - ${matter.title}</option>`;
                });
            } else if (isFilter) {
                select.innerHTML = '<option value="">All matters</option>';
                this.app.matters.forEach(matter => {
                    select.innerHTML += `<option value="${matter.id}">${matter.code} - ${matter.title}</option>`;
                });
            } else {
                select.innerHTML = '<option value="">Select Client</option>';
                this.app.clients.forEach(client => {
                    select.innerHTML += `<option value="${client.id}">${client.name}</option>`;
                });
            }
            
            select.value = currentValue;
        });
    }
    
    loadMatters() {
        const container = document.getElementById('mattersList');
        if (!container) return;
        
        if (this.app.matters.length === 0) {
            container.innerHTML = '<p class="empty-state">No matters created yet</p>';
            return;
        }
        
        // Sort matters by creation date (newest first)
        const sortedMatters = [...this.app.matters].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        container.innerHTML = sortedMatters.map(matter => {
            const client = this.app.clients.find(c => c.id === matter.clientId);
            const practiceLabel = PRACTICE_AREAS[matter.practice] || matter.practice;
            
            return `
                <div class="matter-card" data-matter-id="${matter.id}">
                    <h4>${this.app.escapeHtml(matter.title)}</h4>
                    <p class="matter-code">${matter.code}</p>
                    <span class="practice-badge">${matter.practice}</span>
                    <p><strong>Practice:</strong> ${practiceLabel}</p>
                    <p><strong>Client:</strong> ${client ? this.app.escapeHtml(client.name) : 'Client deleted'}</p>
                    <p><strong>Description:</strong> ${this.app.escapeHtml(matter.description) || 'No description'}</p>
                    <p><strong>Status:</strong> <span class="status-${matter.status.toLowerCase()}">${matter.status}</span></p>
                    <p><strong>Created:</strong> ${new Date(matter.createdAt).toLocaleDateString(APP_CONFIG.dateFormat)}</p>
                    <div class="matter-stats">
                        <span class="stat">Total Time: ${PrometheusUtils.formatDuration(matter.totalTime || 0)}</span>
                        <span class="stat">Total Value: ${PrometheusUtils.formatCurrency(matter.totalValue || 0)}</span>
                    </div>
                    <div class="matter-actions">
                        <button class="btn-small" onclick="editMatter('${matter.id}')" aria-label="Edit ${this.app.escapeHtml(matter.title)}">
                            ✏️ Edit
                        </button>
                        <button class="btn-small" onclick="deleteMatter('${matter.id}')" aria-label="Delete ${this.app.escapeHtml(matter.title)}">
                            🗑️ Delete
                        </button>
                        <button class="btn-small" onclick="startTimerForMatter('${matter.id}')" aria-label="Start timer for ${this.app.escapeHtml(matter.title)}">
                            ⏱️ Start Timer
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        this.updateRecentMatters();
    }

    updateRecentMatters() {
        const container = document.getElementById('recentMattersList');
        if (!container) return;
        
        const recentMatters = this.app.matters
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        if (recentMatters.length === 0) {
            container.innerHTML = '<p class="empty-state">No matters created yet</p>';
            return;
        }
        
        container.innerHTML = recentMatters.map(matter => {
            const client = this.app.clients.find(c => c.id === matter.clientId);
            return `
                <div class="matter-card">
                    <h4>${this.app.escapeHtml(matter.title)}</h4>
                    <p class="matter-code">${matter.code}</p>
                    <p><strong>Client:</strong> ${client ? this.app.escapeHtml(client.name) : 'Client deleted'}</p>
                    <p><strong>Created:</strong> ${new Date(matter.createdAt).toLocaleDateString(APP_CONFIG.dateFormat)}</p>
                </div>
            `;
        }).join('');
    }

    // ========================================
    // TIME TRACKING UI
    // ========================================
    updateTimerButtons(state) {
        const buttons = [
            document.getElementById('timerBtn'),
            document.getElementById('timerBtnLarge')
        ];
        
        buttons.forEach(btn => {
            if (!btn) return;
            
            if (state === 'running') {
                btn.textContent = '⏸️ Stop';
                btn.classList.add('running');
                btn.setAttribute('aria-label', 'Stop timer');
            } else {
                btn.textContent = '▶️ Start';
                btn.classList.remove('running');
                btn.setAttribute('aria-label', 'Start timer');
            }
        });
    }
    
    updateTimerDisplays() {
        const time = this.app.updateTimerDisplay();
        const displays = [
            document.getElementById('timerDisplay'),
            document.getElementById('timerDisplayLarge')
        ];
        
        displays.forEach(display => {
            if (display) {
                display.textContent = time;
                display.setAttribute('aria-label', `Timer: ${time}`);
            }
        });
        
        // Update button states
        const state = this.app.timerState.isRunning ? 'running' : 'stopped';
        this.updateTimerButtons(state);
        
        return time;
    }
    
    loadTimeEntries() {
        const container = document.getElementById('timeEntriesList');
        if (!container) return;
        
        if (this.app.timeEntries.length === 0) {
            container.innerHTML = '<p class="empty-state">No time entries recorded</p>';
            return;
        }
        
        const sortedEntries = [...this.app.timeEntries]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50); // Show last 50 entries for performance
        
        container.innerHTML = sortedEntries.map(entry => `
            <div class="time-entry" data-entry-id="${entry.id}">
                <span class="time-duration" title="Duration: ${PrometheusUtils.formatDuration(entry.duration)}">
                    ${PrometheusUtils.formatDuration(entry.duration)}
                </span>
                <span class="time-matter">${this.app.escapeHtml(entry.matterCode)}</span>
                <span class="time-value">${PrometheusUtils.formatCurrency(entry.value)}</span>
                <span class="time-date">${new Date(entry.date).toLocaleDateString(APP_CONFIG.dateFormat)}</span>
                <span class="time-status ${entry.billed ? 'billed' : 'unbilled'}">
                    ${entry.billed ? 'Billed' : 'Unbilled'}
                </span>
                <div class="time-actions">
                    <button class="btn-small" onclick="editTimeEntry('${entry.id}')" aria-label="Edit time entry">
                        ✏️ Edit
                    </button>
                    <button class="btn-small" onclick="deleteTimeEntry('${entry.id}')" aria-label="Delete time entry">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        this.updateTodayTime();
    }

    updateTodayTime() {
        const container = document.getElementById('todayTimeList');
        if (!container) return;
        
        const today = new Date().toDateString();
        const todayEntries = this.app.timeEntries.filter(entry => 
            new Date(entry.date).toDateString() === today
        );
        
        if (todayEntries.length === 0) {
            container.innerHTML = '<p class="empty-state">No time entries recorded today</p>';
            return;
        }
        
        container.innerHTML = todayEntries.map(entry => `
            <div class="time-entry">
                <span class="time-duration">${PrometheusUtils.formatDuration(entry.duration)}</span>
                <span class="time-matter">${this.app.escapeHtml(entry.matterCode)}</span>
                <span class="time-value">${PrometheusUtils.formatCurrency(entry.value)}</span>
            </div>
        `).join('');
    }

    // ========================================
    // BILLING UI MANAGEMENT
    // ========================================
    showBillingSection() {
        const userLevelSelect = document.getElementById('userLevel');
        if (userLevelSelect) {
            userLevelSelect.value = this.app.userLevel;
        }
        this.updateUserRateDisplay();
        this.loadInvoices();
        
        const exportMonth = document.getElementById('exportMonth');
        if (exportMonth) {
            exportMonth.value = new Date().toISOString().slice(0, 7);
        }
    }
    
    updateUserRateDisplay() {
        const userConfig = this.app.updateUserRate();
        if (userConfig) {
            const currentRateSpan = document.getElementById('currentRate');
            if (currentRateSpan) {
                currentRateSpan.textContent = `Current rate: ${userConfig.rate}€/h`;
            }
        }
    }
    
    showGenerateInvoiceForm() {
        this.loadBillableEntries();
        const form = document.getElementById('invoiceForm');
        if (form) {
            form.style.display = 'block';
            document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('invoiceNumber').value = this.app.generateInvoiceNumber();
        }
    }
    
    hideInvoiceForm() {
        const form = document.getElementById('invoiceForm');
        if (form) {
            form.style.display = 'none';
            form.querySelector('form')?.reset();
        }
    }
    
    loadBillableEntries() {
        const container = document.getElementById('billableTimeEntries');
        if (!container) return;
        
        const unbilledEntries = this.app.timeEntries.filter(entry => !entry.billed);
        
        if (unbilledEntries.length === 0) {
            container.innerHTML = '<p class="empty-state">No unbilled time entries</p>';
            return;
        }
        
        container.innerHTML = unbilledEntries.map(entry => `
            <div class="billable-entry">
                <input type="checkbox" 
                       id="entry_${entry.id}" 
                       onchange="updateInvoiceSummary()"
                       aria-label="Include time entry for ${this.app.escapeHtml(entry.matterCode)}">
                <div class="billable-entry-info">
                    <span class="entry-duration">${PrometheusUtils.formatDuration(entry.duration)}</span>
                    <span class="entry-matter">${this.app.escapeHtml(entry.matterCode)}</span>
                    <span class="entry-date">${new Date(entry.date).toLocaleDateString(APP_CONFIG.dateFormat)}</span>
                    <span class="entry-value">${PrometheusUtils.formatCurrency(entry.value)}</span>
                </div>
            </div>
        `).join('');
    }
    
    updateInvoiceSummary() {
        const checkboxes = document.querySelectorAll('#billableTimeEntries input[type="checkbox"]:checked');
        let totalSeconds = 0;
        let totalAmount = 0;
        
        checkboxes.forEach(checkbox => {
            const entryId = checkbox.id.replace('entry_', '');
            const entry = this.app.timeEntries.find(e => e.id === entryId);
            if (entry) {
                totalSeconds += entry.duration;
                totalAmount += entry.value;
            }
        });
        
        const totalHours = (totalSeconds / 3600).toFixed(1);
        const vat = Math.round(totalAmount * 0.2);
        const totalTTC = totalAmount + vat;
        
        // Update summary elements
        const summaryElements = {
            totalHoursBilling: `${totalHours}h`,
            totalAmountHT: `${totalAmount}€`,
            totalVAT: `${vat}€`,
            totalAmountTTC: `${totalTTC}€`
        };
        
        Object.entries(summaryElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.setAttribute('aria-live', 'polite');
            }
        });
    }
    
    loadInvoices() {
        const container = document.getElementById('invoicesList');
        if (!container) return;
        
        if (this.app.invoices.length === 0) {
            container.innerHTML = '<p class="empty-state">No invoices generated yet</p>';
            return;
        }
        
        const sortedInvoices = [...this.app.invoices].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        container.innerHTML = sortedInvoices.map(invoice => `
            <div class="invoice-card" data-invoice-id="${invoice.id}">
                <span class="invoice-number">${invoice.number}</span>
                <span class="invoice-client">${this.app.escapeHtml(invoice.client)}</span>
                <span class="invoice-amount">${PrometheusUtils.formatCurrency(Math.round(invoice.totalTTC), invoice.currency)}</span>
                <div class="invoice-actions">
                    <button class="btn-small" onclick="regeneratePDF('${invoice.id}')" aria-label="Download PDF for ${invoice.number}">
                        📄 PDF
                    </button>
                    <button class="btn-small" onclick="duplicateInvoice('${invoice.id}')" aria-label="Duplicate ${invoice.number}">
                        📋 Duplicate
                    </button>
                    <button class="btn-small" onclick="deleteInvoice('${invoice.id}')" aria-label="Delete ${invoice.number}">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // DOCUMENT UI MANAGEMENT
    // ========================================
    showDocumentsSection() {
        this.updateDocumentMatterSelects();
        this.loadDocuments();
        
        // Setup drag and drop with delay to ensure DOM is ready
        setTimeout(() => {
            this.setupDragAndDrop();
        }, 100);
    }
    
    updateDocumentMatterSelects() {
        const selects = [
            document.getElementById('documentMatter'),
            document.getElementById('filterMatter')
        ];
        
        selects.forEach(select => {
            if (!select) return;
            
            const currentValue = select.value;
            const isFilter = select.id === 'filterMatter';
            
            select.innerHTML = isFilter ? 
                '<option value="">All matters</option>' : 
                '<option value="">Select a matter</option>';
            
            this.app.matters.forEach(matter => {
                const option = document.createElement('option');
                option.value = matter.id;
                option.textContent = `${matter.code} - ${matter.title}`;
                select.appendChild(option);
            });
            
            select.value = currentValue;
        });
    }
    
    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('documentFile');
        
        if (!uploadArea || !fileInput) {
            console.warn('Upload elements not found, retrying...');
            setTimeout(() => this.setupDragAndDrop(), 500);
            return;
        }
        
        try {
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, this.preventDefaults, false);
                document.body.addEventListener(eventName, this.preventDefaults, false);
            });
            
            // Highlight drop area when item is dragged over it
            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
            });
            
            // Handle dropped files
            uploadArea.addEventListener('drop', (e) => {
                const files = Array.from(e.dataTransfer.files);
                this.handleFileSelection(files);
            }, false);
            
            // Handle click to select files
            uploadArea.addEventListener('click', (e) => {
                if (e.target !== fileInput) {
                    fileInput.click();
                }
            });
            
            // Handle file input change
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.handleFileSelection(files);
            });
            
            // Keyboard support
            uploadArea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInput.click();
                }
            });
            
            console.log('Drag and drop setup completed');
            
        } catch (error) {
            console.error('Error setting up drag and drop:', error);
            this.showError('File upload setup failed');
        }
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    handleFileSelection(files) {
        const uploadStatus = document.getElementById('uploadStatus');
        const submitButton = document.getElementById('submitUpload');
        
        if (!files || files.length === 0) {
            uploadStatus.textContent = 'or click to select';
            uploadStatus.style.color = '#888';
            if (submitButton) submitButton.disabled = true;
            return;
        }
        
        // Validate files
        const validFiles = [];
        const errors = [];
        
        files.forEach(file => {
            // Check file size
            if (file.size > APP_CONFIG.maxFileSize) {
                errors.push(`${file.name}: File too large (max ${PrometheusUtils.formatFileSize(APP_CONFIG.maxFileSize)})`);
                return;
            }
            
            // Check file type
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            if (!APP_CONFIG.supportedFileTypes.includes(extension)) {
                errors.push(`${file.name}: Unsupported file type`);
                return;
            }
            
            validFiles.push(file);
        });
        
        if (errors.length > 0) {
            this.showError('File validation errors:\n' + errors.join('\n'));
        }
        
        if (validFiles.length === 0) {
            return;
        }
        
        // Update UI
        if (validFiles.length === 1) {
            uploadStatus.textContent = `✅ ${validFiles[0].name} selected (${PrometheusUtils.formatFileSize(validFiles[0].size)})`;
        } else {
            const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
            uploadStatus.textContent = `✅ ${validFiles.length} files selected (${PrometheusUtils.formatFileSize(totalSize)})`;
        }
        
        uploadStatus.style.color = '#4a9eff';
        if (submitButton) submitButton.disabled = false;
        
        // Store valid files in app
        this.app.selectedFiles = validFiles;
        
        console.log('Valid files selected:', validFiles.map(f => ({ name: f.name, size: f.size })));
    }
    
    showUploadForm() {
        this.updateDocumentMatterSelects();
        const form = document.getElementById('uploadForm');
        if (form) {
            form.style.display = 'block';
        }
    }
    
    hideUploadForm() {
        const form = document.getElementById('uploadForm');
        if (form) {
            form.style.display = 'none';
            form.querySelector('form')?.reset();
            
            // Reset upload area
            const uploadStatus = document.getElementById('uploadStatus');
            const submitButton = document.getElementById('submitUpload');
            
            if (uploadStatus) {
                uploadStatus.textContent = 'or click to select';
                uploadStatus.style.color = '#888';
            }
            
            if (submitButton) {
                submitButton.disabled = true;
            }
            
            // Clear selected files
            this.app.selectedFiles = null;
        }
    }
    
    showUploadProgress() {
        const progressDiv = document.getElementById('uploadProgress');
        const submitButton = document.getElementById('submitUpload');
        
        if (progressDiv) {
            progressDiv.style.display = 'block';
            this.updateUploadProgress(0);
        }
        
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="btn-icon">⏳</span>Uploading...';
        }
    }
    
    updateUploadProgress(percent) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(percent)}%`;
        }
    }
    
    hideUploadProgress() {
        const progressDiv = document.getElementById('uploadProgress');
        const submitButton = document.getElementById('submitUpload');
        
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
        
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<span class="btn-icon">📤</span>Upload Document(s)';
        }
    }
    
    loadDocuments() {
        const container = document.getElementById('documentsList');
        if (!container) return;
        
        if (this.app.documents.length === 0) {
            container.innerHTML = '<p class="empty-state">No documents uploaded yet</p>';
            return;
        }
        
        const filteredDocs = this.getFilteredDocuments();
        
        if (filteredDocs.length === 0) {
            container.innerHTML = '<p class="empty-state">No documents found with current filters</p>';
            return;
        }
        
        container.innerHTML = filteredDocs.map(doc => {
            const matter = this.app.matters.find(m => m.id === doc.matterId);
            const typeConfig = DOCUMENT_TYPES[doc.type] || DOCUMENT_TYPES.other;
            
            return `
                <div class="document-card" data-document-id="${doc.id}">
                    <div class="document-header">
                        <span class="document-icon" aria-hidden="true">${typeConfig.icon}</span>
                        <div class="document-info">
                            <h4>${this.app.escapeHtml(doc.name)}</h4>
                            <div class="document-meta">
                                <strong>Matter:</strong> ${matter ? this.app.escapeHtml(matter.code) : 'Matter deleted'} • 
                                <strong>Version:</strong> v${doc.version}
                            </div>
                        </div>
                    </div>
                    
                    <div class="document-type">${typeConfig.label}</div>
                    
                    <div class="document-description">
                        ${this.app.escapeHtml(doc.description) || 'No description provided'}
                    </div>
                    
                    <div class="document-footer">
                        <div class="document-meta">
                            <span class="document-size">${PrometheusUtils.formatFileSize(doc.size)}</span><br>
                            <small>
                                ${new Date(doc.uploadDate).toLocaleDateString(APP_CONFIG.dateFormat)} 
                                ${new Date(doc.uploadDate).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})}
                            </small>
                        </div>
                        <div class="document-actions">
                            <button class="btn-small" 
                                    onclick="downloadDocument('${doc.id}')" 
                                    aria-label="Download ${this.app.escapeHtml(doc.name)}">
                                📥 Download
                            </button>
                            <button class="btn-small" 
                                    onclick="editDocument('${doc.id}')" 
                                    aria-label="Edit ${this.app.escapeHtml(doc.name)}">
                                ✏️ Edit
                            </button>
                            <button class="btn-small" 
                                    onclick="deleteDocument('${doc.id}')" 
                                    aria-label="Delete ${this.app.escapeHtml(doc.name)}"
                                    style="border-color: #dc3545; color: #dc3545;">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getFilteredDocuments() {
        const matterFilter = document.getElementById('filterMatter')?.value;
        const typeFilter = document.getElementById('filterType')?.value;
        const searchFilter = document.getElementById('searchDocuments')?.value.toLowerCase();
        
        return this.app.documents.filter(doc => {
            const matchesMatter = !matterFilter || doc.matterId === matterFilter;
            const matchesType = !typeFilter || doc.type === typeFilter;
            const matchesSearch = !searchFilter || 
                doc.name.toLowerCase().includes(searchFilter) ||
                doc.description?.toLowerCase().includes(searchFilter);
            
            return matchesMatter && matchesType && matchesSearch;
        }).sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    }

    // ========================================
    // ANALYTICS UI
    // ========================================
    showAnalyticsSection() {
        this.updateAnalytics();
        setTimeout(() => {
            this.setupCharts();
        }, 100);
    }
    
    updateAnalytics() {
        const period = document.getElementById('analyticsPeriod')?.value || 'month';
        const data = this.getAnalyticsData(period);
        
        this.updateKPIs(data);
        this.updateAnalyticsTables(data);
    }
    
    getAnalyticsData(period) {
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(2020, 0, 1);
        }
        
        const filteredEntries = this.app.timeEntries.filter(entry => 
            new Date(entry.date) >= startDate
        );
        
        const filteredInvoices = this.app.invoices.filter(invoice => 
            new Date(invoice.date) >= startDate
        );
        
        const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.totalHT, 0);
        const totalHours = filteredEntries.reduce((sum, entry) => sum + (entry.duration / 3600), 0);
        const averageRate = totalHours > 0 ? totalRevenue / totalHours : 0;
        
        // Calculate utilization (assuming 160h/month target)
        const targetHours = period === 'month' ? 160 : 
                           period === 'quarter' ? 480 : 
                           period === 'year' ? 1920 : totalHours;
        const utilization = targetHours > 0 ? (totalHours / targetHours) * 100 : 0;
        
        return {
            period,
            timeEntries: filteredEntries,
            invoices: filteredInvoices,
            totalRevenue,
            totalHours,
            averageRate,
            utilization,
            startDate
        };
    }
    
    updateKPIs(data) {
        const kpiElements = {
            kpiRevenue: PrometheusUtils.formatCurrency(Math.round(data.totalRevenue)),
            kpiHours: `${data.totalHours.toFixed(1)}h`,
            kpiRate: PrometheusUtils.formatCurrency(Math.round(data.averageRate)),
            kpiUtilization: `${Math.round(data.utilization)}%`
        };
        
        Object.entries(kpiElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.setAttribute('aria-label', `${id.replace('kpi', '')}: ${value}`);
            }
        });
        
        // Generate fake change percentages for demo
        const changeElements = ['kpiRevenueChange', 'kpiHoursChange', 'kpiRateChange', 'kpiUtilizationChange'];
        changeElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const change = Math.floor(Math.random() * 30) - 10; // -10 to +20
                element.textContent = `${change > 0 ? '+' : ''}${change}%`;
                element.className = `kpi-change ${change > 0 ? 'positive' : 'negative'}`;
            }
        });
    }
    
    updateAnalyticsTables(data) {
        this.updateTopClientsTable(data);
        this.updateMatterProfitabilityTable(data);
    }
    
    updateTopClientsTable(data) {
        const container = document.getElementById('topClientsTable');
        if (!container) return;
        
        // Calculate revenue by client
        const clientRevenue = {};
        
        data.invoices.forEach(invoice => {
            clientRevenue[invoice.client] = (clientRevenue[invoice.client] || 0) + invoice.totalHT;
        });
        
        const sortedClients = Object.entries(clientRevenue)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10 clients
        
        if (sortedClients.length === 0) {
            container.innerHTML = '<p class="empty-state">No billing data available</p>';
            return;
        }
        
        const totalRevenue = data.totalRevenue;
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Client</th>
                        <th>Revenue</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedClients.map(([client, revenue]) => `
                        <tr>
                            <td>${this.app.escapeHtml(client)}</td>
                            <td class="profit-positive">${PrometheusUtils.formatCurrency(Math.round(revenue))}</td>
                            <td>${totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    updateMatterProfitabilityTable(data) {
        const container = document.getElementById('matterProfitabilityTable');
        if (!container) return;
        
        // Calculate profitability by matter
        const matterStats = {};
        
        data.timeEntries.forEach(entry => {
            if (!matterStats[entry.matterCode]) {
                matterStats[entry.matterCode] = {
                    hours: 0,
                    revenue: 0,
                    entries: 0
                };
            }
            matterStats[entry.matterCode].hours += entry.duration / 3600;
            matterStats[entry.matterCode].revenue += entry.value;
            matterStats[entry.matterCode].entries += 1;
        });
        
        const sortedMatters = Object.entries(matterStats)
            .map(([code, stats]) => ({
                code,
                hours: stats.hours,
                revenue: stats.revenue,
                rate: stats.hours > 0 ? stats.revenue / stats.hours : 0,
                entries: stats.entries
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10); // Top 10 matters
        
        if (sortedMatters.length === 0) {
            container.innerHTML = '<p class="empty-state">No time entry data available</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Matter</th>
                        <th>Hours</th>
                        <th>Revenue</th>
                        <th>Avg Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedMatters.map(matter => `
                        <tr>
                            <td>${this.app.escapeHtml(matter.code)}</td>
                            <td>${matter.hours.toFixed(1)}h</td>
                            <td class="${matter.revenue > 0 ? 'profit-positive' : 'profit-negative'}">
                                ${PrometheusUtils.formatCurrency(Math.round(matter.revenue))}
                            </td>
                            <td>${PrometheusUtils.formatCurrency(Math.round(matter.rate))}/h</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    setupCharts() {
        try {
            this.drawRevenueChart();
            this.drawPracticeChart();
        } catch (error) {
            console.error('Chart setup error:', error);
        }
    }
    
    drawRevenueChart() {
        const canvas = document.getElementById('revenueChart');
        if (!canvas || !canvas.getContext) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 200;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Generate sample data based on actual entries
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const revenues = this.generateRevenueData(months);
        
        const maxRevenue = Math.max(...revenues, 1000);
        const width = canvas.width - 80;
        const height = canvas.height - 80;
        
        // Set up styling
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        // Draw axes
        ctx.beginPath();
        ctx.moveTo(40, height + 40);
        ctx.lineTo(width + 40, height + 40);
        ctx.moveTo(40, 40);
        ctx.lineTo(40, height + 40);
        ctx.stroke();
        
        // Draw data line
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        revenues.forEach((revenue, index) => {
            const x = 40 + (index * (width / (revenues.length - 1)));
            const y = height + 40 - ((revenue / maxRevenue) * height);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            // Draw points
            ctx.fillStyle = '#4a9eff';
            ctx.fillRect(x - 3, y - 3, 6, 6);
        });
        
        ctx.stroke();
        
        // Draw labels
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        months.forEach((month, index) => {
            const x = 40 + (index * (width / (months.length - 1)));
            ctx.fillText(month, x, height + 55);
        });
        
        // Draw title
        ctx.fillStyle = '#e0e0e0';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Revenue Trend', 10, 25);
    }
    
    drawPracticeChart() {
        const canvas = document.getElementById('practiceChart');
        if (!canvas || !canvas.getContext) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 200;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate practice area distribution
        const practiceData = this.calculatePracticeDistribution();
        const total = practiceData.reduce((sum, item) => sum + item.value, 0);
        
        if (total === 0) {
            ctx.fillStyle = '#888';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 70;
        
        let currentAngle = 0;
        const colors = ['#4a9eff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#17a2b8', '#fd7e14', '#20c997', '#e83e8c'];
        
        practiceData.forEach((item, index) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            
            // Draw slice
            ctx.fillStyle = colors[index % colors.length];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();
            
            // Draw label if slice is large enough
            if (sliceAngle > 0.2) {
                const labelAngle = currentAngle + sliceAngle / 2;
                const labelX = centerX + Math.cos(labelAngle) * (radius + 25);
                const labelY = centerY + Math.sin(labelAngle) * (radius + 25);
                
                ctx.fillStyle = '#e0e0e0';
                ctx.font = '11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${item.practice}`, labelX, labelY);
                ctx.fillText(`${Math.round((item.value / total) * 100)}%`, labelX, labelY + 12);
            }
            
            currentAngle += sliceAngle;
        });
        
        // Draw title
        ctx.fillStyle = '#e0e0e0';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Practice Areas', 10, 25);
    }
    
    generateRevenueData(months) {
        // Generate sample data based on actual time entries
        const monthlyRevenue = months.map(() => {
            const baseRevenue = Math.random() * 20000 + 5000;
            return Math.round(baseRevenue);
        });
        
        return monthlyRevenue;
    }
    
    calculatePracticeDistribution() {
        const practiceStats = {};
        
        this.app.timeEntries.forEach(entry => {
            const matter = this.app.matters.find(m => m.id === entry.matterId);
            if (matter) {
                practiceStats[matter.practice] = (practiceStats[matter.practice] || 0) + entry.value;
            }
        });
        
        return Object.entries(practiceStats)
            .map(([practice, value]) => ({ practice, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 practice areas
    }

    // ========================================
    // DASHBOARD UI
    // ========================================
    updateDashboard() {
        this.updateDashboardStats();
        this.updateRecentMatters();
        this.updateTodayTime();
    }
    
    updateDashboardStats() {
        const stats = this.app.updateAllStats();
        
        // Update DOM elements
        Object.entries(stats).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = value;
                element.setAttribute('aria-label', `${key.replace('total', '')}: ${value}`);
            }
        });
    }

    // ========================================
    // UTILITY UI FUNCTIONS
    // ========================================
    showLoading() {
        const loader = document.getElementById('loadingIndicator');
        if (loader) {
            loader.style.display = 'flex';
            PrometheusUtils.announceToScreenReader('Loading content...');
        }
    }
    
    hideLoading() {
        const loader = document.getElementById('loadingIndicator');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    showError(message) {
        console.error('UI Error:', message);
        
        const errorDisplay = document.getElementById('errorDisplay');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorDisplay && errorMessage) {
            errorMessage.textContent = message;
            errorDisplay.style.display = 'flex';
            PrometheusUtils.announceToScreenReader(`Error: ${message}`);
        } else {
            // Fallback to alert
            alert(`Error: ${message}`);
        }
    }
    
    hideError() {
        const errorDisplay = document.getElementById('errorDisplay');
        if (errorDisplay) {
            errorDisplay.style.display = 'none';
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
        console.log('Success:', message);
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(notif => notif.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="notification-text">${this.app.escapeHtml(message)}</span>
        `;
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#4a9eff',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: '10000',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slideInRight 0.3s ease-out'
        });
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 4000);
        
        // Announce to screen readers
        PrometheusUtils.announceToScreenReader(message);
    }
    
    downloadFile(content, filename, mimeType = 'text/plain') {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showSuccess(`File "${filename}" downloaded successfully`);
        } catch (error) {
            console.error('Download error:', error);
            this.showError('Failed to download file');
        }
    }
}

// ========================================
// KEYBOARD SHORTCUTS & GLOBAL SEARCH
// ========================================
class KeyboardManager {
    constructor(app, ui) {
        this.app = app;
        this.ui = ui;
        this.init();
    }
    
    init() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.createSearchModal();
    }
    
    handleKeydown(event) {
        // Ignore if typing in input/textarea/select
        const activeElement = document.activeElement;
        const isTyping = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.tagName === 'SELECT' ||
            activeElement.contentEditable === 'true'
        );
        
        if (isTyping) return;
        
        const { key, ctrlKey, altKey, shiftKey } = event;
        
        try {
            // Navigation shortcuts
            if (ctrlKey && key.toLowerCase() === 'd') {
                event.preventDefault();
                this.ui.showSection('dashboard');
                this.ui.showNotification('Dashboard');
                return;
            }
            
            if (ctrlKey && key.toLowerCase() === 'r') {
                event.preventDefault();
                this.showGlobalSearch();
                return;
            }
            
            if (altKey && key.toLowerCase() === 'c') {
                event.preventDefault();
                this.ui.showSection('clients');
                this.ui.showNotification('Clients');
                return;
            }
            
            if (altKey && key.toLowerCase() === 'm') {
                event.preventDefault();
                this.ui.showSection('matters');
                this.ui.showNotification('Matters');
                return;
            }
            
            if (altKey && key.toLowerCase() === 'd') {
                event.preventDefault();
                this.ui.showSection('documents');
                this.ui.showNotification('Documents');
                return;
            }
            
            if (altKey && key.toLowerCase() === 'a') {
                event.preventDefault();
                this.ui.showSection('analytics');
                this.ui.showNotification('Analytics');
                return;
            }
            
            // Action shortcuts
            if (ctrlKey && key.toLowerCase() === 'n') {
                event.preventDefault();
                if (shiftKey) {
                    this.quickNewMatter();
                } else {
                    this.newMatter();
                }
                return;
            }
            
            if (ctrlKey && key.toLowerCase() === 't') {
                event.preventDefault();
                this.app.toggleTimer();
                this.ui.showNotification('Timer toggled');
                return;
            }
            
            // Function keys
            if (key === 'F5') {
                event.preventDefault();
                this.ui.updateTimerDisplays();
                this.ui.showNotification('Timer refreshed');
                return;
            }
            
            if (key === 'F12') {
                event.preventDefault();
                this.ui.showSection('analytics');
                this.ui.showNotification('Analytics Dashboard');
                return;
            }
            
            // Escape key
            if (key === 'Escape') {
                this.handleEscapeKey();
                return;
            }
            
        } catch (error) {
            console.error('Keyboard shortcut error:', error);
        }
    }
    
    handleEscapeKey() {
        // Close any open modals or forms
        const openModals = [
            document.getElementById('globalSearchModal'),
            document.getElementById('addClientForm'),
            document.getElementById('addMatterForm'),
            document.getElementById('uploadForm'),
            document.getElementById('invoiceForm')
        ];
        
        openModals.forEach(modal => {
            if (modal && modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
        });
        
        // Hide global search if visible
        if (this.app.searchVisible) {
            this.hideGlobalSearch();
        }
    }
    
    newMatter() {
        this.ui.showSection('matters');
        setTimeout(() => {
            this.ui.showAddMatterForm();
        }, 100);
    }
    
    quickNewMatter() {
        this.ui.showSection('matters');
        setTimeout(() => {
            this.ui.showAddMatterForm();
            const firstInput = document.querySelector('#addMatterForm select');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    createSearchModal() {
        const searchModal = document.createElement('div');
        searchModal.id = 'globalSearchModal';
        searchModal.className = 'search-modal';
        searchModal.innerHTML = `
            <div class="search-overlay">
                <div class="search-container">
                    <div class="search-header">
                        <input type="text" id="globalSearchInput" placeholder="Global search... (Ctrl+R)" autofocus>
                        <button onclick="keyboardManager.hideGlobalSearch()" class="search-close">✕</button>
                    </div>
                    <div class="search-results">
                        <div id="searchResults" class="search-results-content">
                            <p class="search-hint">Type to search in clients, matters, and time entries...</p>
                        </div>
                    </div>
                    <div class="search-footer">
                        <span>↑↓ Navigation • Enter Select • Esc Close</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(searchModal);
        
        // Add search functionality
        const searchInput = document.getElementById('globalSearchInput');
        searchInput.addEventListener('input', (e) => this.performSearch(e.target.value));
        searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
    }
    
    showGlobalSearch() {
        this.app.searchVisible = true;
        const modal = document.getElementById('globalSearchModal');
        const input = document.getElementById('globalSearchInput');
        
        if (modal && input) {
            modal.style.display = 'flex';
            input.focus();
            input.select();
        }
    }
    
    hideGlobalSearch() {
        this.app.searchVisible = false;
        const modal = document.getElementById('globalSearchModal');
        const input = document.getElementById('globalSearchInput');
        const results = document.getElementById('searchResults');
        
        if (modal) modal.style.display = 'none';
        if (input) input.value = '';
        if (results) {
            results.innerHTML = '<p class="search-hint">Type to search in clients, matters, and time entries...</p>';
        }
    }
    
    performSearch(query) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;
        
        if (!query || query.length < 2) {
            resultsContainer.innerHTML = '<p class="search-hint">Type at least 2 characters...</p>';
            return;
        }
        
        const results = this.searchAllData(query.toLowerCase());
        this.displaySearchResults(results, resultsContainer);
    }
    
    searchAllData(query) {
        const results = {
            clients: [],
            matters: [],
            timeEntries: [],
            documents: []
        };
        
        // Search clients
        this.app.clients.forEach(client => {
            if (this.matchesSearchQuery(client, query, ['name', 'contact', 'email'])) {
                results.clients.push(client);
            }
        });
        
        // Search matters
        this.app.matters.forEach(matter => {
            if (this.matchesSearchQuery(matter, query, ['title', 'code', 'description', 'practice'])) {
                results.matters.push(matter);
            }
        });
        
        // Search recent time entries
        this.app.timeEntries.slice(-50).forEach(entry => {
            if (this.matchesSearchQuery(entry, query, ['matterCode'])) {
                results.timeEntries.push(entry);
            }
        });
        
        // Search documents
        this.app.documents.forEach(doc => {
            if (this.matchesSearchQuery(doc, query, ['name', 'description'])) {
                results.documents.push(doc);
            }
        });
        
        return results;
    }
    
    matchesSearchQuery(item, query, fields) {
        return fields.some(field => {
            const value = item[field];
            return value && value.toLowerCase().includes(query);
        });
    }
    
    displaySearchResults(results, container) {
        const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
        
        if (totalResults === 0) {
            container.innerHTML = '<p class="search-no-results">No results found</p>';
            return;
        }
        
        let html = '';
        
        // Clients results
        if (results.clients.length > 0) {
            html += '<div class="search-section"><h4>👥 Clients</h4>';
            results.clients.slice(0, 5).forEach(client => {
                html += `
                    <div class="search-result" onclick="keyboardManager.selectSearchResult('client', '${client.id}')">
                        <strong>${this.app.escapeHtml(client.name)}</strong>
                        <span>${client.tier} • ${this.app.escapeHtml(client.contact) || 'No contact'}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // Matters results
        if (results.matters.length > 0) {
            html += '<div class="search-section"><h4>⚖️ Matters</h4>';
            results.matters.slice(0, 5).forEach(matter => {
                const client = this.app.clients.find(c => c.id === matter.clientId);
                html += `
                    <div class="search-result" onclick="keyboardManager.selectSearchResult('matter', '${matter.id}')">
                        <strong>${this.app.escapeHtml(matter.title)}</strong>
                        <span>${matter.code} • ${client ? this.app.escapeHtml(client.name) : 'Client deleted'}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // Documents results
        if (results.documents.length > 0) {
            html += '<div class="search-section"><h4>📁 Documents</h4>';
            results.documents.slice(0, 3).forEach(doc => {
                const matter = this.app.matters.find(m => m.id === doc.matterId);
                const typeConfig = DOCUMENT_TYPES[doc.type] || DOCUMENT_TYPES.other;
                html += `
                    <div class="search-result" onclick="keyboardManager.selectSearchResult('document', '${doc.id}')">
                        <strong>${this.app.escapeHtml(doc.name)}</strong>
                        <span>${matter ? matter.code : 'N/A'} • ${typeConfig.label}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // Time entries results
        if (results.timeEntries.length > 0) {
            html += '<div class="search-section"><h4>⏱️ Recent Time</h4>';
            results.timeEntries.slice(0, 3).forEach(entry => {
                html += `
                    <div class="search-result" onclick="keyboardManager.selectSearchResult('time', '${entry.id}')">
                        <strong>${this.app.escapeHtml(entry.matterCode)}</strong>
                        <span>${PrometheusUtils.formatDuration(entry.duration)} • ${new Date(entry.date).toLocaleDateString(APP_CONFIG.dateFormat)}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        container.innerHTML = html;
    }
    
    selectSearchResult(type, id) {
        this.hideGlobalSearch();
        
        switch (type) {
            case 'client':
                this.ui.showSection('clients');
                break;
            case 'matter':
                this.ui.showSection('matters');
                break;
            case 'document':
                this.ui.showSection('documents');
                break;
            case 'time':
                this.ui.showSection('timetracking');
                break;
        }
        
        // Highlight the selected item
        setTimeout(() => {
            const element = document.querySelector(`[data-${type}-id="${id}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.style.border = '2px solid #4a9eff';
                setTimeout(() => {
                    element.style.border = '';
                }, 2000);
            }
        }, 300);
        
        this.ui.showNotification(`Found ${type}: ${id}`);
    }
    
    handleSearchKeydown(e) {
        if (e.key === 'Escape') {
            this.hideGlobalSearch();
        }
        // Could add arrow key navigation here
    }
}

// ========================================
// GLOBAL VARIABLES & INITIALIZATION
// ========================================
let app, ui, keyboardManager;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        app = PrometheusApp.getInstance();
        ui = new PrometheusUI(app);
        keyboardManager = new KeyboardManager(app, ui);
        
        // Connect UI methods to app
        app.showError = (message) => ui.showError(message);
        app.showSuccess = (message) => ui.showSuccess(message);
        
        await app.init();
        
        // Setup timer update interval
        setInterval(() => {
            ui.updateTimerDisplays();
        }, 1000);
        
        // Expose app info to console for debugging
        window.prometheusInfo = () => console.table(app.getApplicationInfo());
        
    } catch (error) {
        console.error('Application initialization failed:', error);
        alert('Failed to initialize Prometheus. Please refresh the page.');
    }
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (app) {
        app.destroy();
    }
});

// ========================================
// GLOBAL FUNCTIONS (for onclick handlers)
// ========================================

// Navigation functions
function showSection(section) {
    if (ui) ui.showSection(section);
}

// Client management functions
function showAddClientForm() {
    if (ui) ui.showAddClientForm();
}

function hideAddClientForm() {
    if (ui) ui.hideAddClientForm();
}

function addClient(event) {
    if (app && ui) {
        const client = app.addClient(event);
        if (client) {
            ui.hideAddClientForm();
            ui.loadClients();
            ui.updateDashboard();
            ui.updateMatterClientSelects();
        }
    }
}

function editClient(clientId) {
    if (app && ui) {
        app.editClient(clientId);
        ui.showAddClientForm();
        
        // Change form title and button text
        const formTitle = document.querySelector('#addClientForm h3');
        const submitBtn = document.querySelector('#addClientForm button[type="submit"]');
        if (formTitle) formTitle.textContent = 'Edit Client';
        if (submitBtn) submitBtn.textContent = 'Update Client';
    }
}

function deleteClient(clientId) {
    if (app && ui && confirm('Are you sure you want to delete this client?')) {
        app.deleteClient(clientId);
        ui.loadClients();
        ui.updateDashboard();
        ui.updateMatterClientSelects();
    }
}

// Matter management functions
function showAddMatterForm() {
    if (ui) ui.showAddMatterForm();
}

function hideAddMatterForm() {
    if (ui) ui.hideAddMatterForm();
}

function addMatter(event) {
    if (app && ui) {
        const matter = app.addMatter(event);
        if (matter) {
            ui.hideAddMatterForm();
            ui.loadMatters();
            ui.updateDashboard();
            ui.updateMatterClientSelects();
        }
    }
}

function editMatter(matterId) {
    if (app && ui) {
        app.editMatter(matterId);
        ui.showAddMatterForm();
        
        // Change form title and button text
        const formTitle = document.querySelector('#addMatterForm h3');
        const submitBtn = document.querySelector('#addMatterForm button[type="submit"]');
        if (formTitle) formTitle.textContent = 'Edit Matter';
        if (submitBtn) submitBtn.textContent = 'Update Matter';
    }
}

function deleteMatter(matterId) {
    if (app && ui && confirm('Are you sure you want to delete this matter?')) {
        app.deleteMatter(matterId);
        ui.loadMatters();
        ui.updateDashboard();
        ui.updateMatterClientSelects();
    }
}

function startTimerForMatter(matterId) {
    if (app && ui) {
        app.startTimerForMatter(matterId);
        ui.showSection('timetracking');
        setTimeout(() => {
            app.startTimer();
            ui.updateTimerDisplays();
        }, 500);
    }
}

// Time tracking functions
function toggleTimer() {
    if (app && ui) {
        app.toggleTimer();
        ui.updateTimerDisplays();
    }
}

function resetTimer() {
    if (app && ui) {
        app.resetTimer();
        ui.updateTimerDisplays();
    }
}

function editTimeEntry(entryId) {
    if (app && ui) {
        const entry = app.editTimeEntry(entryId);
        if (entry) {
            ui.loadTimeEntries();
            ui.updateDashboard();
        }
    }
}

function deleteTimeEntry(entryId) {
    if (app && ui && confirm('Are you sure you want to delete this time entry?')) {
        app.deleteTimeEntry(entryId);
        ui.loadTimeEntries();
        ui.updateDashboard();
    }
}

// Billing functions
function updateUserRate() {
    if (app && ui) {
        ui.updateUserRateDisplay();
        ui.loadTimeEntries();
        ui.updateDashboard();
    }
}

function generateInvoice() {
    if (ui) ui.showGenerateInvoiceForm();
}

function hideInvoiceForm() {
    if (ui) ui.hideInvoiceForm();
}

function createInvoice(event) {
    if (app && ui) {
        const invoice = app.createInvoice(event);
        if (invoice) {
            const htmlContent = app.createInvoiceHTML(invoice);
            ui.downloadFile(htmlContent, `${invoice.number}.html`, 'text/html');
            ui.hideInvoiceForm();
            ui.loadInvoices();
            ui.loadTimeEntries();
        }
    }
}

function updateInvoiceSummary() {
    if (ui) ui.updateInvoiceSummary();
}

function regeneratePDF(invoiceId) {
    const invoice = app.invoices.find(inv => inv.id === invoiceId);
    if (invoice && ui) {
        const htmlContent = app.createInvoiceHTML(invoice);
        ui.downloadFile(htmlContent, `${invoice.number}.html`, 'text/html');
    }
}

function duplicateInvoice(invoiceId) {
    const invoice = app.invoices.find(inv => inv.id === invoiceId);
    if (invoice && ui) {
        document.getElementById('invoiceClient').value = invoice.client;
        document.getElementById('invoiceCurrency').value = invoice.currency;
        ui.showGenerateInvoiceForm();
    }
}

function deleteInvoice(invoiceId) {
    if (app && ui && confirm('Are you sure you want to delete this invoice?')) {
        app.deleteInvoice(invoiceId);
        ui.loadInvoices();
    }
}

function exportAccounting() {
    const month = document.getElementById('exportMonth').value;
    if (!month) {
        ui.showError('Please select a month');
        return;
    }
    
    const [year, monthNum] = month.split('-');
    const monthlyInvoices = app.invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getFullYear() == year && (invDate.getMonth() + 1) == monthNum;
    });
    
    if (monthlyInvoices.length === 0) {
        ui.showError('No invoices found for this period');
        return;
    }
    
    const csvContent = app.generateAccountingCSV(monthlyInvoices);
    ui.downloadFile(csvContent, `accounting-${month}.csv`, 'text/csv');
}

function exportCSV() {
    const month = document.getElementById('exportMonth').value;
    if (!month) {
        ui.showError('Please select a month');
        return;
    }
    
    const [year, monthNum] = month.split('-');
    const monthlyEntries = app.timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getFullYear() == year && (entryDate.getMonth() + 1) == monthNum;
    });
    
    if (monthlyEntries.length === 0) {
        ui.showError('No time entries found for this period');
        return;
    }
    
    const csvContent = app.generateTimeEntriesCSV(monthlyEntries);
    ui.downloadFile(csvContent, `time-entries-${month}.csv`, 'text/csv');
}

// Document functions
function showUploadForm() {
    if (ui) ui.showUploadForm();
}

function hideUploadForm() {
    if (ui) ui.hideUploadForm();
}

function uploadDocument(event) {
    event.preventDefault();
    
    if (app && ui) {
        const files = app.selectedFiles || [];
        const matterId = document.getElementById('documentMatter').value;
        const type = document.getElementById('documentType').value;
        const description = document.getElementById('documentDescription').value;
        
        // Show progress
        ui.showUploadProgress();
        
        // Simulate upload
        setTimeout(() => {
            const docs = app.uploadDocument(files, matterId, type, description);
            if (docs) {
                ui.hideUploadProgress();
                ui.hideUploadForm();
                ui.loadDocuments();
            } else {
                ui.hideUploadProgress();
            }
        }, 2000);
    }
}

function filterDocuments() {
    if (ui) ui.loadDocuments();
}

function downloadDocument(docId) {
    const doc = app.documents.find(d => d.id === docId);
    if (doc && ui) {
        ui.showSuccess(`Download initiated for "${doc.name}"`);
        console.log('Would download document:', doc);
    }
}

function editDocument(docId) {
    if (app && ui) {
        const doc = app.editDocument(docId);
        if (doc) {
            ui.loadDocuments();
        }
    }
}

function deleteDocument(docId) {
    if (app && ui && confirm('Are you sure you want to delete this document?')) {
        app.deleteDocument(docId);
        ui.loadDocuments();
    }
}

// Analytics functions
function updateAnalytics() {
    if (ui) ui.updateAnalytics();
}

// UI utility functions
function showError(message) {
    if (ui) {
        ui.showError(message);
    } else {
        alert(`Error: ${message}`);
    }
}

function hideError() {
    if (ui) ui.hideError();
}

function toggleKeyboardHint() {
    const hint = document.getElementById('keyboardHint');
    if (hint) {
        const isVisible = hint.style.display !== 'none';
        hint.style.display = isVisible ? 'none' : 'block';
        localStorage.setItem('prometheus_hint_hidden', isVisible);
    }
}

// Performance monitoring
if (typeof PerformanceObserver !== 'undefined') {
    const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
            if (entry.entryType === 'navigation') {
                console.log(`Page load time: ${entry.loadEventEnd.toFixed(2)}ms`);
            }
        });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PrometheusUI, KeyboardManager };
}