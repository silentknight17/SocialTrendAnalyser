class SocialTrendAI {
    constructor() {
        this.currentTrends = {};
        this.selectedHashtags = [];
        this.selectedThemes = [];
        this.generatedMessages = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.showWelcomeAnimation();
    }

    bindEvents() {
        // Analyze trends button
        document.getElementById('analyze-trends').addEventListener('click', () => {
            this.analyzeTrends();
        });

        // Generate message button
        document.getElementById('generate-message').addEventListener('click', () => {
            this.generateAIMessage();
        });

        // Copy all messages button
        document.getElementById('copy-all').addEventListener('click', () => {
            this.copyAllMessages();
        });

        // Regenerate button
        document.getElementById('regenerate').addEventListener('click', () => {
            this.generateAIMessage();
        });

        // Business input validation
        document.getElementById('business-input').addEventListener('input', (e) => {
            this.validateBusinessInput(e.target.value);
        });

        // Selection controls
        document.getElementById('select-all-hashtags').addEventListener('click', () => {
            this.selectAllHashtags();
        });

        document.getElementById('clear-hashtags').addEventListener('click', () => {
            this.clearHashtagSelection();
        });

        document.getElementById('select-all-themes').addEventListener('click', () => {
            this.selectAllThemes();
        });

        document.getElementById('clear-themes').addEventListener('click', () => {
            this.clearThemeSelection();
        });
    }

    showWelcomeAnimation() {
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            setTimeout(() => {
                card.style.transition = 'all 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }

    async analyzeTrends() {
        const selectedPlatforms = this.getSelectedPlatforms();
        
        if (selectedPlatforms.length === 0) {
            this.showError('Please select at least one social media platform!');
            return;
        }

        this.showLoading('loading-trends', true);
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('message-section').style.display = 'none';

        try {
            const response = await fetch('/api/analyze-trends', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ platforms: selectedPlatforms }),
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentTrends = data.trends;
                this.displayTrendResults(data.trends);
                this.showSection('results-section');
                this.showSection('message-section');
            } else {
                this.showError('Failed to analyze trends. Please try again.');
            }
        } catch (error) {
            console.error('Error analyzing trends:', error);
            this.showError('Network error. Please check your connection.');
        } finally {
            this.showLoading('loading-trends', false);
        }
    }

    async generateAIMessage() {
        const businessName = document.getElementById('business-input').value.trim();
        const businessType = document.getElementById('business-type').value;
        const tone = document.getElementById('tone-select').value;

        if (!businessName) {
            this.showError('Please enter your business name!');
            return;
        }

        if (!this.currentTrends.hashtags || this.currentTrends.hashtags.length === 0) {
            this.showError('Please analyze trends first!');
            return;
        }

        if (this.selectedHashtags.length === 0 && this.selectedThemes.length === 0) {
            this.showError('Please select at least one hashtag or theme to generate AI content!');
            return;
        }

        this.showLoading('loading-message', true);

        try {
            // Create trends object with only selected items
            const selectedTrends = {
                hashtags: this.selectedHashtags,
                themes: this.selectedThemes,
                totalEngagement: this.selectedHashtags.reduce((sum, h) => sum + h.engagement, 0),
                platformCount: this.currentTrends.platformCount || 1
            };

            const response = await fetch('/api/generate-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessName,
                    businessType,
                    tone,
                    selectedTrends: selectedTrends,
                }),
            });

            const data = await response.json();
            
            // Check if response status indicates an error (even if JSON was returned)
            if (!response.ok && !data.success) {
                console.log(`API returned status ${response.status}:`, data);
            }
            
            if (data.success) {
                this.generatedMessages = data.messages;
                this.displayGeneratedMessages(data.messages);
                this.showSection('generated-section');
            } else {
                // Handle specific error types with detailed messages
                if (data.cursor_ai_error) {
                    this.showError(`
                        <strong>🤖 AI Generation Error</strong><br>
                        ${data.message}<br><br>
                        <em>The system uses Cursor's built-in AI for text generation.</em>
                    `);
                } else if (data.real_data_only) {
                    this.showError(`
                        <strong>🚫 Real API Data Required!</strong><br>
                        ${data.message}<br><br>
                        <em>This system only uses live data from real APIs - no fallback data.</em>
                    `);
                } else {
                    this.showError(`Failed to generate messages: ${data.error || 'Unknown error'}`);
                }
            }
        } catch (error) {
            console.error('Error generating messages:', error);
            this.showError('Network error. Please check your connection.');
        } finally {
            this.showLoading('loading-message', false);
        }
    }

    getSelectedPlatforms() {
        const checkboxes = document.querySelectorAll('input[name="platform"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    displayTrendResults(trends) {
        // Clear previous selections
        this.selectedHashtags = [];
        this.selectedThemes = [];
        
        // Display hashtags
        const hashtagsList = document.getElementById('hashtags-list');
        hashtagsList.innerHTML = '';
        
        trends.hashtags.forEach((hashtag, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="hashtag-tag">#${hashtag.tag}</span>
                <span class="engagement-count">${(hashtag.engagement || 0).toLocaleString()}</span>
                <button class="hashtag-info-btn" title="Learn about this trend">
                    <i class="fas fa-info"></i>
                </button>
            `;
            li.style.animationDelay = `${index * 0.1}s`;
            li.classList.add('slide-in');
            li.dataset.hashtag = JSON.stringify(hashtag);
            
            // Add click handler for selection (excluding info button)
            li.addEventListener('click', (e) => {
                if (!e.target.closest('.hashtag-info-btn')) {
                    this.toggleHashtagSelection(hashtag, li);
                }
            });
            
            // Add click handler for info button
            const infoBtn = li.querySelector('.hashtag-info-btn');
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showHashtagContext(hashtag, infoBtn);
            });
            
            hashtagsList.appendChild(li);
        });

        // Display themes
        const themesList = document.getElementById('themes-list');
        themesList.innerHTML = '';
        
        trends.themes.forEach((theme, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${theme.name}</span>
                <span class="engagement-count">${theme.popularity}%</span>
            `;
            li.style.animationDelay = `${index * 0.1}s`;
            li.classList.add('slide-in');
            li.dataset.theme = JSON.stringify(theme);
            li.addEventListener('click', () => this.toggleThemeSelection(theme, li));
            themesList.appendChild(li);
        });

        // Update selection display
        this.updateSelectionDisplay();

        // Display engagement metrics (only real metrics)
        const metricsDisplay = document.getElementById('metrics-display');
        metricsDisplay.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-item">
                    <span class="metric-value">${trends.totalEngagement.toLocaleString()}</span>
                    <span class="metric-label">Total Engagement</span>
                </div>
                <div class="metric-item">
                    <span class="metric-value">${trends.platformCount}</span>
                    <span class="metric-label">Platforms</span>
                </div>
                <div class="metric-item">
                    <span class="metric-value">${trends.hashtags.length}</span>
                    <span class="metric-label">Trending Topics</span>
                </div>
                <div class="metric-item">
                    <span class="metric-value">${trends.themes.length}</span>
                    <span class="metric-label">Themes</span>
                </div>
            </div>
        `;
    }

    // Selection Methods
    toggleHashtagSelection(hashtag, element) {
        const index = this.selectedHashtags.findIndex(h => h.tag === hashtag.tag);
        
        if (index > -1) {
            // Remove selection
            this.selectedHashtags.splice(index, 1);
            element.classList.remove('selected');
        } else {
            // Add selection
            this.selectedHashtags.push(hashtag);
            element.classList.add('selected');
        }
        
        this.updateSelectionDisplay();
    }

    toggleThemeSelection(theme, element) {
        const index = this.selectedThemes.findIndex(t => t.name === theme.name);
        
        if (index > -1) {
            // Remove selection
            this.selectedThemes.splice(index, 1);
            element.classList.remove('selected');
        } else {
            // Add selection
            this.selectedThemes.push(theme);
            element.classList.add('selected');
        }
        
        this.updateSelectionDisplay();
    }

    selectAllHashtags() {
        const hashtagItems = document.querySelectorAll('#hashtags-list li');
        this.selectedHashtags = [];
        
        hashtagItems.forEach(item => {
            const hashtag = JSON.parse(item.dataset.hashtag);
            this.selectedHashtags.push(hashtag);
            item.classList.add('selected');
        });
        
        this.updateSelectionDisplay();
    }

    clearHashtagSelection() {
        const hashtagItems = document.querySelectorAll('#hashtags-list li');
        this.selectedHashtags = [];
        
        hashtagItems.forEach(item => {
            item.classList.remove('selected');
        });
        
        this.updateSelectionDisplay();
    }

    selectAllThemes() {
        const themeItems = document.querySelectorAll('#themes-list li');
        this.selectedThemes = [];
        
        themeItems.forEach(item => {
            const theme = JSON.parse(item.dataset.theme);
            this.selectedThemes.push(theme);
            item.classList.add('selected');
        });
        
        this.updateSelectionDisplay();
    }

    clearThemeSelection() {
        const themeItems = document.querySelectorAll('#themes-list li');
        this.selectedThemes = [];
        
        themeItems.forEach(item => {
            item.classList.remove('selected');
        });
        
        this.updateSelectionDisplay();
    }

    updateSelectionDisplay() {
        const hashtagsDisplay = document.getElementById('selected-hashtags-display');
        const themesDisplay = document.getElementById('selected-themes-display');
        
        if (this.selectedHashtags.length === 0) {
            hashtagsDisplay.textContent = 'None selected';
        } else {
            const hashtagNames = this.selectedHashtags.map(h => `#${h.tag}`).join(', ');
            hashtagsDisplay.textContent = hashtagNames;
        }
        
        if (this.selectedThemes.length === 0) {
            themesDisplay.textContent = 'None selected';
        } else {
            const themeNames = this.selectedThemes.map(t => t.name).join(', ');
            themesDisplay.textContent = themeNames;
        }
    }

    displayGeneratedMessages(messages) {
        const container = document.getElementById('generated-messages');
        container.innerHTML = '';

        messages.forEach((message, index) => {
            const messageCard = document.createElement('div');
            messageCard.className = 'message-card fade-in';
            messageCard.style.animationDelay = `${index * 0.2}s`;
            
            messageCard.innerHTML = `
                <div class="message-header">
                    <span class="platform-tag">${message.platform}</span>
                    <div class="message-actions">
                        <button class="btn-small" onclick="app.copyMessage(${index})">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
                <div class="message-content">${message.content}</div>
                <div class="hashtags-used">
                    ${message.hashtags.map(tag => `<span class="hashtag-tag">#${tag}</span>`).join(' ')}
                </div>
            `;
            
            container.appendChild(messageCard);
        });
    }

    copyMessage(index) {
        const message = this.generatedMessages[index];
        const textToCopy = `${message.content}\n\n${message.hashtags.map(tag => `#${tag}`).join(' ')}`;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            this.showSuccess('Message copied to clipboard!');
        });
    }

    copyAllMessages() {
        const allMessages = this.generatedMessages.map(msg => 
            `${msg.content}\n${msg.hashtags.map(tag => `#${tag}`).join(' ')}`
        ).join('\n\n---\n\n');

        navigator.clipboard.writeText(allMessages).then(() => {
            this.showSuccess('All messages copied to clipboard!');
        });
    }

    validateBusinessInput(value) {
        const generateBtn = document.getElementById('generate-message');
        if (value.trim().length < 2) {
            generateBtn.disabled = true;
            generateBtn.style.opacity = '0.5';
        } else {
            generateBtn.disabled = false;
            generateBtn.style.opacity = '1';
        }
    }

    showSection(sectionId) {
        const section = document.getElementById(sectionId);
        section.style.display = 'block';
        section.classList.add('fade-in');
        
        // Smooth scroll to the section
        setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    showLoading(loadingId, show) {
        const loading = document.getElementById(loadingId);
        loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        this.removeExistingMessages();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message fade-in';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        
        document.querySelector('.main-content').insertBefore(
            errorDiv, 
            document.querySelector('.main-content').firstChild
        );
        
        setTimeout(() => errorDiv.remove(), 5000);
    }

    showSuccess(message) {
        this.removeExistingMessages();
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message fade-in';
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        
        document.querySelector('.main-content').insertBefore(
            successDiv, 
            document.querySelector('.main-content').firstChild
        );
        
        setTimeout(() => successDiv.remove(), 3000);
    }

    removeExistingMessages() {
        const existingMessages = document.querySelectorAll('.error-message, .success-message');
        existingMessages.forEach(msg => msg.remove());
    }

    showHashtagContext(hashtag, clickedButton) {
        // Populate context panel with hashtag information
        document.getElementById('context-hashtag').textContent = `#${hashtag.tag}`;
        document.getElementById('context-description').textContent = hashtag.description || `📊 ${hashtag.tag} Trending`;
        document.getElementById('context-explanation').textContent = hashtag.context || 'Currently trending topic being discussed across social media platforms.';
        document.getElementById('context-usage').textContent = hashtag.usage || `Use when your content relates to ${hashtag.tag} or when targeting audiences interested in this topic.`;
        document.getElementById('context-engagement').textContent = `${(hashtag.engagement || 0).toLocaleString()} engagements`;
        document.getElementById('context-platform').textContent = hashtag.platform;

        // Show the context panel
        const contextPanel = document.getElementById('hashtag-context');
        contextPanel.style.display = 'block';

        // Position the panel relative to the clicked button
        if (clickedButton) {
            const buttonRect = clickedButton.getBoundingClientRect();
            const isMobile = window.innerWidth <= 768;
            const panelWidth = Math.min(520, window.innerWidth * 0.9); // Responsive width
            const panelHeight = 400; // approximate height
            
            if (isMobile) {
                // On mobile, center horizontally and position below button with margin
                const left = (window.innerWidth - panelWidth) / 2;
                let top = buttonRect.bottom + 15;
                
                // Ensure panel doesn't go below viewport
                if (top + panelHeight > window.innerHeight - 20) {
                    top = Math.max(20, buttonRect.top - panelHeight - 15);
                }
                
                contextPanel.style.position = 'fixed';
                contextPanel.style.left = `${left}px`;
                contextPanel.style.top = `${top}px`;
                contextPanel.style.zIndex = '10000';
            } else {
                // Desktop positioning - center relative to button
                let left = buttonRect.left - (panelWidth / 2) + (buttonRect.width / 2);
                let top = buttonRect.bottom + 10; // 10px gap below button
                
                // Ensure panel doesn't go off-screen horizontally
                if (left < 10) {
                    left = 10;
                } else if (left + panelWidth > window.innerWidth - 10) {
                    left = window.innerWidth - panelWidth - 10;
                }
                
                // Ensure panel doesn't go off-screen vertically
                if (top + panelHeight > window.innerHeight - 10) {
                    // Position above the button instead
                    top = buttonRect.top - panelHeight - 10;
                }
                
                contextPanel.style.position = 'fixed';
                contextPanel.style.left = `${left}px`;
                contextPanel.style.top = `${top}px`;
                contextPanel.style.zIndex = '10000';
            }
        }

        // Add event listener for close button
        const closeBtn = document.getElementById('close-context');
        const closeHandler = () => {
            this.hideHashtagContext();
            closeBtn.removeEventListener('click', closeHandler);
        };
        closeBtn.addEventListener('click', closeHandler);

        // Close when clicking on backdrop (using ::before pseudo-element click area)
        const backdropClickHandler = (e) => {
            // Check if click is on the backdrop (not on the panel content)
            const panelRect = contextPanel.getBoundingClientRect();
            const clickX = e.clientX;
            const clickY = e.clientY;
            
            // If click is outside panel bounds, close the modal
            if (clickX < panelRect.left || clickX > panelRect.right || 
                clickY < panelRect.top || clickY > panelRect.bottom) {
                this.hideHashtagContext();
                document.removeEventListener('click', backdropClickHandler);
            }
        };
        
        // Add slight delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', backdropClickHandler);
        }, 100);

        // Close with Escape key
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideHashtagContext();
                document.removeEventListener('keydown', keyHandler);
                document.removeEventListener('click', backdropClickHandler);
            }
        };
        document.addEventListener('keydown', keyHandler);
    }

    hideHashtagContext() {
        const contextPanel = document.getElementById('hashtag-context');
        contextPanel.style.display = 'none';
        
        // Reset positioning styles
        contextPanel.style.position = '';
        contextPanel.style.left = '';
        contextPanel.style.top = '';
        contextPanel.style.zIndex = '';
        
        // Remove all event listeners by cloning the panel
        const newPanel = contextPanel.cloneNode(true);
        contextPanel.parentNode.replaceChild(newPanel, contextPanel);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SocialTrendAI();
});

// Add some utility functions for enhanced UX
document.addEventListener('keydown', (e) => {
    // Enter key shortcuts
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (activeElement.id === 'business-input') {
            document.getElementById('generate-message').click();
        }
    }
});

// Add smooth scrolling for better UX
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

