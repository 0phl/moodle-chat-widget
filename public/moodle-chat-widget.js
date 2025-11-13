(function() {
    'use strict';

    // Get settings from loader
    var settings = window.moodleChat.settings || {};
    var appId = settings.appId || 'default';
    var apiEndpoint = settings.apiEndpoint;
    var botName = settings.botName || 'Assistant';
    var primaryColor = settings.primaryColor || '#0066cc';
    var position = settings.position || 'right';
    var welcomeMessage = settings.welcomeMessage || 'Hi! How can I help?';
    var placeholder = settings.placeholder || 'Type your message...';
    var autoOpen = settings.autoOpen || false;

    // Session management
    var sessionId = getOrCreateSessionId();
    var conversationHistory = loadConversationHistory();
    var isOpen = false;

    // Initialize widget
    function init() {
        injectStyles();
        createWidgetHTML();
        attachEventListeners();
        loadConversationHistory();
        
        if (autoOpen) {
            setTimeout(openChat, 1000);
        }

        // Add welcome message if no history
        if (conversationHistory.length === 0) {
            addBotMessage(welcomeMessage);
        } else {
            renderConversationHistory();
        }
    }

    // Generate or retrieve session ID
    function getOrCreateSessionId() {
        var key = 'moodle_chat_session_' + appId;
        var sid = localStorage.getItem(key);
        if (!sid) {
            sid = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(key, sid);
        }
        return sid;
    }

    // Load conversation history from localStorage
    function loadConversationHistory() {
        var key = 'moodle_chat_history_' + appId;
        try {
            var history = localStorage.getItem(key);
            return history ? JSON.parse(history) : [];
        } catch (e) {
            return [];
        }
    }

    // Save conversation history
    function saveConversationHistory() {
        var key = 'moodle_chat_history_' + appId;
        try {
            localStorage.setItem(key, JSON.stringify(conversationHistory));
        } catch (e) {
            console.error('Failed to save chat history');
        }
    }

    // Inject CSS styles
    function injectStyles() {
        var css = `
            .moodle-chat-widget * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            .moodle-chat-button {
                position: fixed;
                bottom: 20px;
                ${position}: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: ${primaryColor};
                color: white;
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                transition: transform 0.3s, box-shadow 0.3s;
            }

            .moodle-chat-button:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(0,0,0,0.2);
            }

            .moodle-chat-button.active {
                background: #333;
            }

            .moodle-chat-window {
                position: fixed;
                bottom: 90px;
                ${position}: 20px;
                width: 380px;
                height: 600px;
                max-height: calc(100vh - 120px);
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                z-index: 999998;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }

            .moodle-chat-window.open {
                display: flex;
                animation: slideUp 0.3s ease-out;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .moodle-chat-header {
                background: ${primaryColor};
                color: white;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .moodle-chat-header h3 {
                font-size: 18px;
                font-weight: 600;
            }

            .moodle-chat-header-actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .moodle-chat-action-btn {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .moodle-chat-action-btn:hover {
                background: rgba(255,255,255,0.2);
            }

            .moodle-chat-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .moodle-chat-close:hover {
                background: rgba(255,255,255,0.2);
            }

            .moodle-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #f5f5f5;
            }

            .moodle-chat-message {
                margin-bottom: 16px;
                display: flex;
                animation: fadeIn 0.3s ease-out;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .moodle-chat-message.user {
                justify-content: flex-end;
            }

            .moodle-chat-message-content {
                max-width: 75%;
                padding: 12px 16px;
                border-radius: 18px;
                word-wrap: break-word;
                line-height: 1.4;
                font-size: 14px;
            }

            .moodle-chat-message.bot .moodle-chat-message-content {
                background: white;
                color: #333;
                border-bottom-left-radius: 4px;
            }

            .moodle-chat-message.user .moodle-chat-message-content {
                background: ${primaryColor};
                color: white;
                border-bottom-right-radius: 4px;
            }

            .moodle-chat-typing {
                display: none;
                padding: 12px 16px;
                background: white;
                border-radius: 18px;
                max-width: 75px;
                margin-bottom: 16px;
            }

            .moodle-chat-typing.active {
                display: block;
                animation: fadeIn 0.3s ease-out;
            }

            .moodle-chat-typing span {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #999;
                margin: 0 2px;
                animation: typing 1.4s infinite;
            }

            .moodle-chat-typing span:nth-child(2) {
                animation-delay: 0.2s;
            }

            .moodle-chat-typing span:nth-child(3) {
                animation-delay: 0.4s;
            }

            @keyframes typing {
                0%, 60%, 100% {
                    transform: translateY(0);
                }
                30% {
                    transform: translateY(-10px);
                }
            }

            .moodle-chat-input-container {
                padding: 16px;
                background: white;
                border-top: 1px solid #e0e0e0;
                display: flex;
                gap: 8px;
            }

            .moodle-chat-input {
                flex: 1;
                border: 1px solid #ddd;
                border-radius: 24px;
                padding: 10px 16px;
                font-size: 14px;
                outline: none;
                font-family: inherit;
                transition: border-color 0.2s;
            }

            .moodle-chat-input:focus {
                border-color: ${primaryColor};
            }

            .moodle-chat-send {
                background: ${primaryColor};
                color: white;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
                font-size: 18px;
            }

            .moodle-chat-send:hover:not(:disabled) {
                opacity: 0.9;
            }

            .moodle-chat-send:disabled {
                background: #ccc;
                cursor: not-allowed;
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                .moodle-chat-window {
                    width: 100%;
                    height: 100%;
                    max-height: 100%;
                    bottom: 0;
                    ${position}: 0;
                    border-radius: 0;
                }
                
                .moodle-chat-button {
                    bottom: 15px;
                    ${position}: 15px;
                }
            }
        `;

        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    // Create widget HTML
    function createWidgetHTML() {
        var html = `
            <div class="moodle-chat-widget">
                <button class="moodle-chat-button" id="moodleChatButton" aria-label="Open chat">
                    💬
                </button>
                
                <div class="moodle-chat-window" id="moodleChatWindow">
                    <div class="moodle-chat-header">
                        <h3>${botName}</h3>
                        <div class="moodle-chat-header-actions">
                            <button class="moodle-chat-action-btn" id="moodleChatClear" aria-label="Clear chat" title="Clear chat">🗑️</button>
                            <button class="moodle-chat-action-btn" id="moodleChatEnd" aria-label="End chat" title="End chat">🚪</button>
                            <button class="moodle-chat-close" id="moodleChatClose" aria-label="Close chat">×</button>
                        </div>
                    </div>
                    
                    <div class="moodle-chat-messages" id="moodleChatMessages">
                        <div class="moodle-chat-typing" id="moodleChatTyping">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                    
                    <div class="moodle-chat-input-container">
                        <input 
                            type="text" 
                            class="moodle-chat-input" 
                            id="moodleChatInput" 
                            placeholder="${placeholder}"
                            autocomplete="off"
                        />
                        <button class="moodle-chat-send" id="moodleChatSend" aria-label="Send message">
                            ➤
                        </button>
                    </div>
                </div>
            </div>
        `;

        var container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container.firstElementChild);
    }

    // Attach event listeners
    function attachEventListeners() {
        var button = document.getElementById('moodleChatButton');
        var closeBtn = document.getElementById('moodleChatClose');
        var clearBtn = document.getElementById('moodleChatClear');
        var endBtn = document.getElementById('moodleChatEnd');
        var sendBtn = document.getElementById('moodleChatSend');
        var input = document.getElementById('moodleChatInput');

        button.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', closeChat);
        clearBtn.addEventListener('click', clearChat);
        endBtn.addEventListener('click', endChat);
        sendBtn.addEventListener('click', sendMessage);
        
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Toggle chat window
    function toggleChat() {
        if (isOpen) {
            closeChat();
        } else {
            openChat();
        }
    }

    // Open chat
    function openChat() {
        var window = document.getElementById('moodleChatWindow');
        var button = document.getElementById('moodleChatButton');
        
        window.classList.add('open');
        button.classList.add('active');
        button.textContent = '✕';
        isOpen = true;

        // Focus input
        setTimeout(function() {
            document.getElementById('moodleChatInput').focus();
        }, 300);
    }

    // Close chat
    function closeChat() {
        var window = document.getElementById('moodleChatWindow');
        var button = document.getElementById('moodleChatButton');
        
        window.classList.remove('open');
        button.classList.remove('active');
        button.textContent = '💬';
        isOpen = false;
    }

    // Clear chat (new conversation)
    function clearChat() {
        if (confirm('Are you sure you want to clear the chat history and start a new conversation?')) {
            conversationHistory = [];
            saveConversationHistory();
            
            var messagesDiv = document.getElementById('moodleChatMessages');
            messagesDiv.innerHTML = '<div class="moodle-chat-typing" id="moodleChatTyping"><span></span><span></span><span></span></div>';
            
            addBotMessage(welcomeMessage);
        }
    }

    // End chat (clear and close)
    function endChat() {
        if (confirm('Are you sure you want to end the chat? This will clear the conversation history and close the chat window.')) {
            conversationHistory = [];
            saveConversationHistory();
            
            var messagesDiv = document.getElementById('moodleChatMessages');
            messagesDiv.innerHTML = '<div class="moodle-chat-typing" id="moodleChatTyping"><span></span><span></span><span></span></div>';
            
            addBotMessage(welcomeMessage);
            closeChat();
        }
    }

    // Send message
    function sendMessage() {
        var input = document.getElementById('moodleChatInput');
        var message = input.value.trim();

        if (!message) return;

        // Add user message to UI
        addUserMessage(message);
        input.value = '';

        // Show typing indicator
        showTypingIndicator();

        // Send to API
        sendToAPI(message)
            .then(function(response) {
                hideTypingIndicator();
                addBotMessage(response);
            })
            .catch(function(error) {
                hideTypingIndicator();
                addBotMessage('Sorry, I encountered an error. Please try again.');
                console.error('Chat API error:', error);
            });
    }

    // Add user message to chat
    function addUserMessage(text, skipHistory) {
        var messagesDiv = document.getElementById('moodleChatMessages');
        var messageDiv = document.createElement('div');
        messageDiv.className = 'moodle-chat-message user';
        messageDiv.innerHTML = `<div class="moodle-chat-message-content">${escapeHtml(text)}</div>`;
        
        var typingIndicator = document.getElementById('moodleChatTyping');
        messagesDiv.insertBefore(messageDiv, typingIndicator);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // Save to history (unless rendering from history)
        if (!skipHistory) {
            conversationHistory.push({ role: 'user', content: text, timestamp: Date.now() });
            saveConversationHistory();
        }
    }

    // Add bot message to chat
    function addBotMessage(text, skipHistory) {
        var messagesDiv = document.getElementById('moodleChatMessages');
        var messageDiv = document.createElement('div');
        messageDiv.className = 'moodle-chat-message bot';
        messageDiv.innerHTML = `<div class="moodle-chat-message-content">${escapeHtml(text)}</div>`;
        
        var typingIndicator = document.getElementById('moodleChatTyping');
        messagesDiv.insertBefore(messageDiv, typingIndicator);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // Save to history (unless rendering from history)
        if (!skipHistory) {
            conversationHistory.push({ role: 'bot', content: text, timestamp: Date.now() });
            saveConversationHistory();
        }
    }

    // Render conversation history
    function renderConversationHistory() {
        var messagesDiv = document.getElementById('moodleChatMessages');
        var typingIndicator = document.getElementById('moodleChatTyping');
        
        conversationHistory.forEach(function(msg) {
            var messageDiv = document.createElement('div');
            messageDiv.className = 'moodle-chat-message ' + msg.role;
            messageDiv.innerHTML = '<div class="moodle-chat-message-content">' + escapeHtml(msg.content) + '</div>';
            messagesDiv.insertBefore(messageDiv, typingIndicator);
        });
        
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Show typing indicator
    function showTypingIndicator() {
        document.getElementById('moodleChatTyping').classList.add('active');
        var messagesDiv = document.getElementById('moodleChatMessages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Hide typing indicator
    function hideTypingIndicator() {
        document.getElementById('moodleChatTyping').classList.remove('active');
    }

    // Send message to API
    function sendToAPI(message) {
        return new Promise(function(resolve, reject) {
            if (!apiEndpoint) {
                reject(new Error('API endpoint not configured'));
                return;
            }

            var xhr = new XMLHttpRequest();
            xhr.open('POST', apiEndpoint, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        var response = JSON.parse(xhr.responseText);
                        resolve(response.message || response.response || 'No response from server');
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error('HTTP ' + xhr.status));
                }
            };

            xhr.onerror = function() {
                reject(new Error('Network error'));
            };

            var payload = {
                appId: appId,
                sessionId: sessionId,
                message: message,
                history: conversationHistory.slice(-10) // Send last 10 messages for context
            };

            xhr.send(JSON.stringify(payload));
        });
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    window.moodleChat.open = openChat;
    window.moodleChat.close = closeChat;
    window.moodleChat.send = sendMessage;
    window.moodleChat.clear = clearChat;
    window.moodleChat.end = endChat;
    window.moodleChat.clearHistory = function() {
        conversationHistory = [];
        saveConversationHistory();
        document.getElementById('moodleChatMessages').innerHTML = '<div class="moodle-chat-typing" id="moodleChatTyping"><span></span><span></span><span></span></div>';
        addBotMessage(welcomeMessage);
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();