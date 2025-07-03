// PROMETHEUS.EXE - LOGIC CORE
class PrometheusApp {
    constructor() {
        // Check browser compatibility
        this.checkBrowserCompatibility();
        
        this.clients = JSON.parse(localStorage.getItem('prometheus_clients') || '[]');
        this.matters = JSON.parse(localStorage.getItem('prometheus_matters') || '[]');
        this.timeEntries = JSON.parse(localStorage.getItem('prometheus_time') || '[]');
        this.invoices = JSON.parse(localStorage.getItem('prometheus_invoices') || '[]');
        this.userLevel = localStorage.getItem('prometheus_user_level') || 'collaborateur';
        this.rates = {
            collaborateur: 250,
            associe: 500
        };
        this.documents = JSON.parse(localStorage.getItem('prometheus_documents') || '[]');
        this.timerState = {
            isRunning: false,
            startTime: null,
            currentMatter: null,
            elapsed: 0
        };
        
        this.init();
    }
    
    checkBrowserCompatibility() {
        const features = {
            localStorage: typeof(Storage) !== "undefined",
            canvas: !!document.createElement('canvas').getContext,
            dragDrop: 'draggable' in document.createElement('div'),
            dataTransfer: typeof(DataTransfer) !== "undefined"
        };
        
        console.log('Browser compatibility check:', features);
        
        if (!features.localStorage) {
            alert('Votre navigateur ne supporte pas localStorage. Les données ne seront pas sauvegardées.');
        }
        
        this.browserFeatures = features;
    }
    
    init() {
        this.loadData();
        this.updateStats();
        this.startAutoSave();
        this.updateTimerDisplay();
        setInterval(() => this.updateTimerDisplay(), 1000);
    }
    
