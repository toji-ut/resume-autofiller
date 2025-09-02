// Content script for Resume Autofiller extension

class FormAutofiller {
    constructor() {
        this.resumeData = null;
        this.templateData = null;
        this.settings = null;
        this.floatingButton = null;
        
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupFormDetection();
            this.createFloatingButton();
            this.setupMutationObserver();
        } catch (error) {
            console.error('FormAutofiller initialization error:', error);
        }
    }

    async loadData() {
        try {
            const result = await chrome.storage.local.get([
                'resumeData',
                'templateData',
                'settingsData'
            ]);
    
            this.resumeData = (result && result.resumeData) ? result.resumeData : {};
            this.templateData = (result && result.templateData) ? result.templateData : {};
            this.settings = (result && result.settingsData) ? result.settingsData : {
                autoDetect: true,
                showButton: true,
                confirmBeforeFill: false
            };
    
        } catch (error) {
            console.error('Error loading data:', error);
            // fallback defaults if storage completely fails
            this.resumeData = {};
            this.templateData = {};
            this.settings = {
                autoDetect: true,
                showButton: true,
                confirmBeforeFill: false
            };
        }
    }    

    setupFormDetection() {
        if (this.settings.autoDetect) {
            this.detectForms();
        }
    }

    detectForms() {
        const forms = document.querySelectorAll('form');
        const jobForms = Array.from(forms).filter(form => this.isJobApplicationForm(form));

        if (jobForms.length > 0 && this.settings.showButton) {
            this.showAutofillButton(jobForms);
        }
    }

    isJobApplicationForm(form) {
        const jobFieldKeywords = [
            'name', 'email', 'phone', 'address', 'city', 'state', 'zip',
            'experience', 'education', 'skills', 'resume', 'cv',
            'company', 'position', 'title', 'salary', 'start', 'availability'
        ];

        const formText = form.textContent.toLowerCase();
        const hasJobFields = jobFieldKeywords.some(keyword => formText.includes(keyword));

        const inputs = form.querySelectorAll('input, textarea, select');
        const hasJobInputs = Array.from(inputs).some(input => {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const placeholder = (input.placeholder || '').toLowerCase();
            
            return jobFieldKeywords.some(keyword => 
                name.includes(keyword) || id.includes(keyword) || placeholder.includes(keyword)
            );
        });

        return hasJobFields || hasJobInputs;
    }

    createFloatingButton() {
        if (this.floatingButton) return;

        this.floatingButton = document.createElement('div');
        this.floatingButton.id = 'resume-autofiller-btn';
        this.floatingButton.innerHTML = '⚡ Autofill';
        this.floatingButton.title = 'Click to autofill this form with your resume data';
        
        Object.assign(this.floatingButton.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '10000',
            backgroundColor: '#667eea',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s ease',
            display: 'none'
        });

        this.floatingButton.addEventListener('mouseenter', () => {
            this.floatingButton.style.backgroundColor = '#5a6fd8';
            this.floatingButton.style.transform = 'translateY(-2px)';
        });

        this.floatingButton.addEventListener('mouseleave', () => {
            this.floatingButton.style.backgroundColor = '#667eea';
            this.floatingButton.style.transform = 'translateY(0)';
        });

        this.floatingButton.addEventListener('click', () => this.handleAutofill());
        document.body.appendChild(this.floatingButton);
    }

    showAutofillButton(forms) {
        if (this.floatingButton && forms.length > 0) {
            this.floatingButton.style.display = 'block';
        }
    }

    async handleAutofill() {
        if (!this.resumeData || Object.keys(this.resumeData).length === 0) {
            this.showNotification('No resume data found. Please set up your resume in the extension popup.', 'error');
            return;
        }

        if (this.settings.confirmBeforeFill) {
            if (!confirm('Do you want to autofill this form with your resume data?')) {
                return;
            }
        }

        try {
            const forms = this.getFormsOnPage();
            let filledCount = 0;

            forms.forEach(form => {
                const filled = this.fillForm(form);
                if (filled) filledCount++;
            });

            if (filledCount > 0) {
                this.showNotification(`Successfully filled ${filledCount} form(s)!`, 'success');
            } else {
                this.showNotification('No matching fields found to fill.', 'info');
            }
        } catch (error) {
            console.error('Autofill error:', error);
            this.showNotification('Error during autofill. Please try again.', 'error');
        }
    }

    getFormsOnPage() {
        const forms = document.querySelectorAll('form');
        return Array.from(forms).filter(form => this.isJobApplicationForm(form));
    }

    fillForm(form) {
        let filledCount = 0;
        const inputs = form.querySelectorAll('input, textarea, select');

        inputs.forEach(input => {
            const value = this.getFieldValue(input);
            if (value) {
                this.fillField(input, value);
                filledCount++;
            }
        });

        return filledCount > 0;
    }

    getFieldValue(input) {
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const type = input.type.toLowerCase();

        if (['submit', 'button', 'file', 'image', 'reset'].includes(type)) {
            return null;
        }

        const fieldMappings = {
            'name': 'fullName',
            'fullname': 'fullName',
            'firstname': 'fullName',
            'lastname': 'fullName',
            'email': 'email',
            'e-mail': 'email',
            'phone': 'phone',
            'telephone': 'phone',
            'mobile': 'phone',
            'cell': 'phone',
            'address': 'location',
            'city': 'location',
            'state': 'location',
            'zip': 'location',
            'postal': 'location',
            'country': 'location',
            'linkedin': 'linkedin',
            'github': 'github',
            'portfolio': 'github',
            'experience': 'experience',
            'work': 'experience',
            'employment': 'experience',
            'job': 'experience',
            'education': 'education',
            'degree': 'education',
            'university': 'education',
            'college': 'education',
            'school': 'education',
            'skills': 'skills',
            'technologies': 'skills',
            'languages': 'skills',
            'tools': 'skills'
        };

        for (const [fieldKey, resumeKey] of Object.entries(fieldMappings)) {
            if (name.includes(fieldKey) || id.includes(fieldKey) || placeholder.includes(fieldKey)) {
                return this.resumeData[resumeKey];
            }
        }

        const templateMappings = {
            'why': 'whyJob',
            'salary': 'salary',
            'visa': 'visa',
            'start': 'startDate',
            'relocate': 'relocation',
            'availability': 'startDate'
        };

        for (const [fieldKey, templateKey] of Object.entries(templateMappings)) {
            if (name.includes(fieldKey) || id.includes(fieldKey) || placeholder.includes(fieldKey)) {
                return this.templateData[templateKey];
            }
        }

        return null;
    }

    fillField(input, value) {
        const type = input.type.toLowerCase();
        
        if (type === 'checkbox') {
            input.checked = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
        } else if (type === 'radio') {
            if (input.value.toLowerCase() === value.toLowerCase()) {
                input.checked = true;
            }
        } else if (type === 'select-one') {
            const options = Array.from(input.options);
            const matchingOption = options.find(option => 
                option.text.toLowerCase().includes(value.toLowerCase()) ||
                option.value.toLowerCase().includes(value.toLowerCase())
            );
            if (matchingOption) {
                input.value = matchingOption.value;
            }
        } else {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            if (this.settings.autoDetect) {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const forms = node.querySelectorAll && node.querySelectorAll('form');
                                if (forms && forms.length > 0) {
                                    this.detectForms();
                                }
                            }
                        });
                    }
                });
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    showNotification(message, type = 'info') {
        const existing = document.getElementById('resume-autofiller-notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'resume-autofiller-notification';
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: '10001',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '300px',
            wordWrap: 'break-word',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        });

        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#28a745';
                break;
            case 'error':
                notification.style.backgroundColor = '#dc3545';
                break;
            default:
                notification.style.backgroundColor = '#17a2b8';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }
}

let formAutofiller = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        formAutofiller = new FormAutofiller();
    });
} else {
    formAutofiller = new FormAutofiller();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DATA_UPDATED' && formAutofiller) {
        formAutofiller.loadData();
    }
    sendResponse({ received: true });
});
