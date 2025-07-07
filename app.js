import { auth, db, storage } from './firebase.js';

// DOM Elements
const chatsList = document.getElementById('chats-list');
const chatContainer = document.getElementById('chat-container');
const emptyState = document.getElementById('empty-state');

// State management
let activeChats = {}; // Track open chat panels
let currentUser = null;

// Initialize the app
function initApp() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadChats();
            setupEventListeners();
        }
    });
}

// Load chats from Firestore
function loadChats() {
    const unsubscribe = db.collection('users')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            chatsList.innerHTML = ''; // Clear existing chats
            
            snapshot.forEach((doc) => {
                const chat = doc.data();
                const chatElement = createChatElement(chat);
                chatsList.appendChild(chatElement);
                
                // Open the chat if it's already in activeChats
                if (activeChats[chat.phone]) {
                    openChatPanel(chat);
                }
            });
        }, (error) => {
            console.error("Error loading chats:", error);
        });
    
    return unsubscribe;
}

// Create chat list item
function createChatElement(chat) {
    const chatElement = document.createElement('div');
    chatElement.className = `flex items-center p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${activeChats[chat.phone] ? 'bg-gray-100 dark:bg-gray-700' : ''}`;
    chatElement.dataset.phone = chat.phone;
    
    chatElement.innerHTML = `
        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
            ${chat.displayName ? chat.displayName.charAt(0) : chat.phone.slice(-2)}
        </div>
        <div class="ml-3 flex-1 overflow-hidden">
            <div class="flex justify-between items-center">
                <h3 class="text-sm font-medium dark:text-white truncate">${chat.displayName || chat.phone}</h3>
                <span class="text-xs text-gray-500 dark:text-gray-400">${formatTime(chat.lastMessageTime)}</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">${chat.lastMessage || 'No messages yet'}</p>
        </div>
        ${chat.unreadCount ? `<span class="ml-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">${chat.unreadCount}</span>` : ''}
    `;
    
    chatElement.addEventListener('click', () => openChatPanel(chat));
    return chatElement;
}

// Open chat panel
function openChatPanel(chat) {
    // Hide empty state if it's the first chat
    if (Object.keys(activeChats).length === 0) {
        emptyState.classList.add('hidden');
    }
    
    // If panel already exists, just bring it to focus
    if (activeChats[chat.phone]) {
        activeChats[chat.phone].element.classList.remove('hidden');
        return;
    }
    
    // Create new chat panel
    const panelId = `chat-${chat.phone.replace(/\D/g, '')}`;
    const panelElement = document.createElement('div');
    panelElement.id = panelId;
    panelElement.className = 'flex-1 flex flex-col border-l border-gray-300 dark:border-gray-700';
    panelElement.innerHTML = `
        <div class="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
            <div class="flex items-center">
                <button class="p-1 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden">
                    <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <div class="flex-shrink-0 h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                    ${chat.displayName ? chat.displayName.charAt(0) : chat.phone.slice(-2)}
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium dark:text-white">${chat.displayName || chat.phone}</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        <span id="${panelId}-status">${chat.aiEnabled ? 'AI is responding...' : 'Online'}</span>
                    </p>
                </div>
            </div>
            <div class="flex items-center">
                <button class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 toggle-ai" data-phone="${chat.phone}">
                    <svg class="w-5 h-5 ${chat.aiEnabled ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                </button>
                <button class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                    </svg>
                </button>
                <button class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 close-chat" data-panel="${panelId}">
                    <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
        <div id="${panelId}-messages" class="flex-1 overflow-y-auto p-4 space-y-3">
            <div class="text-center py-4 text-gray-500 dark:text-gray-400">
                Loading messages...
            </div>
        </div>
        <div class="p-3 bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700">
            <div class="flex items-center">
                <button class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 emoji-btn">
                    <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </button>
                <div class="relative flex-1 mx-2">
                    <input type="text" id="${panelId}-input" placeholder="Type a message" class="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-full focus:outline-none dark:text-white">
                    <div id="${panelId}-upload-preview" class="hidden absolute bottom-12 left-0 w-full p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <div class="flex justify-between items-center p-2">
                            <span class="text-sm font-medium dark:text-white">File preview</span>
                            <button class="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cancel-upload">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="p-2">
                            <img id="${panelId}-preview-img" class="max-w-full max-h-40 mx-auto hidden" src="" alt="Preview">
                            <audio id="${panelId}-preview-audio" class="w-full hidden" controls></audio>
                        </div>
                    </div>
                </div>
                <button class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 attachment-btn">
                    <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                    </svg>
                </button>
                <button class="p-2 ml-2 rounded-full bg-green-500 text-white hover:bg-green-600 send-btn">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"></path>
                    </svg>
                </button>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>WhatsApp Web</span>
                <button class="schedule-btn" data-phone="${chat.phone}">Schedule message</button>
            </div>
        </div>
    `;
    
    chatContainer.appendChild(panelElement);
    activeChats[chat.phone] = { element: panelElement, phone: chat.phone };
    
    // Load messages for this chat
    loadMessages(chat.phone, panelId);
    
    // Setup event listeners for this panel
    setupPanelEventListeners(panelId, chat.phone);
}