    // NAVIGATION
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.main-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active class from nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Activate nav button using data-section attribute
        const targetButton = document.querySelector(`.nav-btn[data-section="${sectionName}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }
        
        // Load section specific data
        if (sectionName === 'clients') this.loadClients();
        if (sectionName === 'matters') this.loadMatters();
        if (sectionName === 'timetracking') this.loadTimeEntries();
        if (sectionName === 'billing') this.showBillingSection();
        if (sectionName === 'documents') this.showDocumentsSection();
        if (sectionName === 'analytics') this.showAnalyticsSection();
    }
    
    // CLIENT MANAGEMENT
    showAddClientForm() {
        document.getElementById('addClientForm').style.display = 'block';
    }
    
    hideAddClientForm() {
        document.getElementById('addClientForm').style.display = 'none';
        document.querySelector('#addClientForm form').reset();
    }
    
    addClient(event) {
        event.preventDefault();
        
        const client = {
            id: Date.now(),
            name: document.getElementById('clientName').value,
            contact: document.getElementById('clientContact').value,
            email: document.getElementById('clientEmail').value,
            tier: document.getElementById('clientTier').value,
            createdAt: new Date().toISOString()
        };
        
        this.clients.push(client);
        this.saveData();
        this.hideAddClientForm();
        this.loadClients();
        this.updateStats();
        this.updateMatterClientSelects();
    }
    
    loadClients() {
        const container = document.getElementById('clientsList');
        
        if (this.clients.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun client créé</p>';
            return;
        }
        
        container.innerHTML = this.clients.map(client => `
            <div class="client-card">
                <h4>${client.name}</h4>
                <p><strong>Contact:</strong> ${client.contact || 'N/A'}</p>
                <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
                <span class="client-tier">${client.tier}</span>
            </div>
        `).join('');
    }
    
    // MATTER MANAGEMENT
    showAddMatterForm() {
        this.updateMatterClientSelects();
        document.getElementById('addMatterForm').style.display = 'block';
    }
    
    hideAddMatterForm() {
        document.getElementById('addMatterForm').style.display = 'none';
        document.querySelector('#addMatterForm form').reset();
    }
    
    updateMatterClientSelects() {
        const matterClientSelect = document.getElementById('matterClient');
        const timerMatterSelect = document.getElementById('timerMatter');
        
        if (matterClientSelect) {
            matterClientSelect.innerHTML = '<option value="">Sélectionner Client</option>' +
                this.clients.map(client => 
                    `<option value="${client.id}">${client.name}</option>`
                ).join('');
        }
        
        if (timerMatterSelect) {
            timerMatterSelect.innerHTML = '<option value="">Sélectionner un dossier</option>' +
                this.matters.map(matter => 
                    `<option value="${matter.id}">${matter.code} - ${matter.title}</option>`
                ).join('');
        }
    }
    
    generateMatterCode(practice, clientId) {
        const client = this.clients.find(c => c.id == clientId);
        const year = new Date().getFullYear();
        const clientMatters = this.matters.filter(m => m.clientId == clientId);
        const number = String(clientMatters.length + 1).padStart(3, '0');
        
        return `${practice}-${client.name.toUpperCase().slice(0, 3)}-${year}-${number}`;
    }
    
    addMatter(event) {
        event.preventDefault();
        
        const practice = document.getElementById('matterPractice').value;
        const clientId = document.getElementById('matterClient').value;
        const title = document.getElementById('matterTitle').value;
        const description = document.getElementById('matterDescription').value;
        
        const matter = {
            id: Date.now(),
            code: this.generateMatterCode(practice, clientId),
            practice,
            clientId: parseInt(clientId),
            title,
            description,
            createdAt: new Date().toISOString(),
            status: 'Active'
        };
        
        this.matters.push(matter);
        this.saveData();
        this.hideAddMatterForm();
        this.loadMatters();
        this.updateStats();
        this.updateMatterClientSelects();
    }
    
    loadMatters() {
        const container = document.getElementById('mattersList');
        
        if (this.matters.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun dossier créé</p>';
            return;
        }
        
        container.innerHTML = this.matters.map(matter => {
            const client = this.clients.find(c => c.id === matter.clientId);
            return `
                <div class="matter-card">
                    <h4>${matter.title}</h4>
                    <p class="matter-code">${matter.code}</p>
                    <span class="practice-badge">${matter.practice}</span>
                    <p><strong>Client:</strong> ${client ? client.name : 'Client supprimé'}</p>
                    <p><strong>Description:</strong> ${matter.description || 'Aucune description'}</p>
                    <p><strong>Statut:</strong> ${matter.status}</p>
                </div>
            `;
        }).join('');
        
        // Update recent matters on dashboard
        this.updateRecentMatters();
    }
    
    updateRecentMatters() {
        const container = document.getElementById('recentMattersList');
        const recentMatters = this.matters.slice(-5).reverse();
        
        if (recentMatters.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun dossier créé</p>';
            return;
        }
        
        container.innerHTML = recentMatters.map(matter => {
            const client = this.clients.find(c => c.id === matter.clientId);
            return `
                <div class="matter-card">
                    <h4>${matter.title}</h4>
                    <p class="matter-code">${matter.code}</p>
                    <p><strong>Client:</strong> ${client ? client.name : 'Client supprimé'}</p>
                </div>
            `;
        }).join('');
    }
    
    // TIME TRACKING
    toggleTimer() {
        if (this.timerState.isRunning) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
    }
    
    startTimer() {
        this.timerState.isRunning = true;
        this.timerState.startTime = Date.now() - this.timerState.elapsed;
        
        const btns = [document.getElementById('timerBtn'), document.getElementById('timerBtnLarge')];
        btns.forEach(btn => {
            if (btn) {
                btn.textContent = '⏸️ Stop';
                btn.classList.add('running');
            }
        });
    }
    
    stopTimer() {
        if (!this.timerState.isRunning) return;
        
        this.timerState.isRunning = false;
        const duration = Math.round((Date.now() - this.timerState.startTime) / 1000);
        
        // Save time entry
        if (duration > 0) {
            const matterId = document.getElementById('timerMatter')?.value;
            const matter = this.matters.find(m => m.id == matterId);
            
            const timeEntry = {
                id: Date.now(),
                matterId: matterId ? parseInt(matterId) : null,
                matterCode: matter ? matter.code : 'Non assigné',
                duration: duration,
                date: new Date().toISOString(),
                value: this.calculateTimeValue(duration),
                billed: false
            };
            
            this.timeEntries.push(timeEntry);
            this.saveData();
            this.loadTimeEntries();
            this.updateStats();
        }
        
        this.resetTimer();
    }
    
    resetTimer() {
        this.timerState.elapsed = 0;
        this.timerState.isRunning = false;
        this.timerState.startTime = null;
        
        const btns = [document.getElementById('timerBtn'), document.getElementById('timerBtnLarge')];
        btns.forEach(btn => {
            if (btn) {
                btn.textContent = '▶️ Start';
                btn.classList.remove('running');
            }
        });
    }
    
    updateTimerDisplay() {
        if (this.timerState.isRunning) {
            this.timerState.elapsed = Date.now() - this.timerState.startTime;
        }
        
        const time = this.formatTime(this.timerState.elapsed);
        const displays = [document.getElementById('timerDisplay'), document.getElementById('timerDisplayLarge')];
        displays.forEach(display => {
            if (display) display.textContent = time;
        });
    }
    
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    calculateTimeValue(seconds) {
        const hours = seconds / 3600;
        const rate = this.rates[this.userLevel] || this.rates.collaborateur;
        return Math.round(hours * rate);
    }
    
    loadTimeEntries() {
        const container = document.getElementById('timeEntriesList');
        
        if (this.timeEntries.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune entrée de temps</p>';
            return;
        }
        
        const sortedEntries = [...this.timeEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        container.innerHTML = sortedEntries.map(entry => `
            <div class="time-entry">
                <span class="time-duration">${this.formatTime(entry.duration * 1000)}</span>
                <span class="time-matter">${entry.matterCode}</span>
                <span class="time-value">${entry.value}€</span>
                <span>${new Date(entry.date).toLocaleDateString('fr-FR')}</span>
            </div>
        `).join('');
        
        this.updateTodayTime();
    }
    
    updateTodayTime() {
        const today = new Date().toDateString();
        const todayEntries = this.timeEntries.filter(entry => 
            new Date(entry.date).toDateString() === today
        );
        
        const container = document.getElementById('todayTimeList');
        
        if (todayEntries.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun temps enregistré</p>';
            return;
        }
        
        container.innerHTML = todayEntries.map(entry => `
            <div class="time-entry">
                <span class="time-duration">${this.formatTime(entry.duration * 1000)}</span>
                <span class="time-matter">${entry.matterCode}</span>
                <span class="time-value">${entry.value}€</span>
            </div>
        `).join('');
    }
    
    // BILLING & FACTURATION
    showBillingSection() {
        const userLevelSelect = document.getElementById('userLevel');
        if (userLevelSelect) {
            userLevelSelect.value = this.userLevel;
        }
        this.updateUserRate();
        this.loadInvoices();
        const exportMonth = document.getElementById('exportMonth');
        if (exportMonth) {
            exportMonth.value = new Date().toISOString().slice(0, 7);
        }
    }
    
    updateUserRate() {
        const userLevelSelect = document.getElementById('userLevel');
        if (userLevelSelect) {
            const level = userLevelSelect.value;
            this.userLevel = level;
            localStorage.setItem('prometheus_user_level', level);
            
            const rate = this.rates[level];
            const currentRateSpan = document.getElementById('currentRate');
            if (currentRateSpan) {
                currentRateSpan.textContent = `Taux actuel: ${rate}€/h`;
            }
            
            // Recalculate all time entries with new rate
            this.timeEntries = this.timeEntries.map(entry => ({
                ...entry,
                value: this.calculateTimeValueForLevel(entry.duration, level)
            }));
            
            this.saveData();
            this.updateStats();
            this.loadTimeEntries();
        }
    }
    
    calculateTimeValueForLevel(seconds, level) {
        const hours = seconds / 3600;
        const rate = this.rates[level] || this.rates.collaborateur;
        return Math.round(hours * rate);
    }
    
    generateInvoice() {
        this.loadBillableEntries();
        document.getElementById('invoiceForm').style.display = 'block';
        document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('invoiceNumber').value = this.generateInvoiceNumber();
    }
    
    hideInvoiceForm() {
        document.getElementById('invoiceForm').style.display = 'none';
        document.querySelector('#invoiceForm form').reset();
    }
    
    generateInvoiceNumber() {
        const year = new Date().getFullYear();
        const count = this.invoices.filter(inv => inv.number.startsWith(`BOURDON-${year}`)).length + 1;
        return `BOURDON-${year}-${String(count).padStart(3, '0')}`;
    }
    
    loadBillableEntries() {
        const container = document.getElementById('billableTimeEntries');
        if (!container) return;
        
        const unbilledEntries = this.timeEntries.filter(entry => !entry.billed);
        
        if (unbilledEntries.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune entrée de temps non facturée</p>';
            return;
        }
        
        container.innerHTML = unbilledEntries.map(entry => {
            const matter = this.matters.find(m => m.id === entry.matterId);
            return `
                <div class="billable-entry">
                    <input type="checkbox" id="entry_${entry.id}" onchange="updateInvoiceSummary()">
                    <div class="billable-entry-info">
                        <span class="entry-duration">${this.formatTime(entry.duration * 1000)}</span>
                        <span class="entry-matter">${entry.matterCode}</span>
                        <span class="entry-date">${new Date(entry.date).toLocaleDateString('fr-FR')}</span>
                        <span class="entry-value">${entry.value}€</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateInvoiceSummary() {
        const checkboxes = document.querySelectorAll('#billableTimeEntries input[type="checkbox"]:checked');
        let totalSeconds = 0;
        let totalAmount = 0;
        
        checkboxes.forEach(checkbox => {
            const entryId = parseInt(checkbox.id.replace('entry_', ''));
            const entry = this.timeEntries.find(e => e.id === entryId);
            if (entry) {
                totalSeconds += entry.duration;
                totalAmount += entry.value;
            }
        });
        
        const totalHours = (totalSeconds / 3600).toFixed(1);
        const vat = Math.round(totalAmount * 0.2);
        const totalTTC = totalAmount + vat;
        
        const elements = {
            totalHoursBilling: `${totalHours}h`,
            totalAmountHT: `${totalAmount}€`,
            totalVAT: `${vat}€`,
            totalAmountTTC: `${totalTTC}€`
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }
    
    createInvoice(event) {
        event.preventDefault();
        
        const checkboxes = document.querySelectorAll('#billableTimeEntries input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            alert('Veuillez sélectionner au moins une entrée de temps');
            return;
        }
        
        const selectedEntries = [];
        checkboxes.forEach(checkbox => {
            const entryId = parseInt(checkbox.id.replace('entry_', ''));
            const entry = this.timeEntries.find(e => e.id === entryId);
            if (entry) {
                entry.billed = true; // Mark as billed
                selectedEntries.push(entry);
            }
        });
        
        const invoice = {
            id: Date.now(),
            number: document.getElementById('invoiceNumber').value,
            client: document.getElementById('invoiceClient').value,
            date: document.getElementById('invoiceDate').value,
            currency: document.getElementById('invoiceCurrency').value,
            entries: selectedEntries,
            totalHours: selectedEntries.reduce((sum, e) => sum + e.duration, 0) / 3600,
            totalHT: selectedEntries.reduce((sum, e) => sum + e.value, 0),
            vat: Math.round(selectedEntries.reduce((sum, e) => sum + e.value, 0) * 0.2),
            totalTTC: selectedEntries.reduce((sum, e) => sum + e.value, 0) * 1.2,
            createdAt: new Date().toISOString()
        };
        
        invoice.totalTTC = invoice.totalHT + invoice.vat;
        
        this.invoices.push(invoice);
        this.saveData();
        this.generatePDFInvoice(invoice);
        this.hideInvoiceForm();
        this.loadInvoices();
    }
    
    generatePDFInvoice(invoice) {
        const pdfContent = this.createInvoicePDFContent(invoice);
        
        // Create blob and download
        const blob = new Blob([pdfContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.number}.html`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert(`Facture ${invoice.number} générée avec succès !`);
    }
    
    createInvoicePDFContent(invoice) {
        const currencySymbol = invoice.currency === 'EUR' ? '€' : invoice.currency === 'USD' ? '$' : '£';
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Facture ${invoice.number}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #333; margin: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { font-size: 24px; font-weight: bold; color: #4a9eff; }
        .invoice-info { text-align: right; }
        .client-info { margin-bottom: 30px; }
        .invoice-details { background: #f8f9fa; padding: 20px; margin: 30px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #4a9eff; color: white; }
        .total-row { font-weight: bold; background: #f0f0f0; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo">⚖️ BOURDON & Associates</div>
            <p>Cabinet d'Avocats<br>
            Paris, France<br>
            contact@bourdon-associates.com</p>
        </div>
        <div class="invoice-info">
            <h2>FACTURE</h2>
            <p><strong>N°:</strong> ${invoice.number}<br>
            <strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
        </div>
    </div>
    
    <div class="client-info">
        <h3>Facturé à :</h3>
        <p><strong>${invoice.client}</strong></p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Date</th>
                <th>Durée</th>
                <th>Montant</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.entries.map(entry => `
                <tr>
                    <td>${entry.matterCode}</td>
                    <td>${new Date(entry.date).toLocaleDateString('fr-FR')}</td>
                    <td>${this.formatTime(entry.duration * 1000)}</td>
                    <td>${entry.value}${currencySymbol}</td>
                </tr>
            `).join('')}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3"><strong>Total HT</strong></td>
                <td><strong>${invoice.totalHT}${currencySymbol}</strong></td>
            </tr>
            <tr>
                <td colspan="3"><strong>TVA (20%)</strong></td>
                <td><strong>${invoice.vat}${currencySymbol}</strong></td>
            </tr>
            <tr class="total-row">
                <td colspan="3"><strong>TOTAL TTC</strong></td>
                <td><strong>${Math.round(invoice.totalTTC)}${currencySymbol}</strong></td>
            </tr>
        </tfoot>
    </table>
    
    <div class="footer">
        <p>Conditions de paiement : 30 jours net<br>
        BOURDON & Associates - Société d'Avocats - Paris</p>
    </div>
</body>
</html>`;
    }
    
    loadInvoices() {
        const container = document.getElementById('invoicesList');
        if (!container) return;
        
        if (this.invoices.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune facture générée</p>';
            return;
        }
        
        const sortedInvoices = [...this.invoices].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        container.innerHTML = sortedInvoices.map(invoice => `
            <div class="invoice-card">
                <span class="invoice-number">${invoice.number}</span>
                <span class="invoice-client">${invoice.client}</span>
                <span class="invoice-amount">${Math.round(invoice.totalTTC)}€</span>
                <div class="invoice-actions">
                    <button class="btn-small" onclick="app.regeneratePDF(${invoice.id})">PDF</button>
                    <button class="btn-small" onclick="app.duplicateInvoice(${invoice.id})">Dupliquer</button>
                </div>
            </div>
        `).join('');
    }
    
    regeneratePDF(invoiceId) {
        const invoice = this.invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
            this.generatePDFInvoice(invoice);
        }
    }
    
    duplicateInvoice(invoiceId) {
        const invoice = this.invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
            document.getElementById('invoiceClient').value = invoice.client;
            document.getElementById('invoiceCurrency').value = invoice.currency;
            this.generateInvoice();
        }
    }
    
    exportAccounting() {
        const month = document.getElementById('exportMonth').value;
        if (!month) {
            alert('Veuillez sélectionner un mois');
            return;
        }
        
        const [year, monthNum] = month.split('-');
        const monthlyInvoices = this.invoices.filter(inv => {
            const invDate = new Date(inv.date);
            return invDate.getFullYear() == year && (invDate.getMonth() + 1) == monthNum;
        });
        
        if (monthlyInvoices.length === 0) {
            alert('Aucune facture pour cette période');
            return;
        }
        
        const csvContent = this.generateAccountingCSV(monthlyInvoices);
        this.downloadCSV(csvContent, `comptabilite-${month}.csv`);
    }
    
    exportCSV() {
        const month = document.getElementById('exportMonth').value;
        if (!month) {
            alert('Veuillez sélectionner un mois');
            return;
        }
        
        const [year, monthNum] = month.split('-');
        const monthlyEntries = this.timeEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getFullYear() == year && (entryDate.getMonth() + 1) == monthNum;
        });
        
