// Popup functionality for Resume Autofiller extension

class ResumeAutofiller {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadSavedData();
        this.loadSettings();
    }

    initializeElements() {
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        this.resumeForm = document.getElementById('resume-form');
        this.saveTemplatesBtn = document.getElementById('save-templates');
        
        this.resumeFields = {
            fullName: document.getElementById('full-name'),
            email: document.getElementById('email'),
            phone: document.getElementById('phone'),
            location: document.getElementById('location'),
            linkedin: document.getElementById('linkedin'),
            github: document.getElementById('github'),
            experience: document.getElementById('experience'),
            education: document.getElementById('education'),
            skills: document.getElementById('skills')
        };
        
        this.templateFields = {
            whyJob: document.getElementById('why-job'),
            salary: document.getElementById('salary'),
            visa: document.getElementById('visa'),
            startDate: document.getElementById('start-date'),
            relocation: document.getElementById('relocation')
        };
        
        this.settings = {
            autoDetect: document.getElementById('auto-detect'),
            showButton: document.getElementById('show-button'),
            confirmBeforeFill: document.getElementById('confirm-before-fill')
        };
        
        this.exportBtn = document.getElementById('export-data');
        this.importBtn = document.getElementById('import-data');
        this.clearBtn = document.getElementById('clear-data');
        
        this.statusMessage = document.getElementById('status-message');
    }

    bindEvents() {
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        this.resumeForm.addEventListener('submit', (e) => this.saveResumeData(e));
        
        this.saveTemplatesBtn.addEventListener('click', () => this.saveTemplates());
        
        Object.values(this.settings).forEach(setting => {
            setting.addEventListener('change', () => this.saveSettings());
        });
        
        this.exportBtn.addEventListener('click', () => this.exportData());
        this.importBtn.addEventListener('click', () => this.importData());
        this.clearBtn.addEventListener('click', () => this.clearData());
    }

    switchTab(tabName) {
        this.tabBtns.forEach(btn => btn.classList.remove('active'));
        this.tabContents.forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    populateFormFields(data) {
        Object.keys(this.resumeFields).forEach(key => {
            const field = this.resumeFields[key];
            const value = data[key] || data[key.charAt(0).toUpperCase() + key.slice(1)] || '';
            if (field && value) {
                field.value = value;
            }
        });
    }

    async saveResumeData(event) {
        event.preventDefault();
        
        const resumeData = {};
        Object.keys(this.resumeFields).forEach(key => {
            resumeData[key] = this.resumeFields[key].value.trim();
        });
        
        try {
            await chrome.storage.local.set({ resumeData });
            this.showStatus('Resume data saved successfully!', 'success');
            this.notifyContentScripts();
        } catch (error) {
            console.error('Error saving resume data:', error);
            this.showStatus('Error saving data. Please try again.', 'error');
        }
    }

    async saveTemplates() {
        const templateData = {};
        Object.keys(this.templateFields).forEach(key => {
            templateData[key] = this.templateFields[key].value.trim();
        });
        
        try {
            await chrome.storage.local.set({ templateData });
            this.showStatus('Templates saved successfully!', 'success');
            this.notifyContentScripts();
        } catch (error) {
            console.error('Error saving templates:', error);
            this.showStatus('Error saving templates. Please try again.', 'error');
        }
    }

    async saveSettings() {
        const settingsData = {};
        Object.keys(this.settings).forEach(key => {
            settingsData[key] = this.settings[key].checked;
        });
        
        try {
            await chrome.storage.local.set({ settingsData });
            this.notifyContentScripts();
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    async loadSavedData() {
        try {
            const result = await chrome.storage.local.get(['resumeData', 'templateData']);
            
            if (result.resumeData) {
                Object.keys(this.resumeFields).forEach(key => {
                    if (this.resumeFields[key] && result.resumeData[key]) {
                        this.resumeFields[key].value = result.resumeData[key];
                    }
                });
            }
            
            if (result.templateData) {
                Object.keys(this.templateFields).forEach(key => {
                    if (this.templateFields[key] && result.templateData[key]) {
                        this.templateFields[key].value = result.templateData[key];
                    }
                });
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['settingsData']);
            if (result.settingsData) {
                Object.keys(this.settings).forEach(key => {
                    if (this.settings[key] && result.settingsData.hasOwnProperty(key)) {
                        this.settings[key].checked = result.settingsData[key];
                    }
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async exportData() {
        try {
            const result = await chrome.storage.local.get(['resumeData', 'templateData', 'settingsData']);
            const dataStr = JSON.stringify(result, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'resume-autofiller-data.json';
            a.click();
            
            URL.revokeObjectURL(url);
            this.showStatus('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showStatus('Error exporting data. Please try again.', 'error');
        }
    }

    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                await chrome.storage.local.set(data);
                
                await this.loadSavedData();
                await this.loadSettings();
                
                this.showStatus('Data imported successfully!', 'success');
                this.notifyContentScripts();
            } catch (error) {
                console.error('Error importing data:', error);
                this.showStatus('Error importing data. Please check the file format.', 'error');
            }
        };
        
        input.click();
    }

    async clearData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            try {
                await chrome.storage.local.clear();
                
                Object.values(this.resumeFields).forEach(field => {
                    if (field) field.value = '';
                });
                
                Object.values(this.templateFields).forEach(field => {
                    if (field) field.value = '';
                });
                
                Object.values(this.settings).forEach(setting => {
                    if (setting) setting.checked = false;
                });
                
                this.showStatus('All data cleared successfully!', 'success');
                this.notifyContentScripts();
            } catch (error) {
                console.error('Error clearing data:', error);
                this.showStatus('Error clearing data. Please try again.', 'error');
            }
        }
    }

    async notifyContentScripts() {
        try {
            await chrome.runtime.sendMessage({ type: 'NOTIFY_CONTENT_SCRIPTS' });
        } catch (error) {
            console.error('Error notifying content scripts:', error);
        }
    }

    showStatus(message, type = 'info') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        
        setTimeout(() => {
            this.statusMessage.style.display = 'none';
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ResumeAutofiller();
});
