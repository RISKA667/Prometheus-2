/**
 * PROMETHEUS.EXE - EXTENDED BUSINESS LOGIC MANAGERS
 * BOURDON & Associates - Legal Management System
 * Version: 3.0.0 - Full English Native + Vectorized Architecture
 * 
 * Extended specialized managers:
 * - TimeTracker: Advanced time tracking and productivity analytics
 * - BillingManager: Comprehensive billing and financial management
 * - DocumentManager: Document lifecycle and version control
 * - AnalyticsManager: Business intelligence and reporting
 * - SearchManager: Advanced search and filtering capabilities
 */

'use strict';

// ========================================
// TIME TRACKER - ADVANCED TIME MANAGEMENT
// ========================================

class TimeTracker {
    constructor(app) {
        this.app = app;
        this.timeEntries = [];
        this.filteredEntries = [];
        
        // Timer state
        this.timer = {
            isRunning: false,
            isPaused: false,
            startTime: null,
            pausedTime: 0,
            currentMatter: null,
            description: '',
            elapsed: 0
        };
        
        // Filters and settings
        this.activeFilters = {
            period: 'month',
            matter: '',
            billed: ''
        };
        
        this.currentUserRate = USER_ROLES.associate.rate;
        this.timerInterval = null;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            await this.loadTimeEntries();
            this.setupTimeEventListeners();
            this.restoreTimerState();
            this.startTimerUpdateLoop();
            
            console.log('✅ TimeTracker initialized');
        } catch (error) {
            console.error('❌ TimeTracker initialization failed:', error);
            throw error;
        }
    }
    
    setupTimeEventListeners() {
        // Period filter
        const periodFilter = document.getElementById('timeFilterPeriod');
        if (periodFilter) {
            periodFilter.addEventListener('change', (e) => {
                this.activeFilters.period = e.target.value;
                this.filterTimeEntries();
            });
        }
        
        // Timer matter selection
        const timerMatter = document.getElementById('timerMatter');
        if (timerMatter) {
            timerMatter.addEventListener('change', (e) => {
                this.timer.currentMatter = e.target.value;
                this.saveTimerState();
            });
        }
        
        // Timer description
        const timerDescription = document.getElementById('timerDescription');
        if (timerDescription) {
            timerDescription.addEventListener('input', (e) => {
                this.timer.description = e.target.value;
                this.saveTimerState();
            });
        }
    }
    
    async loadTimeEntries() {
        try {
            this.timeEntries = this.app.dataManager.read('timeEntries');
            this.updateCurrentUserRate();
            this.filterTimeEntries();
            this.renderTimeEntries();
            this.updateTimeStats();
            
            console.log(`✅ Loaded ${this.timeEntries.length} time entries`);
        } catch (error) {
            console.error('❌ Failed to load time entries:', error);
            throw error;
        }
    }
    
    startTimerUpdateLoop() {
        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
        }, 1000);
    }
    
    updateCurrentUserRate() {
        const userLevel = localStorage.getItem('prometheus_user_level') || 'associate';
        this.currentUserRate = USER_ROLES[userLevel]?.rate || USER_ROLES.associate.rate;
        
        // Update rate display
        const currentRateElement = document.getElementById('currentRate');
        if (currentRateElement) {
            currentRateElement.textContent = `Current rate: ${this.app.formatCurrency(this.currentUserRate)}/hour`;
        }
    }
    
    toggleTimer() {
        try {
            if (this.timer.isRunning) {
                this.stopTimer();
            } else {
                this.startTimer();
            }
        } catch (error) {
            console.error('❌ Timer toggle failed:', error);
            this.app.handleError(error, 'TimeTracker.toggleTimer');
        }
    }
    
    startTimer() {
        try {
            // Check if matter is selected
            if (!this.timer.currentMatter) {
                notificationManager.showWarning('Please select a matter before starting the timer');
                return;
            }
            
            this.timer.isRunning = true;
            this.timer.isPaused = false;
            this.timer.startTime = Date.now() - this.timer.elapsed;
            
            this.updateTimerButtons('running');
            this.saveTimerState();
            
            // Track timer start
            this.trackTimeAction('timer_started', {
                matterId: this.timer.currentMatter,
                description: this.timer.description
            });
            
            notificationManager.showSuccess('Timer started');
            
        } catch (error) {
            console.error('❌ Failed to start timer:', error);
            throw error;
        }
    }
    
    stopTimer() {
        try {
            if (!this.timer.isRunning) return;
            
            this.timer.isRunning = false;
            this.timer.isPaused = false;
            
            const duration = this.timer.elapsed;
            
            // Only save if duration is at least 1 minute
            if (duration >= 60000) {
                this.saveTimeEntry();
            } else {
                notificationManager.showInfo('Timer stopped (minimum 1 minute not reached)');
            }
            
            this.resetTimer();
            this.updateTimerButtons('stopped');
            
            // Track timer stop
            this.trackTimeAction('timer_stopped', {
                duration: duration,
                saved: duration >= 60000
            });
            
        } catch (error) {
            console.error('❌ Failed to stop timer:', error);
            throw error;
        }
    }
    
    pauseTimer() {
        try {
            if (!this.timer.isRunning) return;
            
            this.timer.isPaused = true;
            this.timer.pausedTime = Date.now();
            
            this.updateTimerButtons('paused');
            this.saveTimerState();
            
            notificationManager.showInfo('Timer paused');
            
        } catch (error) {
            console.error('❌ Failed to pause timer:', error);
            throw error;
        }
    }
    
    resumeTimer() {
        try {
            if (!this.timer.isPaused) return;
            
            // Adjust start time to account for pause duration
            const pauseDuration = Date.now() - this.timer.pausedTime;
            this.timer.startTime += pauseDuration;
            
            this.timer.isPaused = false;
            this.timer.pausedTime = 0;
            
            this.updateTimerButtons('running');
            this.saveTimerState();
            
            notificationManager.showSuccess('Timer resumed');
            
        } catch (error) {
            console.error('❌ Failed to resume timer:', error);
            throw error;
        }
    }
    
    resetTimer() {
        this.timer.elapsed = 0;
        this.timer.startTime = null;
        this.timer.pausedTime = 0;
        this.timer.isPaused = false;
        this.timer.isRunning = false;
        
        this.updateTimerDisplay();
        this.updateTimerButtons('stopped');
        this.clearTimerState();
    }
    
    updateTimerDisplay() {
        if (this.timer.isRunning && !this.timer.isPaused) {
            this.timer.elapsed = Date.now() - this.timer.startTime;
        }
        
        const formattedTime = this.app.formatDuration(this.timer.elapsed);
        
        // Update all timer displays
        const displays = [
            document.getElementById('timerDisplay'),
            document.getElementById('timerDisplayLarge')
        ];
        
        displays.forEach(display => {
            if (display) {
                display.textContent = formattedTime;
                display.setAttribute('aria-label', `Timer: ${formattedTime}`);
            }
        });
    }
    
    updateTimerButtons(state) {
        const buttons = [
            document.getElementById('timerBtn'),
            document.getElementById('timerBtnLarge')
        ];
        
        const pauseBtn = document.getElementById('pauseTimerBtn');
        
        buttons.forEach(btn => {
            if (!btn) return;
            
            switch (state) {
                case 'running':
                    btn.innerHTML = '<span class="timer-icon">⏸️</span><span class="timer-text">Stop Timer</span>';
                    btn.classList.add('running');
                    btn.setAttribute('aria-label', 'Stop timer');
                    if (pauseBtn) pauseBtn.style.display = 'inline-block';
                    break;
                    
                case 'paused':
                    btn.innerHTML = '<span class="timer-icon">▶️</span><span class="timer-text">Resume Timer</span>';
                    btn.classList.remove('running');
                    btn.classList.add('paused');
                    btn.setAttribute('aria-label', 'Resume timer');
                    break;
                    
                case 'stopped':
                default:
                    btn.innerHTML = '<span class="timer-icon">▶️</span><span class="timer-text">Start Timer</span>';
                    btn.classList.remove('running', 'paused');
                    btn.setAttribute('aria-label', 'Start timer');
                    if (pauseBtn) pauseBtn.style.display = 'none';
                    break;
            }
        });
    }
    
    saveTimeEntry() {
        try {
            const matter = this.app.matterManager.getMatterById(this.timer.currentMatter);
            if (!matter) {
                throw new Error('Matter not found for time entry');
            }
            
            const duration = this.timer.elapsed;
            const hours = duration / 3600000; // Convert to hours
            const value = Math.round(hours * this.currentUserRate * 100) / 100; // Round to cents
            
            const timeEntry = this.app.dataManager.create('timeEntries', {
                matterId: this.timer.currentMatter,
                matterCode: matter.code,
                description: this.timer.description || 'Time entry',
                duration: duration,
                hours: hours,
                rate: this.currentUserRate,
                value: value,
                date: new Date().toISOString(),
                billed: false,
                invoiceId: null
            });
            
            // Update local array
            this.timeEntries.push(timeEntry);
            
            // Update matter totals
            this.updateMatterTotals(matter.id, duration, value);
            
            // Refresh displays
            this.filterTimeEntries();
            this.renderTimeEntries();
            this.updateTimeStats();
            this.updateTodayTimeWidget();
            
            // Show success message
            const formattedDuration = this.app.formatDuration(duration);
            notificationManager.showSuccess(
                `Time entry saved: ${formattedDuration} (${this.app.formatCurrency(value)})`
            );
            
            // Track time entry creation
            this.trackTimeAction('entry_created', {
                matterId: this.timer.currentMatter,
                duration: duration,
                value: value
            });
            
            // Update dashboard
            this.app.updateDashboard();
            
            return timeEntry;
            
        } catch (error) {
            console.error('❌ Failed to save time entry:', error);
            notificationManager.showError('Failed to save time entry');
            throw error;
        }
    }
    
    updateMatterTotals(matterId, duration, value) {
        try {
            const matter = this.app.matterManager.getMatterById(matterId);
            if (matter) {
                const updatedMatter = this.app.dataManager.update('matters', matterId, {
                    totalTime: (matter.totalTime || 0) + duration,
                    totalValue: (matter.totalValue || 0) + value,
                    lastActivity: new Date().toISOString()
                });
                
                // Update matter manager's local array
                const index = this.app.matterManager.matters.findIndex(m => m.id === matterId);
                if (index !== -1) {
                    this.app.matterManager.matters[index] = updatedMatter;
                }
            }
        } catch (error) {
            console.error('❌ Failed to update matter totals:', error);
        }
    }
    
    startTimerForMatter(matterId) {
        try {
            // Set the matter
            this.timer.currentMatter = matterId;
            
            // Update UI
            const matterSelect = document.getElementById('timerMatter');
            if (matterSelect) {
                matterSelect.value = matterId;
            }
            
            // Save state
            this.saveTimerState();
            
            // Navigate to time tracking section
            this.app.uiManager.showSection('timetracking');
            
            // Start timer after a brief delay
            setTimeout(() => {
                this.startTimer();
            }, 500);
            
        } catch (error) {
            console.error('❌ Failed to start timer for matter:', error);
            this.app.handleError(error, 'TimeTracker.startTimerForMatter');
        }
    }
    
    editTimeEntry(entryId) {
        try {
            const entry = this.timeEntries.find(e => e.id === entryId);
            if (!entry) {
                throw new Error(`Time entry not found: ${entryId}`);
            }
            
            // For now, just show a simple prompt for editing
            // In a full implementation, this would show a proper edit form
            const newDescription = prompt('Edit description:', entry.description);
            if (newDescription !== null) {
                const updatedEntry = this.app.dataManager.update('timeEntries', entryId, {
                    description: newDescription.trim()
                });
                
                // Update local array
                const index = this.timeEntries.findIndex(e => e.id === entryId);
                if (index !== -1) {
                    this.timeEntries[index] = updatedEntry;
                }
                
                // Refresh display
                this.renderTimeEntries();
                
                notificationManager.showSuccess('Time entry updated successfully');
                
                // Track edit
                this.trackTimeAction('entry_edited', { entryId: entryId });
            }
            
        } catch (error) {
            console.error('❌ Failed to edit time entry:', error);
            this.app.handleError(error, 'TimeTracker.editTimeEntry');
        }
    }
    
    deleteTimeEntry(entryId) {
        try {
            const entry = this.timeEntries.find(e => e.id === entryId);
            if (!entry) {
                throw new Error(`Time entry not found: ${entryId}`);
            }
            
            if (!confirm(`Delete this time entry (${this.app.formatDuration(entry.duration)})?`)) {
                return;
            }
            
            // Delete from database
            this.app.dataManager.delete('timeEntries', entryId);
            
            // Remove from local array
            this.timeEntries = this.timeEntries.filter(e => e.id !== entryId);
            
            // Update matter totals
            this.updateMatterTotals(entry.matterId, -entry.duration, -entry.value);
            
            // Refresh displays
            this.filterTimeEntries();
            this.renderTimeEntries();
            this.updateTimeStats();
            
            notificationManager.showSuccess('Time entry deleted successfully');
            
            // Track deletion
            this.trackTimeAction('entry_deleted', { entryId: entryId });
            
            // Update dashboard
            this.app.updateDashboard();
            
        } catch (error) {
            console.error('❌ Failed to delete time entry:', error);
            this.app.handleError(error, 'TimeTracker.deleteTimeEntry');
        }
    }
    
    filterTimeEntries() {
        try {
            const now = new Date();
            let startDate, endDate;
            
            switch (this.activeFilters.period) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                    break;
                case 'week':
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay());
                    startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
                    endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    break;
                case 'all':
                default:
                    startDate = new Date(2020, 0, 1);
                    endDate = new Date(2030, 11, 31);
                    break;
            }
            
            this.filteredEntries = this.timeEntries.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= startDate && entryDate < endDate;
            });
            
            // Sort by date (newest first)
            this.filteredEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            this.renderTimeEntries();
            
        } catch (error) {
            console.error('❌ Failed to filter time entries:', error);
        }
    }
    
    renderTimeEntries() {
        const container = document.getElementById('timeEntriesList');
        if (!container) return;
        
        if (this.filteredEntries.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }
        
        container.innerHTML = this.filteredEntries.map(entry => this.renderTimeEntryCard(entry)).join('');
    }
    
    renderTimeEntryCard(entry) {
        const matter = this.app.matterManager.getMatterById(entry.matterId);
        const entryDate = new Date(entry.date);
        
        return `
            <div class="time-entry-card" data-entry-id="${entry.id}">
                <div class="entry-main">
                    <div class="entry-duration">
                        <span class="duration-text">${this.app.formatDuration(entry.duration)}</span>
                        <span class="duration-decimal">${entry.hours.toFixed(2)}h</span>
                    </div>
                    
                    <div class="entry-details">
                        <div class="entry-matter">
                            <span class="matter-code">${entry.matterCode}</span>
                            ${matter ? `<span class="matter-title">${this.app.escapeHtml(matter.title)}</span>` : ''}
                        </div>
                        <div class="entry-description">
                            ${this.app.escapeHtml(entry.description)}
                        </div>
                        <div class="entry-meta">
                            <span class="entry-date">${entryDate.toLocaleDateString()}</span>
                            <span class="entry-time">${entryDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span class="entry-rate">${this.app.formatCurrency(entry.rate)}/h</span>
                        </div>
                    </div>
                    
                    <div class="entry-value">
                        <span class="value-amount">${this.app.formatCurrency(entry.value)}</span>
                        <span class="billing-status ${entry.billed ? 'billed' : 'unbilled'}">
                            ${entry.billed ? 'Billed' : 'Unbilled'}
                        </span>
                    </div>
                </div>
                
                <div class="entry-actions">
                    <button class="btn-small" 
                            onclick="timeTracker.editTimeEntry('${entry.id}')" 
                            aria-label="Edit time entry">
                        <span class="btn-icon">✏️</span>
                        Edit
                    </button>
                    <button class="btn-small btn-danger" 
                            onclick="timeTracker.deleteTimeEntry('${entry.id}')" 
                            aria-label="Delete time entry">
                        <span class="btn-icon">🗑️</span>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }
    
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">⏱️</div>
                <h3>No time entries recorded</h3>
                <p>Start tracking your time to see entries here</p>
                <button class="btn-primary btn-sm" onclick="timeTracker.startTimer()">
                    Start Your First Timer
                </button>
            </div>
        `;
    }
    
    updateTimeStats() {
        try {
            const now = new Date();
            
            // Today's hours
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayEntries = this.timeEntries.filter(entry => 
                new Date(entry.date) >= todayStart
            );
            const todayHours = todayEntries.reduce((sum, entry) => sum + entry.hours, 0);
            
            // This week's hours
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEntries = this.timeEntries.filter(entry => 
                new Date(entry.date) >= weekStart
            );
            const weekHours = weekEntries.reduce((sum, entry) => sum + entry.hours, 0);
            
            // This month's hours
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEntries = this.timeEntries.filter(entry => 
                new Date(entry.date) >= monthStart
            );
            const monthHours = monthEntries.reduce((sum, entry) => sum + entry.hours, 0);
            
            // Update UI elements
            const elements = {
                todayHours: `${todayHours.toFixed(1)}h`,
                weekHours: `${weekHours.toFixed(1)}h`,
                monthHours: `${monthHours.toFixed(1)}h`
            };
            
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
            
            // Update dashboard total hours
            const totalHoursElement = document.getElementById('totalHours');
            if (totalHoursElement) {
                totalHoursElement.textContent = `${monthHours.toFixed(1)}`;
            }
            
        } catch (error) {
            console.error('❌ Failed to update time stats:', error);
        }
    }
    
    updateTodayTimeWidget() {
        const container = document.getElementById('todayTimeList');
        if (!container) return;
        
        const today = new Date().toDateString();
        const todayEntries = this.timeEntries.filter(entry => 
            new Date(entry.date).toDateString() === today
        );
        
        if (todayEntries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⏱️</div>
                    <p>No time entries recorded today</p>
                    <button class="btn-primary btn-sm" onclick="timeTracker.startTimer()">
                        Start Timer
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = todayEntries.map(entry => `
            <div class="widget-item time-item">
                <div class="item-content">
                    <span class="time-duration">${this.app.formatDuration(entry.duration)}</span>
                    <span class="time-matter">${this.app.escapeHtml(entry.matterCode)}</span>
                    <span class="time-value">${this.app.formatCurrency(entry.value)}</span>
                </div>
            </div>
        `).join('');
    }
    
    exportTimesheet() {
        try {
            const data = this.filteredEntries.map(entry => ({
                date: new Date(entry.date).toLocaleDateString(),
                matterCode: entry.matterCode,
                description: entry.description,
                duration: this.app.formatDuration(entry.duration),
                hours: entry.hours.toFixed(2),
                rate: entry.rate,
                value: entry.value.toFixed(2),
                billed: entry.billed ? 'Yes' : 'No'
            }));
            
            const csv = this.app.dataManager.convertToCSV(data);
            
            // Download file
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `timesheet-${this.activeFilters.period}-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            notificationManager.showSuccess('Timesheet exported successfully');
            
        } catch (error) {
            console.error('❌ Failed to export timesheet:', error);
            notificationManager.showError('Failed to export timesheet');
        }
    }
    
    // Timer state persistence
    saveTimerState() {
        const state = {
            isRunning: this.timer.isRunning,
            isPaused: this.timer.isPaused,
            startTime: this.timer.startTime,
            pausedTime: this.timer.pausedTime,
            elapsed: this.timer.elapsed,
            currentMatter: this.timer.currentMatter,
            description: this.timer.description
        };
        
        localStorage.setItem('prometheus_timer_state', JSON.stringify(state));
    }
    
    restoreTimerState() {
        try {
            const savedState = localStorage.getItem('prometheus_timer_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                this.timer = {
                    ...this.timer,
                    ...state
                };
                
                // Restore UI state
                if (this.timer.currentMatter) {
                    const matterSelect = document.getElementById('timerMatter');
                    if (matterSelect) {
                        matterSelect.value = this.timer.currentMatter;
                    }
                }
                
                if (this.timer.description) {
                    const descriptionField = document.getElementById('timerDescription');
                    if (descriptionField) {
                        descriptionField.value = this.timer.description;
                    }
                }
                
                // Update displays
                this.updateTimerDisplay();
                
                if (this.timer.isRunning) {
                    this.updateTimerButtons('running');
                } else if (this.timer.isPaused) {
                    this.updateTimerButtons('paused');
                }
            }
        } catch (error) {
            console.error('❌ Failed to restore timer state:', error);
        }
    }
    
    clearTimerState() {
        localStorage.removeItem('prometheus_timer_state');
    }
    
    // Utility methods
    getTimeEntryCount() {
        return this.timeEntries.length;
    }
    
    getTimeEntriesForPeriod(startDate, endDate) {
        return this.timeEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= startDate && entryDate <= endDate;
        });
    }
    
    getTimeEntriesByMatter(matterId) {
        return this.timeEntries.filter(entry => entry.matterId === matterId);
    }
    
    getRecentTimeEntries(limit = 10) {
        return [...this.timeEntries]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
    }
    
    getUnbilledTimeEntries() {
        return this.timeEntries.filter(entry => !entry.billed);
    }
    
    getBilledTimeEntries() {
        return this.timeEntries.filter(entry => entry.billed);
    }
    
    getTotalUnbilledValue() {
        return this.getUnbilledTimeEntries().reduce((sum, entry) => sum + entry.value, 0);
    }
    
    getTotalUnbilledHours() {
        return this.getUnbilledTimeEntries().reduce((sum, entry) => sum + entry.hours, 0);
    }
    
    // Analytics
    getTimeAnalytics() {
        const analytics = {
            totalEntries: this.timeEntries.length,
            totalHours: this.timeEntries.reduce((sum, entry) => sum + entry.hours, 0),
            totalValue: this.timeEntries.reduce((sum, entry) => sum + entry.value, 0),
            averageRate: 0,
            billedHours: 0,
            unbilledHours: 0,
            billedValue: 0,
            unbilledValue: 0
        };
        
        analytics.averageRate = analytics.totalHours > 0 ? analytics.totalValue / analytics.totalHours : 0;
        
        const billedEntries = this.getBilledTimeEntries();
        const unbilledEntries = this.getUnbilledTimeEntries();
        
        analytics.billedHours = billedEntries.reduce((sum, entry) => sum + entry.hours, 0);
        analytics.unbilledHours = unbilledEntries.reduce((sum, entry) => sum + entry.hours, 0);
        analytics.billedValue = billedEntries.reduce((sum, entry) => sum + entry.value, 0);
        analytics.unbilledValue = unbilledEntries.reduce((sum, entry) => sum + entry.value, 0);
        
        return analytics;
    }
    
    // Event tracking
    trackTimeAction(action, data = {}) {
        const event = {
            type: 'time_action',
            action: action,
            timestamp: Date.now(),
            data: data
        };
        
        // Store for analytics
        const events = JSON.parse(sessionStorage.getItem('prometheus_time_events') || '[]');
        events.push(event);
        
        // Keep only last 1000 events
        if (events.length > 1000) {
            events.splice(0, events.length - 1000);
        }
        
        sessionStorage.setItem('prometheus_time_events', JSON.stringify(events));
    }
}

// ========================================
// BILLING MANAGER - FINANCIAL MANAGEMENT
// ========================================

class BillingManager {
    constructor(app) {
        this.app = app;
        this.invoices = [];
        this.filteredInvoices = [];
        this.currentUserRate = USER_ROLES.associate.rate;
        this.nextInvoiceNumber = null;
        
        this.activeFilters = {
            status: '',
            client: '',
            period: 'all'
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            await this.loadBillingData();
            this.setupBillingEventListeners();
            this.updateUserRate();
            
            console.log('✅ BillingManager initialized');
        } catch (error) {
            console.error('❌ BillingManager initialization failed:', error);
            throw error;
        }
    }
    
    setupBillingEventListeners() {
        // User level change
        const userLevelSelect = document.getElementById('userLevel');
        if (userLevelSelect) {
            userLevelSelect.addEventListener('change', () => {
                this.updateUserRate();
            });
        }
        
        // Invoice status filter
        const statusFilter = document.getElementById('invoiceStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.activeFilters.status = e.target.value;
                this.filterInvoices();
            });
        }
        
        // Export period change
        const exportPeriod = document.getElementById('exportPeriod');
        if (exportPeriod) {
            exportPeriod.addEventListener('change', (e) => {
                const customRange = document.getElementById('customExportRange');
                if (customRange) {
                    customRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
                }
            });
        }
        
        // Time entries filter
        const timeEntriesFilter = document.getElementById('timeEntriesFilter');
        if (timeEntriesFilter) {
            timeEntriesFilter.addEventListener('change', () => {
                this.loadBillableEntries();
            });
        }
        
        // Client selection for invoice
        const invoiceClientSelect = document.getElementById('invoiceClientSelect');
        if (invoiceClientSelect) {
            invoiceClientSelect.addEventListener('change', () => {
                this.loadClientDetails();
                this.loadBillableEntries();
            });
        }
    }
    
    async loadBillingData() {
        try {
            this.invoices = this.app.dataManager.read('invoices');
            this.updateInvoiceClientSelect();
            this.filterInvoices();
            this.renderInvoices();
            this.updateBillingStats();
            this.generateNextInvoiceNumber();
            
            console.log(`✅ Loaded ${this.invoices.length} invoices`);
        } catch (error) {
            console.error('❌ Failed to load billing data:', error);
            throw error;
        }
    }
    
    updateUserRate() {
        const userLevelSelect = document.getElementById('userLevel');
        if (userLevelSelect) {
            const level = userLevelSelect.value;
            this.currentUserRate = USER_ROLES[level]?.rate || USER_ROLES.associate.rate;
            
            // Save user level
            localStorage.setItem('prometheus_user_level', level);
            
            // Update rate display
            const currentRateElement = document.getElementById('currentRate');
            if (currentRateElement) {
                currentRateElement.textContent = `Current rate: ${this.app.formatCurrency(this.currentUserRate)}/hour`;
            }
            
            // Update time tracker rate
            if (this.app.timeTracker) {
                this.app.timeTracker.updateCurrentUserRate();
            }
        }
    }
    
    generateInvoice() {
        try {
            // Update client dropdown and generate invoice number
            this.updateInvoiceClientSelect();
            this.generateNextInvoiceNumber();
            
            // Set default values
            const invoiceDate = document.getElementById('invoiceDate');
            const invoiceNumber = document.getElementById('invoiceNumber');
            const invoiceDueDate = document.getElementById('invoiceDueDate');
            
            if (invoiceDate) {
                invoiceDate.value = new Date().toISOString().split('T')[0];
            }
            
            if (invoiceNumber) {
                invoiceNumber.value = this.nextInvoiceNumber;
            }
            
            if (invoiceDueDate) {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 30); // 30 days from now
                invoiceDueDate.value = dueDate.toISOString().split('T')[0];
            }
            
            // Load billable entries
            this.loadBillableEntries();
            
            // Show form
            this.app.uiManager.showModal('invoiceForm');
            
            // Track form open
            this.trackBillingAction('invoice_form_opened');
            
        } catch (error) {
            console.error('❌ Failed to show invoice generation form:', error);
            this.app.handleError(error, 'BillingManager.generateInvoice');
        }
    }
    
    hideInvoiceForm() {
        this.app.uiManager.hideModal('invoiceForm');
    }
    
    updateInvoiceClientSelect() {
        const select = document.getElementById('invoiceClientSelect');
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select a client</option>';
        
        this.app.clientManager.getActiveClients().forEach(client => {
            select.innerHTML += `<option value="${client.id}">${this.app.escapeHtml(client.name)}</option>`;
        });
        
        select.value = currentValue;
    }
    
    loadClientDetails() {
        const clientSelect = document.getElementById('invoiceClientSelect');
        const clientDetails = document.getElementById('invoiceClientDetails');
        const clientName = document.getElementById('invoiceClientName');
        const clientAddress = document.getElementById('invoiceClientAddress');
        
        if (!clientSelect || !clientDetails) return;
        
        if (clientSelect.value) {
            const client = this.app.clientManager.getClientById(clientSelect.value);
            if (client) {
                clientName.value = client.name;
                clientAddress.value = client.address || '';
                clientDetails.style.display = 'block';
            }
        } else {
            clientDetails.style.display = 'none';
        }
    }
    
    loadBillableEntries() {
        const container = document.getElementById('billableTimeEntries');
        if (!container) return;
        
        let unbilledEntries = this.app.timeTracker.getUnbilledTimeEntries();
        
        // Apply filters
        const filter = document.getElementById('timeEntriesFilter')?.value;
        const selectedClient = document.getElementById('invoiceClientSelect')?.value;
        
        if (filter === 'client' && selectedClient) {
            const clientMatters = this.app.matterManager.getMattersByClient(selectedClient);
            const clientMatterIds = clientMatters.map(m => m.id);
            unbilledEntries = unbilledEntries.filter(entry => clientMatterIds.includes(entry.matterId));
        } else if (filter === 'date') {
            const fromDate = document.getElementById('billableFromDate')?.value;
            const toDate = document.getElementById('billableToDate')?.value;
            
            if (fromDate && toDate) {
                const from = new Date(fromDate);
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999); // End of day
                
                unbilledEntries = unbilledEntries.filter(entry => {
                    const entryDate = new Date(entry.date);
                    return entryDate >= from && entryDate <= to;
                });
            }
        }
        
        if (unbilledEntries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⏱️</div>
                    <p>No unbilled time entries found</p>
                    <small>Create some time entries first, then return to generate an invoice</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = unbilledEntries.map(entry => this.renderBillableEntry(entry)).join('');
        
        // Setup change listeners for checkboxes
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateInvoiceSummary());
        });
        
        // Auto-select all entries if client filter is applied
        if (filter === 'client' && selectedClient) {
            container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            this.updateInvoiceSummary();
        }
    }
    
    renderBillableEntry(entry) {
        const matter = this.app.matterManager.getMatterById(entry.matterId);
        const entryDate = new Date(entry.date);
        
        return `
            <div class="billable-entry">
                <div class="entry-selection">
                    <input type="checkbox" 
                           id="entry_${entry.id}" 
                           value="${entry.id}"
                           aria-label="Include time entry for ${this.app.escapeHtml(entry.matterCode)}">
                </div>
                
                <div class="billable-entry-info">
                    <div class="entry-primary">
                        <span class="entry-duration">${this.app.formatDuration(entry.duration)}</span>
                        <span class="entry-matter">${this.app.escapeHtml(entry.matterCode)}</span>
                        <span class="entry-value">${this.app.formatCurrency(entry.value)}</span>
                    </div>
                    
                    <div class="entry-secondary">
                        <span class="entry-description">${this.app.escapeHtml(entry.description)}</span>
                        <span class="entry-date">${entryDate.toLocaleDateString()}</span>
                        <span class="entry-rate">${this.app.formatCurrency(entry.rate)}/h</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    updateInvoiceSummary() {
        const checkboxes = document.querySelectorAll('#billableTimeEntries input[type="checkbox"]:checked');
        let totalHours = 0;
        let totalAmount = 0;
        
        checkboxes.forEach(checkbox => {
            const entryId = checkbox.value;
            const entry = this.app.timeTracker.timeEntries.find(e => e.id === entryId);
            if (entry) {
                totalHours += entry.hours;
                totalAmount += entry.value;
            }
        });
        
        const vat = Math.round(totalAmount * 0.2 * 100) / 100; // 20% VAT, rounded to cents
        const totalTTC = totalAmount + vat;
        
        // Update summary elements
        const summaryElements = {
            totalHoursBilling: `${totalHours.toFixed(1)}h`,
            totalAmountHT: this.app.formatCurrency(totalAmount),
            totalVAT: this.app.formatCurrency(vat),
            totalAmountTTC: this.app.formatCurrency(totalTTC)
        };
        
        Object.entries(summaryElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.setAttribute('aria-live', 'polite');
            }
        });
    }
    
    createInvoice(event) {
        event.preventDefault();
        
        try {
            // Validate form
            if (!this.validateInvoiceForm()) {
                return;
            }
            
            // Get selected time entries
            const selectedEntryIds = Array.from(
                document.querySelectorAll('#billableTimeEntries input[type="checkbox"]:checked')
            ).map(checkbox => checkbox.value);
            
            if (selectedEntryIds.length === 0) {
                notificationManager.showError('Please select at least one time entry');
                return;
            }
            
            // Get form data
            const invoiceData = this.getInvoiceFormData();
            
            // Get selected time entries
            const selectedEntries = selectedEntryIds.map(id => 
                this.app.timeTracker.timeEntries.find(e => e.id === id)
            ).filter(entry => entry !== undefined);
            
            // Calculate totals
            const totalHours = selectedEntries.reduce((sum, entry) => sum + entry.hours, 0);
            const totalHT = selectedEntries.reduce((sum, entry) => sum + entry.value, 0);
            const vat = Math.round(totalHT * 0.2 * 100) / 100;
            const totalTTC = totalHT + vat;
            
            // Create invoice
            const invoice = this.app.dataManager.create('invoices', {
                ...invoiceData,
                entries: selectedEntries.map(entry => entry.id),
                totalHours: totalHours,
                totalHT: totalHT,
                vat: vat,
                totalTTC: totalTTC,
                status: 'draft'
            });
            
            // Mark time entries as billed
            selectedEntries.forEach(entry => {
                this.app.dataManager.update('timeEntries', entry.id, {
                    billed: true,
                    invoiceId: invoice.id
                });
                
                // Update local array
                const index = this.app.timeTracker.timeEntries.findIndex(e => e.id === entry.id);
                if (index !== -1) {
                    this.app.timeTracker.timeEntries[index].billed = true;
                    this.app.timeTracker.timeEntries[index].invoiceId = invoice.id;
                }
            });
            
            // Update local array
            this.invoices.push(invoice);
            
            // Generate and download invoice
            this.generateInvoicePDF(invoice);
            
            // Refresh displays
            this.filterInvoices();
            this.renderInvoices();
            this.updateBillingStats();
            
            // Hide form
            this.hideInvoiceForm();
            
            // Show success message
            notificationManager.showSuccess(`Invoice ${invoice.number} generated successfully`);
            
            // Track action
            this.trackBillingAction('invoice_created', { invoiceId: invoice.id, amount: totalTTC });
            
            // Update dashboard
            this.app.updateDashboard();
            
            return invoice;
            
        } catch (error) {
            console.error('❌ Failed to create invoice:', error);
            notificationManager.showError('Failed to create invoice');
            throw error;
        }
    }
    
    validateInvoiceForm() {
        const requiredFields = [
            'invoiceNumber',
            'invoiceDate',
            'invoiceClientSelect'
        ];
        
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !field.value.trim()) {
                this.app.uiManager.showFieldErrors(field, ['This field is required']);
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    getInvoiceFormData() {
        const client = this.app.clientManager.getClientById(
            document.getElementById('invoiceClientSelect').value
        );
        
        return {
            number: document.getElementById('invoiceNumber').value.trim(),
            date: document.getElementById('invoiceDate').value,
            dueDate: document.getElementById('invoiceDueDate').value || null,
            currency: document.getElementById('invoiceCurrency').value,
            clientId: client?.id,
            clientName: client?.name,
            clientAddress: document.getElementById('invoiceClientAddress').value.trim()
        };
    }
    
    generateNextInvoiceNumber() {
        const year = new Date().getFullYear();
        const yearInvoices = this.invoices.filter(inv => 
            inv.number.startsWith(`BOURDON-${year}`)
        );
        const nextNumber = yearInvoices.length + 1;
        this.nextInvoiceNumber = `BOURDON-${year}-${String(nextNumber).padStart(3, '0')}`;
    }
    
    generateInvoicePDF(invoice) {
        try {
            const htmlContent = this.createInvoiceHTML(invoice);
            
            // Create and download HTML file
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${invoice.number}.html`;
            a.click();
            URL.revokeObjectURL(url);
            
            notificationManager.showSuccess(`Invoice ${invoice.number} PDF generated`);
            
        } catch (error) {
            console.error('❌ Failed to generate invoice PDF:', error);
            notificationManager.showError('Failed to generate invoice PDF');
        }
    }
    
    createInvoiceHTML(invoice) {
        const client = this.app.clientManager.getClientById(invoice.clientId);
        const entries = invoice.entries.map(entryId => 
            this.app.timeTracker.timeEntries.find(e => e.id === entryId)
        ).filter(entry => entry !== undefined);
        
        const currencySymbol = APP_CONFIG.currencySymbols[invoice.currency] || '$';
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #4a9eff; padding-bottom: 20px; }
        .logo { font-size: 28px; font-weight: bold; color: #4a9eff; }
        .company-info { text-align: left; }
        .invoice-info { text-align: right; }
        .invoice-info h1 { color: #4a9eff; font-size: 36px; margin-bottom: 10px; }
        .client-section { margin: 30px 0; }
        .client-section h3 { color: #4a9eff; margin-bottom: 15px; }
        .invoice-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .detail-item { display: flex; justify-content: space-between; padding: 5px 0; }
        .detail-label { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        th, td { text-align: left; padding: 15px 10px; border-bottom: 1px solid #e0e0e0; }
        th { background: #4a9eff; color: white; font-weight: 600; }
        tr:nth-child(even) { background: #f8f9fa; }
        .totals { margin-top: 30px; }
        .totals table { width: 400px; margin-left: auto; }
        .totals th, .totals td { border: none; padding: 10px; }
        .total-row { font-size: 18px; font-weight: bold; color: #4a9eff; border-top: 2px solid #4a9eff; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 14px; }
        .payment-terms { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 30px 0; }
        .payment-terms h4 { color: #1976d2; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-info">
                <div class="logo">⚖️ BOURDON & Associates</div>
                <p><strong>Legal Counsel & Advisory Services</strong></p>
                <p>123 Legal District, Suite 500</p>
                <p>New York, NY 10001</p>
                <p>Phone: +1 (555) 123-4567</p>
                <p>Email: billing@bourdon-associates.com</p>
            </div>
            <div class="invoice-info">
                <h1>INVOICE</h1>
                <p><strong>Invoice #:</strong> ${invoice.number}</p>
                <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</p>
                ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ''}
            </div>
        </div>
        
        <div class="client-section">
            <h3>Bill To:</h3>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <p><strong>${this.app.escapeHtml(invoice.clientName)}</strong></p>
                ${invoice.clientAddress ? `<p>${this.app.escapeHtml(invoice.clientAddress)}</p>` : ''}
            </div>
        </div>
        
        <div class="invoice-details">
            <h3 style="color: #4a9eff; margin-bottom: 15px;">Invoice Summary</h3>
            <div class="details-grid">
                <div class="detail-item">
                    <span class="detail-label">Total Hours:</span>
                    <span>${invoice.totalHours.toFixed(2)}h</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Currency:</span>
                    <span>${invoice.currency}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Number of Entries:</span>
                    <span>${entries.length}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span style="color: #28a745; font-weight: bold;">${invoice.status.toUpperCase()}</span>
                </div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Matter</th>
                    <th>Description</th>
                    <th>Hours</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${entries.map(entry => `
                    <tr>
                        <td>${new Date(entry.date).toLocaleDateString()}</td>
                        <td>${this.app.escapeHtml(entry.matterCode)}</td>
                        <td>${this.app.escapeHtml(entry.description)}</td>
                        <td>${entry.hours.toFixed(2)}</td>
                        <td>${currencySymbol}${entry.rate.toFixed(2)}</td>
                        <td>${currencySymbol}${entry.value.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="totals">
            <table>
                <tr>
                    <th>Subtotal:</th>
                    <td>${currencySymbol}${invoice.totalHT.toFixed(2)}</td>
                </tr>
                <tr>
                    <th>VAT (20%):</th>
                    <td>${currencySymbol}${invoice.vat.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <th>TOTAL:</th>
                    <td>${currencySymbol}${invoice.totalTTC.toFixed(2)}</td>
                </tr>
            </table>
        </div>
        
        <div class="payment-terms">
            <h4>Payment Terms & Instructions</h4>
            <p><strong>Payment Due:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '30 days from invoice date'}</p>
            <p><strong>Payment Methods:</strong> Wire transfer, ACH, or certified check</p>
            <p><strong>Late Fees:</strong> 1.5% per month on overdue amounts</p>
            <p><strong>Questions:</strong> Contact billing@bourdon-associates.com</p>
        </div>
        
        <div class="footer">
            <p><strong>BOURDON & Associates</strong> | Professional Legal Services</p>
            <p>Thank you for your business. We appreciate the opportunity to serve you.</p>
            <p style="margin-top: 10px; font-size: 12px;">
                This invoice was generated electronically by Prometheus Legal Management System on ${new Date().toLocaleDateString()}
            </p>
        </div>
    </div>
</body>
</html>`;
    }
    
    filterInvoices() {
        try {
            this.filteredInvoices = this.invoices.filter(invoice => {
                // Status filter
                if (this.activeFilters.status && invoice.status !== this.activeFilters.status) {
                    return false;
                }
                
                // Client filter
                if (this.activeFilters.client && invoice.clientId !== this.activeFilters.client) {
                    return false;
                }
                
                return true;
            });
            
            // Sort by date (newest first)
            this.filteredInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            this.renderInvoices();
            
        } catch (error) {
            console.error('❌ Failed to filter invoices:', error);
        }
    }
    
    renderInvoices() {
        const container = document.getElementById('invoicesList');
        if (!container) return;
        
        if (this.filteredInvoices.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }
        
        container.innerHTML = this.filteredInvoices.map(invoice => this.renderInvoiceCard(invoice)).join('');
    }
    
    renderInvoiceCard(invoice) {
        const invoiceDate = new Date(invoice.date);
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && invoice.status !== 'paid';
        
        return `
            <div class="invoice-card ${isOverdue ? 'overdue' : ''}" data-invoice-id="${invoice.id}">
                <div class="invoice-header">
                    <div class="invoice-number">
                        <h4>${invoice.number}</h4>
                        <span class="invoice-status status-${invoice.status}">${invoice.status.toUpperCase()}</span>
                    </div>
                    <div class="invoice-amount">
                        <span class="amount-label">Total</span>
                        <span class="amount-value">${this.app.formatCurrency(invoice.totalTTC, invoice.currency)}</span>
                    </div>
                </div>
                
                <div class="invoice-content">
                    <div class="invoice-details">
                        <div class="detail-row">
                            <span class="detail-label">Client:</span>
                            <span class="detail-value">${this.app.escapeHtml(invoice.clientName)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date:</span>
                            <span class="detail-value">${invoiceDate.toLocaleDateString()}</span>
                        </div>
                        ${dueDate ? `
                            <div class="detail-row">
                                <span class="detail-label">Due Date:</span>
                                <span class="detail-value ${isOverdue ? 'overdue-text' : ''}">${dueDate.toLocaleDateString()}</span>
                            </div>
                        ` : ''}
                        <div class="detail-row">
                            <span class="detail-label">Hours:</span>
                            <span class="detail-value">${invoice.totalHours.toFixed(1)}h</span>
                        </div>
                        <div class="detail-row">
                            <span class="