        if (monthlyEntries.length === 0) {
            alert('Aucune entrée de temps pour cette période');
            return;
        }
        
        const csvContent = this.generateTimeEntriesCSV(monthlyEntries);
        this.downloadCSV(csvContent, `time-entries-${month}.csv`);
    }
    
    generateAccountingCSV(invoices) {
        const headers = ['Numéro Facture', 'Client', 'Date', 'Montant HT', 'TVA', 'Montant TTC', 'Devise'];
        const rows = invoices.map(inv => [
            inv.number,
            inv.client,
            inv.date,
            inv.totalHT,
            inv.vat,
            Math.round(inv.totalTTC),
            inv.currency
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    generateTimeEntriesCSV(entries) {
        const headers = ['Date', 'Dossier', 'Durée (h)', 'Valeur', 'Facturé'];
        const rows = entries.map(entry => [
            new Date(entry.date).toLocaleDateString('fr-FR'),
            entry.matterCode,
            (entry.duration / 3600).toFixed(2),
            entry.value,
            entry.billed ? 'Oui' : 'Non'
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // DOCUMENTS MANAGEMENT
    showDocumentsSection() {
        console.log('Showing documents section');
        this.updateDocumentMatterSelects();
        this.loadDocuments();
        
        // Setup drag and drop with a small delay to ensure DOM is ready
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
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Sélectionner un dossier</option>';
                
                if (select.id === 'filterMatter') {
                    select.innerHTML = '<option value="">Tous les dossiers</option>';
                }
                
                this.matters.forEach(matter => {
                    const option = document.createElement('option');
                    option.value = matter.id;
                    option.textContent = `${matter.code} - ${matter.title}`;
                    select.appendChild(option);
                });
                
                select.value = currentValue;
            }
        });
    }
    
    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('documentFile');
        
        if (!uploadArea || !fileInput) {
            console.log('Upload area or file input not found - retrying in 500ms');
            setTimeout(() => this.setupDragAndDrop(), 500);
            return;
        }
        
        try {
            // Remove existing event listeners to prevent duplicates
            const newUploadArea = uploadArea.cloneNode(true);
            uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
            
            // Get fresh references
            const area = document.getElementById('uploadArea');
            const input = document.getElementById('documentFile');
            
            // Click to select files
            area.addEventListener('click', (e) => {
                if (e.target === input) return; // Prevent double-trigger
                e.preventDefault();
                e.stopPropagation();
                input.click();
            });
            
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
                
                // Also prevent on document to avoid browser default behavior
                document.addEventListener(eventName, (e) => {
                    if (area.contains(e.target)) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });
            });
            
            // Visual feedback for drag over
            area.addEventListener('dragenter', () => {
                area.classList.add('dragover');
            });
            
            area.addEventListener('dragover', () => {
                area.classList.add('dragover');
            });
            
            area.addEventListener('dragleave', (e) => {
                // Only remove dragover if we're leaving the upload area entirely
                if (!area.contains(e.relatedTarget)) {
                    area.classList.remove('dragover');
                }
            });
            
            // Handle dropped files
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                area.classList.remove('dragover');
                
                try {
                    const files = Array.from(e.dataTransfer.files);
                    console.log('Files dropped:', files.length);
                    
                    if (files.length > 0) {
                        // Update file input with dropped files
                        if (this.browserFeatures.dataTransfer && window.DataTransfer) {
                            const dt = new DataTransfer();
                            files.forEach(file => dt.items.add(file));
                            input.files = dt.files;
                        } else {
                            console.log('DataTransfer not supported, files handled directly');
                        }
                        
                        this.handleFileSelection(files);
                    }
                } catch (error) {
                    console.error('Error handling dropped files:', error);
                    this.showError('Erreur lors du traitement des fichiers. Utilisez le bouton sélectionner.');
                }
            });
            
            // Handle file input change
            input.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                console.log('Files selected via input:', files.length);
                this.handleFileSelection(files);
            });
            
            console.log('Drag and drop setup completed successfully');
            
        } catch (error) {
            console.error('Error setting up drag and drop:', error);
            this.showError('Erreur lors de l\'initialisation du drag & drop');
        }
    }
    
    handleFileSelection(files) {
        const uploadContent = document.querySelector('.upload-content p');
        
        if (files.length === 0) {
            uploadContent.textContent = '📁 Glissez vos fichiers ici ou cliquez pour sélectionner';
            uploadContent.style.color = '#888';
            return;
        }
        
        if (files.length === 1) {
            uploadContent.textContent = `✅ ${files[0].name} sélectionné (${this.formatFileSize(files[0].size)})`;
        } else {
            const totalSize = files.reduce((sum, file) => sum + file.size, 0);
            uploadContent.textContent = `✅ ${files.length} fichiers sélectionnés (${this.formatFileSize(totalSize)})`;
        }
        
        uploadContent.style.color = '#4a9eff';
        
        console.log('Files handled:', files.map(f => ({ name: f.name, size: f.size })));
    }
    
    showUploadForm() {
        this.updateDocumentMatterSelects();
        document.getElementById('uploadForm').style.display = 'block';
    }
    
    hideUploadForm() {
        const uploadForm = document.getElementById('uploadForm');
        const uploadArea = document.getElementById('uploadArea');
        const uploadStatus = document.getElementById('uploadStatus');
        const submitButton = document.getElementById('submitUpload');
        const documentForm = document.getElementById('documentUploadForm');
        
        if (uploadForm) uploadForm.style.display = 'none';
        if (uploadArea) uploadArea.classList.remove('has-files');
        if (uploadStatus) {
            uploadStatus.textContent = 'ou cliquez pour sélectionner';
            uploadStatus.style.color = '#888';
        }
        if (submitButton) submitButton.disabled = true;
        if (documentForm) documentForm.reset();
    }
    
    showError(message) {
        console.error('Application error:', message);
        
        // Try to use the global showError function if available
        if (typeof window.showError === 'function') {
            window.showError(message);
        } else {
            // Fallback to alert
            alert(message);
        }
    }
    
    uploadDocument(event) {
        event.preventDefault();
        
        const fileInput = document.getElementById('documentFile');
        const files = Array.from(fileInput.files);
        
        if (files.length === 0) {
            this.showError('Veuillez sélectionner au moins un fichier');
            return;
        }
        
        const matterId = parseInt(document.getElementById('documentMatter').value);
        const type = document.getElementById('documentType').value;
        const description = document.getElementById('documentDescription').value;
        
        if (!matterId) {
            this.showError('Veuillez sélectionner un dossier');
            return;
        }
        
        // Show progress
        this.showUploadProgress();
        
        // Simulate upload progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 90) progress = 90;
            this.updateUploadProgress(progress);
        }, 200);
        
        // Simulate upload time
        setTimeout(() => {
            clearInterval(progressInterval);
            this.updateUploadProgress(100);
            
            // Process files
            files.forEach(file => {
                const document = {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    type: type,
                    matterId: matterId,
                    description: description,
                    size: file.size,
                    uploadDate: new Date().toISOString(),
                    version: this.getNextVersion(file.name, matterId),
                    file: null // En réel, on stockerait le fichier ou son URL
                };
                
                this.documents.push(document);
            });
            
            this.saveData();
            
            setTimeout(() => {
                this.hideUploadProgress();
                this.hideUploadForm();
                this.loadDocuments();
                
                const successMessage = files.length === 1 
                    ? `Document "${files[0].name}" uploadé avec succès !`
                    : `${files.length} documents uploadés avec succès !`;
                    
                this.showNotification(successMessage);
            }, 500);
            
        }, 1500 + Math.random() * 1000);
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
            submitButton.innerHTML = '<span class="btn-icon">⏳</span>Upload en cours...';
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
    
    showNotification(message) {
        // Create a notification element
        const notification = document.createElement('div');
        notification.className = 'upload-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">✅</span>
                <span class="notification-text">${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    getNextVersion(filename, matterId) {
        const baseName = filename.split('.')[0];
        const existingDocs = this.documents.filter(doc => 
            doc.matterId === matterId && doc.name.startsWith(baseName)
        );
        return existingDocs.length + 1;
    }
    
    loadDocuments() {
        const container = document.getElementById('documentsList');
        if (!container) return;
        
        if (this.documents.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun document uploadé</p>';
            return;
        }
        
        const filteredDocs = this.getFilteredDocuments();
        
        if (filteredDocs.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun document trouvé avec ces filtres</p>';
            return;
        }
        
        container.innerHTML = filteredDocs.map(doc => {
            const matter = this.matters.find(m => m.id === doc.matterId);
            const fileIcon = this.getFileIcon(doc.name);
            const typeLabel = this.getTypeLabel(doc.type);
            
            return `
                <div class="document-card">
                    <div class="document-header">
                        <span class="document-icon">${fileIcon}</span>
                        <div class="document-info">
                            <h4>${doc.name}</h4>
                            <div class="document-meta">
                                <strong>Dossier:</strong> ${matter ? matter.code : 'Dossier supprimé'} • 
                                <strong>Version:</strong> v${doc.version}
                            </div>
                        </div>
                    </div>
                    
                    <div class="document-type">${typeLabel}</div>
                    
                    <div class="document-description">
                        ${doc.description || 'Aucune description'}
                    </div>
                    
                    <div class="document-footer">
                        <div class="document-meta">
                            <span class="document-size">${this.formatFileSize(doc.size)}</span><br>
                            <small>${new Date(doc.uploadDate).toLocaleDateString('fr-FR')} ${new Date(doc.uploadDate).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</small>
                        </div>
                        <div class="document-actions">
                            <button class="btn-small" onclick="app.downloadDocument(${doc.id})" title="Télécharger">
                                <span class="btn-icon">📥</span>Télécharger
                            </button>
                            <button class="btn-small" onclick="app.deleteDocument(${doc.id})" title="Supprimer" style="border-color: #dc3545; color: #dc3545;">
                                <span class="btn-icon">🗑️</span>Supprimer
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
        
        return this.documents.filter(doc => {
            const matchesMatter = !matterFilter || doc.matterId == matterFilter;
            const matchesType = !typeFilter || doc.type === typeFilter;
            const matchesSearch = !searchFilter || 
                doc.name.toLowerCase().includes(searchFilter) ||
                doc.description?.toLowerCase().includes(searchFilter);
            
            return matchesMatter && matchesType && matchesSearch;
        });
    }
    
    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            pdf: '📄',
            doc: '📝', docx: '📝',
            txt: '📄',
            jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
            xls: '📊', xlsx: '📊'
        };
        return icons[ext] || '📁';
    }
    
    getTypeLabel(type) {
        const labels = {
            contract: 'Contrat',
            duediligence: 'Due Diligence',
            correspondence: 'Correspondance',
            opinion: 'Legal Opinion',
            note: 'Note',
            other: 'Autre'
        };
        return labels[type] || type;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    downloadDocument(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (doc) {
            alert(`Téléchargement de ${doc.name} (en réel, le fichier serait téléchargé)`);
        }
    }
    
    deleteDocument(docId) {
        if (confirm('Supprimer ce document ?')) {
            this.documents = this.documents.filter(d => d.id !== docId);
            this.saveData();
            this.loadDocuments();
        }
    }
    
    filterDocuments() {
        this.loadDocuments();
    }
    
    // ANALYTICS & REPORTING
    showAnalyticsSection() {
        this.updateAnalytics();
        this.setupCharts();
    }
    
    updateAnalytics() {
        const period = document.getElementById('analyticsPeriod')?.value || 'month';
        const data = this.getAnalyticsData(period);
        
        this.updateKPIs(data);
        this.updateCharts(data);
        this.updateTables(data);
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
        
        const filteredEntries = this.timeEntries.filter(entry => 
            new Date(entry.date) >= startDate
        );
        
        const filteredInvoices = this.invoices.filter(invoice => 
            new Date(invoice.date) >= startDate
        );
        
        return {
            period,
            timeEntries: filteredEntries,
            invoices: filteredInvoices,
            totalRevenue: filteredInvoices.reduce((sum, inv) => sum + inv.totalHT, 0),
            totalHours: filteredEntries.reduce((sum, entry) => sum + (entry.duration / 3600), 0),
            averageRate: filteredEntries.length > 0 ? 
                filteredEntries.reduce((sum, entry) => sum + entry.value, 0) / 
                filteredEntries.reduce((sum, entry) => sum + (entry.duration / 3600), 0) : 0
        };
    }
    
    updateKPIs(data) {
        // Calculs KPIs
        const elements = {
            kpiRevenue: `${Math.round(data.totalRevenue)}€`,
            kpiHours: `${data.totalHours.toFixed(1)}h`,
            kpiRate: `${Math.round(data.averageRate)}€`,
            kpiUtilization: `${Math.round((data.totalHours / (160 * 1)) * 100)}%` // Assuming 160h/month per person
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
        
        // Fake change percentages for demo
        const changes = ['kpiRevenueChange', 'kpiHoursChange', 'kpiRateChange', 'kpiUtilizationChange'];
        changes.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const change = Math.floor(Math.random() * 20) - 10;
                element.textContent = `${change > 0 ? '+' : ''}${change}%`;
                element.className = `kpi-change ${change > 0 ? 'positive' : 'negative'}`;
            }
        });
    }
    
    setupCharts() {
        // Simple chart implementation without external library
        this.drawRevenueChart();
        this.drawPracticeChart();
    }
    
    drawRevenueChart() {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) {
            console.log('Revenue chart canvas not found');
            return;
        }
        
        try {
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.log('Canvas context not available');
                return;
            }
            
            canvas.width = 400;
            canvas.height = 200;
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Sample data - in real app, calculate from actual data
            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'];
            const revenues = [15000, 18000, 22000, 16000, 25000, 30000];
            
            const maxRevenue = Math.max(...revenues);
            const width = canvas.width - 60;
            const height = canvas.height - 60;
            
            // Draw axes
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(40, height + 20);
            ctx.lineTo(width + 40, height + 20);
            ctx.moveTo(40, 20);
            ctx.lineTo(40, height + 20);
            ctx.stroke();
            
            // Draw data
            ctx.strokeStyle = '#4a9eff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            revenues.forEach((revenue, index) => {
                const x = 40 + (index * (width / (revenues.length - 1)));
                const y = height + 20 - ((revenue / maxRevenue) * height);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                
                // Draw point
                ctx.fillStyle = '#4a9eff';
                ctx.fillRect(x - 2, y - 2, 4, 4);
            });
            
            ctx.stroke();
            
            // Labels
            ctx.fillStyle = '#888';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            months.forEach((month, index) => {
                const x = 40 + (index * (width / (months.length - 1)));
                ctx.fillText(month, x, height + 35);
            });
            
        } catch (error) {
            console.error('Error drawing revenue chart:', error);
        }
    }
    
    drawPracticeChart() {
        const canvas = document.getElementById('practiceChart');
        if (!canvas) {
            console.log('Practice chart canvas not found');
            return;
        }
        
        try {
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.log('Canvas context not available');
                return;
            }
            
            canvas.width = 400;
            canvas.height = 200;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Sample data
            const practices = ['MA', 'CP', 'LTG', 'BK', 'IP'];
            const values = [30, 25, 20, 15, 10];
            const colors = ['#4a9eff', '#28a745', '#ffc107', '#dc3545', '#6f42c1'];
            
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = 80;
            
            let currentAngle = 0;
            
            values.forEach((value, index) => {
                const sliceAngle = (value / 100) * 2 * Math.PI;
                
                // Draw slice
                ctx.fillStyle = colors[index];
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                ctx.closePath();
                ctx.fill();
                
                // Draw label
                const labelAngle = currentAngle + sliceAngle / 2;
                const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
                const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
                
                ctx.fillStyle = '#e0e0e0';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${practices[index]} (${value}%)`, labelX, labelY);
                
                currentAngle += sliceAngle;
            });
            
        } catch (error) {
            console.error('Error drawing practice chart:', error);
        }
    }
    
    updateCharts(data) {
        this.drawRevenueChart();
        this.drawPracticeChart();
    }
    
    updateTables(data) {
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
            .slice(0, 5);
        
        if (sortedClients.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune donnée de facturation</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Client</th>
                        <th>CA</th>
                        <th>%</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedClients.map(([client, revenue]) => `
                        <tr>
                            <td>${client}</td>
                            <td>${Math.round(revenue)}€</td>
                            <td>${Math.round((revenue / data.totalRevenue) * 100)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    updateMatterProfitabilityTable(data) {
        const container = document.getElementById('matterProfitabilityTable');
        if (!container) return;
        
        // Calculate profitability by matter (simplified)
        const matterStats = {};
        
        data.timeEntries.forEach(entry => {
            if (!matterStats[entry.matterCode]) {
                matterStats[entry.matterCode] = {
                    hours: 0,
                    revenue: 0
                };
            }
            matterStats[entry.matterCode].hours += entry.duration / 3600;
            matterStats[entry.matterCode].revenue += entry.value;
        });
        
        const sortedMatters = Object.entries(matterStats)
            .map(([code, stats]) => ({
                code,
                hours: stats.hours,
                revenue: stats.revenue,
                rate: stats.hours > 0 ? stats.revenue / stats.hours : 0
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        
        if (sortedMatters.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune donnée de temps</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Dossier</th>
                        <th>Heures</th>
                        <th>CA</th>
                        <th>Taux</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedMatters.map(matter => `
                        <tr>
                            <td>${matter.code}</td>
                            <td>${matter.hours.toFixed(1)}h</td>
                            <td class="${matter.revenue > 0 ? 'profit-positive' : 'profit-negative'}">${Math.round(matter.revenue)}€</td>
                            <td>${Math.round(matter.rate)}€/h</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    // STATS & DATA
    updateStats() {
        const totalClientsEl = document.getElementById('totalClients');
        const totalMattersEl = document.getElementById('totalMatters');
        const totalHoursEl = document.getElementById('totalHours');
        const totalRevenueEl = document.getElementById('totalRevenue');
        
        if (totalClientsEl) totalClientsEl.textContent = this.clients.length;
        if (totalMattersEl) totalMattersEl.textContent = this.matters.length;
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyEntries = this.timeEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        });
        
        const totalHours = monthlyEntries.reduce((sum, entry) => sum + (entry.duration / 3600), 0);
        const totalRevenue = monthlyEntries.reduce((sum, entry) => sum + entry.value, 0);
        
        if (totalHoursEl) totalHoursEl.textContent = totalHours.toFixed(1);
        if (totalRevenueEl) totalRevenueEl.textContent = `${totalRevenue}€`;
    }
    
    saveData() {
        localStorage.setItem('prometheus_clients', JSON.stringify(this.clients));
        localStorage.setItem('prometheus_matters', JSON.stringify(this.matters));
        localStorage.setItem('prometheus_time', JSON.stringify(this.timeEntries));
        localStorage.setItem('prometheus_invoices', JSON.stringify(this.invoices));
        localStorage.setItem('prometheus_documents', JSON.stringify(this.documents));
    }
    
    loadData() {
        this.loadClients();
        this.loadMatters();
        this.loadTimeEntries();
        this.updateMatterClientSelects();
    }
    
    startAutoSave() {
        setInterval(() => {
            try {
                this.saveData();
            } catch (error) {
                console.error('Auto-save failed:', error);
                this.handleDataError(error);
            }
        }, 30000); // Save every 30 seconds
    }
    
    handleDataError(error) {
        console.error('Data error detected:', error);
        
        // Try to recover from localStorage corruption
        try {
            const backupData = {
                clients: this.clients || [],
                matters: this.matters || [],
                timeEntries: this.timeEntries || [],
                invoices: this.invoices || [],
                documents: this.documents || []
            };
            
            console.log('Current data backup created:', backupData);
            
        } catch (backupError) {
            console.error('Could not create backup:', backupError);
            alert('Erreur critique dans les données. Veuillez sauvegarder votre travail manuellement.');
        }
    }
}