// Load messages for a specific chat
function loadMessages(phone, panelId) {
    const messagesContainer = document.getElementById(`${panelId}-messages`);
    
    const unsubscribe = db.collection('whatsapp_logs')
        .where('to', '==', phone)
        .orWhere('from', '==', phone)
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            messagesContainer.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const message = doc.data();
                const messageElement = createMessageElement(message);
                messagesContainer.appendChild(messageElement);
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, (error) => {
            console.error("Error loading messages:", error);
        });
    
    // Store unsubscribe function for cleanup
    activeChats[phone].unsubscribeMessages = unsubscribe;
}

// Create message element
function createMessageElement(message) {
    const isOutgoing = message.direction === 'outgoing';
    const isAI = message.aiGenerated;
    
    const messageElement = document.createElement('div');
    messageElement.className = `flex ${isOutgoing ? 'justify-end' : 'justify-start'}`;
    
    let messageContent = '';
    if (message.type === 'text') {
        messageContent = `
            <div class="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${isOutgoing ? 'bg-green-100 dark:bg-green-900' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}">
                <p class="text-sm dark:text-white">${message.message.text.body}</p>
                <div class="flex justify-end items-center mt-1 space-x-1">
                    <span class="text-xs text-gray-500 dark:text-gray-400">${formatTime(message.timestamp)}</span>
                    ${isOutgoing ? `
                        <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    ` : ''}
                </div>
            </div>
        `;
    } else if (message.type === 'image') {
        messageContent = `
            <div class="max-w-xs md:max-w-md rounded-lg overflow-hidden ${isOutgoing ? 'bg-green-100 dark:bg-green-900' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}">
                <img src="${message.message.image.url}" alt="Image" class="w-full h-auto">
                <div class="p-2">
                    <div class="flex justify-end items-center space-x-1">
                        <span class="text-xs text-gray-500 dark:text-gray-400">${formatTime(message.timestamp)}</span>
                        ${isOutgoing ? `
                            <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    messageElement.innerHTML = `
        <div class="flex flex-col space-y-1">
            ${isAI && !isOutgoing ? '<span class="text-xs text-gray-500 dark:text-gray-400">AI Response</span>' : ''}
            ${messageContent}
        </div>
    `;
    
    return messageElement;
}

// Format timestamp
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Setup panel event listeners
function setupPanelEventListeners(panelId, phone) {
    const panel = document.getElementById(panelId);
    const input = document.getElementById(`${panelId}-input`);
    const sendBtn = panel.querySelector('.send-btn');
    const attachmentBtn = panel.querySelector('.attachment-btn');
    const uploadPreview = document.getElementById(`${panelId}-upload-preview`);
    const cancelUpload = panel.querySelector('.cancel-upload');
    const toggleAI = panel.querySelector('.toggle-ai');
    const closeBtn = panel.querySelector('.close-chat');
    const scheduleBtn = panel.querySelector('.schedule-btn');
    
    // Send message on Enter or button click
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            sendMessage(phone, input.value);
            input.value = '';
        }
    });
    
    sendBtn.addEventListener('click', () => {
        if (input.value.trim()) {
            sendMessage(phone, input.value);
            input.value = '';
        }
    });
    
    // Toggle AI mode
    toggleAI.addEventListener('click', () => {
        db.collection('users').doc(phone).update({
            aiEnabled: !activeChats[phone].aiEnabled
        });
    });
    
    // Close chat panel
    closeBtn.addEventListener('click', () => {
        closeChatPanel(phone);
    });
    
    // Schedule message
    scheduleBtn.addEventListener('click', () => {
        showScheduleModal(phone);
    });
    
    // Attachment handling
    attachmentBtn.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,audio/*';
        fileInput.onchange = (e) => handleFileUpload(e, phone, panelId);
        fileInput.click();
    });
    
    // Drag and drop for attachments
    panel.addEventListener('dragover', (e) => {
        e.preventDefault();
        panel.classList.add('border-2', 'border-green-500');
    });
    
    panel.addEventListener('dragleave', () => {
        panel.classList.remove('border-2', 'border-green-500');
    });
    
    panel.addEventListener('drop', (e) => {
        e.preventDefault();
        panel.classList.remove('border-2', 'border-green-500');
        handleFileUpload(e, phone, panelId);
    });
    
    // Cancel upload
    cancelUpload.addEventListener('click', () => {
        uploadPreview.classList.add('hidden');
        activeChats[phone].upload = null;
    });
}

// Handle file upload
function handleFileUpload(event, phone, panelId) {
    const file = event.target.files ? event.target.files[0] : event.dataTransfer.files[0];
    if (!file) return;
    
    const uploadPreview = document.getElementById(`${panelId}-upload-preview`);
    const previewImg = document.getElementById(`${panelId}-preview-img`);
    const previewAudio = document.getElementById(`${panelId}-preview-audio`);
    
    // Show preview based on file type
    if (file.type.startsWith('image/')) {
        previewImg.src = URL.createObjectURL(file);
        previewImg.classList.remove('hidden');
        previewAudio.classList.add('hidden');
    } else if (file.type.startsWith('audio/')) {
        previewAudio.src = URL.createObjectURL(file);
        previewAudio.classList.remove('hidden');
        previewImg.classList.add('hidden');
    } else {
        alert('Only images and audio files are supported');
        return;
    }
    
    uploadPreview.classList.remove('hidden');
    activeChats[phone].upload = file;
}

// Send message
function sendMessage(phone, text) {
    // Check if there's an upload
    if (activeChats[phone]?.upload) {
        uploadAndSendMedia(phone, activeChats[phone].upload, text);
        return;
    }
    
    // Send text message
    const message = {
        from: currentUser.uid,
        to: phone,
        type: 'text',
        message: { text: { body: text } },
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        direction: 'outgoing',
        aiGenerated: false
    };
    
    db.collection('whatsapp_logs').add(message)
        .catch((error) => {
            console.error("Error sending message:", error);
        });
}

// Upload and send media
function uploadAndSendMedia(phone, file, caption = '') {
    const storageRef = storage.ref(`temp_uploads/${currentUser.uid}/${Date.now()}_${file.name}`);
    const uploadTask = storageRef.put(file);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            // Progress handling can be added here
        },
        (error) => {
            console.error("Upload error:", error);
        },
        () => {
            // Upload completed
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                // Create a temporary upload record
                db.collection('temp_uploads').add({
                    url: downloadURL,
                    type: file.type,
                    expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000))
                });
                
                // Send message with media
                const messageType = file.type.startsWith('image/') ? 'image' : 'audio';
                const message = {
                    from: currentUser.uid,
                    to: phone,
                    type: messageType,
                    message: {
                        [messageType]: {
                            url: downloadURL,
                            caption: caption
                        }
                    },
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    direction: 'outgoing',
                    aiGenerated: false
                };
                
                db.collection('whatsapp_logs').add(message)
                    .then(() => {
                        // Hide upload preview
                        const uploadPreview = document.querySelector(`#chat-${phone.replace(/\D/g, '')}-upload-preview`);
                        if (uploadPreview) uploadPreview.classList.add('hidden');
                        activeChats[phone].upload = null;
                    })
                    .catch((error) => {
                        console.error("Error sending media message:", error);
                    });
            });
        }
    );
}

// Close chat panel
function closeChatPanel(phone) {
    if (!activeChats[phone]) return;
    
    // Clean up listeners
    if (activeChats[phone].unsubscribeMessages) {
        activeChats[phone].unsubscribeMessages();
    }
    
    // Remove panel from DOM
    activeChats[phone].element.remove();
    delete activeChats[phone];
    
    // Show empty state if no chats left
    if (Object.keys(activeChats).length === 0) {
        emptyState.classList.remove('hidden');
    }
}

// Show schedule modal
function showScheduleModal(phone) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-medium dark:text-white">Schedule Message</h3>
            </div>
            <div class="p-4">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                    <textarea id="schedule-message" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 dark:text-white" rows="3"></textarea>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schedule Time</label>
                    <input type="datetime-local" id="schedule-time" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 dark:text-white">
                </div>
            </div>
            <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                <button class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 cancel-schedule">
                    Cancel
                </button>
                <button class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 confirm-schedule" data-phone="${phone}">
                    Schedule
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.cancel-schedule').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.confirm-schedule').addEventListener('click', () => {
        const message = modal.querySelector('#schedule-message').value;
        const time = modal.querySelector('#schedule-time').value;
        
        if (message && time) {
            scheduleMessage(phone, message, new Date(time));
            modal.remove();
        } else {
            alert('Please enter both message and schedule time');
        }
    });
}

// Schedule message
function scheduleMessage(phone, message, sendAt) {
    const scheduledMessage = {
        to: phone,
        messagePayload: {
            text: { body: message }
        },
        sendAt: firebase.firestore.Timestamp.fromDate(sendAt),
        sent: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    db.collection('scheduled_messages').add(scheduledMessage)
        .then(() => {
            // Show success notification
            alert('Message scheduled successfully');
        })
        .catch((error) => {
            console.error("Error scheduling message:", error);
            alert('Failed to schedule message');
        });
}

// Setup global event listeners
function setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const html = document.documentElement;
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                html.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
        });
    }
    
    // Check for saved theme preference
    if (localStorage.getItem('theme') === 'light') {
        document.documentElement.classList.remove('dark');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);