// GLOBAL FUNCTIONS (pour les onclick HTML)
let app;

window.onload = function() {
    app = new PrometheusApp();
};

function showSection(section) {
    app.showSection(section);
}

function showAddClientForm() {
    app.showAddClientForm();
}

function hideAddClientForm() {
    app.hideAddClientForm();
}

function addClient(event) {
    app.addClient(event);
}

function showAddMatterForm() {
    app.showAddMatterForm();
}

function hideAddMatterForm() {
    app.hideAddMatterForm();
}

function addMatter(event) {
    app.addMatter(event);
}

function toggleTimer() {
    app.toggleTimer();
}

function resetTimer() {
    app.resetTimer();
}

function updateUserRate() {
    app.updateUserRate();
}

function generateInvoice() {
    app.generateInvoice();
}

function hideInvoiceForm() {
    app.hideInvoiceForm();
}

function createInvoice(event) {
    app.createInvoice(event);
}

function updateInvoiceSummary() {
    app.updateInvoiceSummary();
}

function exportAccounting() {
    app.exportAccounting();
}

function exportCSV() {
    app.exportCSV();
}

// DOCUMENTS FUNCTIONS
function showUploadForm() {
    app.showUploadForm();
}

function hideUploadForm() {
    app.hideUploadForm();
}

function uploadDocument(event) {
    app.uploadDocument(event);
}

function filterDocuments() {
    app.filterDocuments();
}

// ANALYTICS FUNCTIONS
function updateAnalytics() {
    app.updateAnalytics();
}

// NOTIFICATION SYSTEM
window.showError = function(message) {
    const errorDisplay = document.getElementById('errorDisplay');
    const errorMessage = document.getElementById('errorMessage');
    if (errorDisplay && errorMessage) {
        errorMessage.textContent = message;
        errorDisplay.style.display = 'flex';
    }
};

window.hideError = function() {
    const errorDisplay = document.getElementById('errorDisplay');
    if (errorDisplay) {
        errorDisplay.style.display = 'none';
    }
};

// KEYBOARD SHORTCUTS & GLOBAL SEARCH
class KeyboardManager {
    constructor(app) {
        this.app = app;
        this.searchVisible = false;
        this.init();
    }
    
    init() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.createSearchModal();
    }
    
    handleKeydown(e) {
        // Ignore if typing in input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }
        
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey;
        const alt = e.altKey;
        const shift = e.shiftKey;
        
        // Navigation générale
        if (ctrl && key === 'd') {
            e.preventDefault();
            this.navigateToSection('dashboard');
        }
        
        if (ctrl && key === 'r') {
            e.preventDefault();
            this.showGlobalSearch();
        }
        
        if (alt && key === 'c') {
            e.preventDefault();
            this.navigateToSection('clients');
        }
        
        if (alt && key === 'm') {
            e.preventDefault();
            this.navigateToSection('matters');
        }
        
        if (alt && key === 'd') {
            e.preventDefault();
            this.navigateToSection('documents');
        }
        
        if (alt && key === 'a') {
            e.preventDefault();
            this.navigateToSection('analytics');
        }
        
        if (ctrl && key === 'n') {
            e.preventDefault();
            if (shift) {
                this.quickNewMatter();
            } else {
                this.newMatter();
            }
        }
        
        // Time tracking
        if (ctrl && key === 't') {
            e.preventDefault();
            this.app.toggleTimer();
        }
        
        // Function keys
        if (key === 'f5') {
            e.preventDefault();
            this.refreshTimerDisplay();
        }
        
        if (key === 'f12') {
            e.preventDefault();
            this.navigateToSection('dashboard');
        }
        
        if (key === 'f2') {
            e.preventDefault();
            this.renameActiveItem();
        }
        
        // Close search on Escape
        if (key === 'escape' && this.searchVisible) {
            this.hideGlobalSearch();
        }
    }
    
    navigateToSection(section) {
        // Simulate click on nav button
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        // Find and activate the correct button
        const targetButton = Array.from(navButtons).find(btn => 
            btn.onclick.toString().includes(`'${section}'`)
        );
        
        if (targetButton) {
            targetButton.classList.add('active');
            this.app.showSection(section);
            this.showNotification(`Navigation: ${section.charAt(0).toUpperCase() + section.slice(1)}`);
        }
    }
    
    newMatter() {
        this.navigateToSection('matters');
        setTimeout(() => {
            this.app.showAddMatterForm();
            this.showNotification('Nouveau dossier (Ctrl+N)');
        }, 100);
    }
    
    quickNewMatter() {
        this.navigateToSection('matters');
        setTimeout(() => {
            this.app.showAddMatterForm();
            // Auto-focus first field
            document.getElementById('matterPractice')?.focus();
            this.showNotification('Nouveau dossier rapide (Ctrl+Shift+N)');
        }, 100);
    }
    
    refreshTimerDisplay() {
        this.app.updateTimerDisplay();
        this.showNotification('Timer actualisé (F5)');
    }
    
    renameActiveItem() {
        // This could be expanded to rename selected items
        this.showNotification('Fonction Renommer (F2) - À développer');
    }
    
    createSearchModal() {
        const searchModal = document.createElement('div');
        searchModal.id = 'globalSearchModal';
        searchModal.className = 'search-modal';
        searchModal.innerHTML = `
            <div class="search-overlay">
                <div class="search-container">
                    <div class="search-header">
                        <input type="text" id="globalSearchInput" placeholder="Recherche globale... (Ctrl+R)" autofocus>
                        <button onclick="keyboardManager.hideGlobalSearch()" class="search-close">✕</button>
                    </div>
                    <div class="search-results">
                        <div id="searchResults" class="search-results-content">
                            <p class="search-hint">Tapez pour rechercher dans clients, dossiers et temps...</p>
                        </div>
                    </div>
                    <div class="search-footer">
                        <span>↑↓ Navigation • Enter Sélectionner • Esc Fermer</span>
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
        this.searchVisible = true;
        document.getElementById('globalSearchModal').style.display = 'flex';
        document.getElementById('globalSearchInput').focus();
        document.getElementById('globalSearchInput').select();
        this.showNotification('Recherche globale (Ctrl+R)');
    }
    
    hideGlobalSearch() {
        this.searchVisible = false;
        document.getElementById('globalSearchModal').style.display = 'none';
        document.getElementById('globalSearchInput').value = '';
        document.getElementById('searchResults').innerHTML = '<p class="search-hint">Tapez pour rechercher dans clients, dossiers et temps...</p>';
    }
    
    performSearch(query) {
        if (!query || query.length < 2) {
            document.getElementById('searchResults').innerHTML = '<p class="search-hint">Tapez au moins 2 caractères...</p>';
            return;
        }
        
        const results = this.searchAll(query.toLowerCase());
        this.displaySearchResults(results);
    }
    
    searchAll(query) {
        const results = {
            clients: [],
            matters: [],
            timeEntries: [],
            documents: []
        };
        
        // Search clients
        this.app.clients.forEach(client => {
            if (client.name.toLowerCase().includes(query) || 
                client.contact?.toLowerCase().includes(query) ||
                client.email?.toLowerCase().includes(query)) {
                results.clients.push(client);
            }
        });
        
        // Search matters
        this.app.matters.forEach(matter => {
            if (matter.title.toLowerCase().includes(query) ||
                matter.code.toLowerCase().includes(query) ||
                matter.description?.toLowerCase().includes(query) ||
                matter.practice.toLowerCase().includes(query)) {
                results.matters.push(matter);
            }
        });
        
        // Search recent time entries
        this.app.timeEntries.slice(-20).forEach(entry => {
            if (entry.matterCode.toLowerCase().includes(query)) {
                results.timeEntries.push(entry);
            }
        });
        
        // Search documents
        this.app.documents.forEach(doc => {
            if (doc.name.toLowerCase().includes(query) ||
                doc.description?.toLowerCase().includes(query)) {
                results.documents.push(doc);
            }
        });
        
        return results;
    }
    
    displaySearchResults(results) {
        const container = document.getElementById('searchResults');
        let html = '';
        
        if (results.clients.length === 0 && results.matters.length === 0 && 
            results.timeEntries.length === 0 && results.documents.length === 0) {
            html = '<p class="search-no-results">Aucun résultat trouvé</p>';
        } else {
            // Clients results
            if (results.clients.length > 0) {
                html += '<div class="search-section"><h4>📋 Clients</h4>';
                results.clients.slice(0, 5).forEach(client => {
                    html += `
                        <div class="search-result" onclick="keyboardManager.selectSearchResult('client', ${client.id})">
                            <strong>${client.name}</strong>
                            <span>${client.tier} • ${client.contact || 'N/A'}</span>
                        </div>
                    `;
                });
                html += '</div>';
            }
            
            // Matters results
            if (results.matters.length > 0) {
                html += '<div class="search-section"><h4>⚖️ Dossiers</h4>';
                results.matters.slice(0, 5).forEach(matter => {
                    const client = this.app.clients.find(c => c.id === matter.clientId);
                    html += `
                        <div class="search-result" onclick="keyboardManager.selectSearchResult('matter', ${matter.id})">
                            <strong>${matter.title}</strong>
                            <span>${matter.code} • ${client ? client.name : 'Client supprimé'}</span>
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
                    const typeLabel = this.getDocumentTypeLabel(doc.type);
                    html += `
                        <div class="search-result" onclick="keyboardManager.selectSearchResult('document', ${doc.id})">
                            <strong>${doc.name}</strong>
                            <span>${matter ? matter.code : 'N/A'} • ${typeLabel}</span>
                        </div>
                    `;
                });
                html += '</div>';
            }
            
            // Time entries results
            if (results.timeEntries.length > 0) {
                html += '<div class="search-section"><h4>⏱️ Temps Récent</h4>';
                results.timeEntries.slice(0, 3).forEach(entry => {
                    html += `
                        <div class="search-result" onclick="keyboardManager.selectSearchResult('time', ${entry.id})">
                            <strong>${entry.matterCode}</strong>
                            <span>${this.app.formatTime(entry.duration * 1000)} • ${new Date(entry.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                    `;
                });
                html += '</div>';
            }
        }
        
        container.innerHTML = html;
    }
    
    selectSearchResult(type, id) {
        if (type === 'client') {
            this.navigateToSection('clients');
        } else if (type === 'matter') {
            this.navigateToSection('matters');
        } else if (type === 'time') {
            this.navigateToSection('timetracking');
        } else if (type === 'document') {
            this.navigateToSection('documents');
        }
        
        this.hideGlobalSearch();
        this.showNotification(`Ouverture ${type} sélectionné`);
    }
    
    handleSearchKeydown(e) {
        if (e.key === 'Escape') {
            this.hideGlobalSearch();
        }
        // Could add arrow key navigation here
    }
    
    getDocumentTypeLabel(type) {
        const labels = {
            contract: 'Contrat',
            duediligence: 'Due Diligence',
            correspondence: 'Correspondance',
            opinion: 'Legal Opinion',
            note: 'Note',
            other: 'Autre'
        };
        return labels[type] || type;
    }
    
    showNotification(message) {
        // Remove existing notification
        const existing = document.querySelector('.keyboard-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'keyboard-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 2000);
    }
}

// Initialize keyboard manager
let keyboardManager;

// Update window.onload to include keyboard manager
const originalOnload = window.onload;
window.onload = function() {
    app = new PrometheusApp();
    keyboardManager = new KeyboardManager(app);
};