// Global variables
let currentUser = null;
let currentWhiteboard = null;
let authToken = null;
let websocket = null;
let canvas = null;
let ctx = null;
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#000000';
let currentLineWidth = 2;
let startX, startY;
let drawingHistory = [];
let historyStep = -1;
let collaborators = new Map();

// DOM elements
const loadingScreen = document.getElementById('loading-screen');
const authSection = document.getElementById('auth-section');
const whiteboardSection = document.getElementById('whiteboard-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const usernameDisplay = document.getElementById('username-display');
const whiteboardCanvas = document.getElementById('whiteboard-canvas');
const whiteboardTitle = document.getElementById('whiteboard-title');
const colorPicker = document.getElementById('color-picker');
const colorHex = document.getElementById('color-hex');
const lineWidthSlider = document.getElementById('line-width');
const lineWidthValue = document.getElementById('line-width-value');
const collaboratorsList = document.getElementById('collaborators-list');
const collaboratorCount = document.getElementById('collaborator-count');
const whiteboardsList = document.getElementById('whiteboards-list');
const shareLink = document.getElementById('share-link');
const toastContainer = document.getElementById('toast-container');

// API base URL
const API_BASE_URL = 'http://localhost:8000/api';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
        authToken = token;
        fetchCurrentUser();
    } else {
        showAuthSection();
    }

    // Set up event listeners
    setupEventListeners();
    
    // Initialize canvas
    initCanvas();
});

// Show/hide sections
function showLoadingScreen() {
    loadingScreen.classList.remove('d-none');
    authSection.classList.add('d-none');
    whiteboardSection.classList.add('d-none');
}

function showAuthSection() {
    loadingScreen.classList.add('d-none');
    authSection.classList.remove('d-none');
    whiteboardSection.classList.add('d-none');
}

function showWhiteboardSection() {
    loadingScreen.classList.add('d-none');
    authSection.classList.add('d-none');
    whiteboardSection.classList.remove('d-none');
}

// Set up event listeners
function setupEventListeners() {
    // Auth forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    
    // Navigation
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('new-whiteboard-btn').addEventListener('click', showNewWhiteboardModal);
    document.getElementById('my-whiteboards-btn').addEventListener('click', showMyWhiteboards);
    
    // Drawing tools
    document.querySelectorAll('input[name="tool"]').forEach(input => {
        input.addEventListener('change', (e) => {
            currentTool = e.target.id.replace('-tool', '');
            updateCursor();
        });
    });
    
    colorPicker.addEventListener('change', (e) => {
        currentColor = e.target.value;
        colorHex.value = e.target.value;
    });
    
    colorHex.addEventListener('change', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            currentColor = e.target.value;
            colorPicker.value = e.target.value;
        }
    });
    
    lineWidthSlider.addEventListener('input', (e) => {
        currentLineWidth = parseInt(e.target.value);
        lineWidthValue.textContent = currentLineWidth;
    });
    
    // Canvas actions
    document.getElementById('clear-canvas-btn').addEventListener('click', clearCanvas);
    document.getElementById('save-canvas-btn').addEventListener('click', saveCanvas);
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    
    // Modal actions
    document.getElementById('create-whiteboard-btn').addEventListener('click', createNewWhiteboard);
    document.getElementById('copy-link-btn').addEventListener('click', copyShareLink);
    document.getElementById('add-collaborator-btn').addEventListener('click', addCollaborator);
    document.getElementById('share-btn').addEventListener('click', showShareModal);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Initialize canvas
function initCanvas() {
    canvas = whiteboardCanvas;
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Canvas drawing events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
    
    // Prevent scrolling when touching the canvas
    document.body.addEventListener('touchstart', (e) => {
        if (e.target === canvas) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.body.addEventListener('touchend', (e) => {
        if (e.target === canvas) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.body.addEventListener('touchmove', (e) => {
        if (e.target === canvas) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Resize canvas to fit container
function resizeCanvas() {
    const wrapper = canvas.parentElement;
    const rect = wrapper.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Redraw canvas content if exists
    if (drawingHistory.length > 0 && historyStep >= 0) {
        redrawCanvas();
    }
}

// Update cursor based on selected tool
function updateCursor() {
    if (currentTool === 'eraser') {
        canvas.style.cursor = 'grab';
    } else {
        canvas.style.cursor = 'crosshair';
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showToast('Please enter username and password', 'warning');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }
        
        const data = await response.json();
        authToken = data.access_token;
        localStorage.setItem('authToken', authToken);
        
        await fetchCurrentUser();
        showToast('Login successful', 'success');
    } catch (error) {
        showToast('Login failed: ' + error.message, 'danger');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (!username || !email || !password) {
        showToast('Please fill all fields', 'warning');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }
        
        const user = await response.json();
        
        // Auto-login after registration
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            body: formData
        });
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            authToken = loginData.access_token;
            localStorage.setItem('authToken', authToken);
            
            await fetchCurrentUser();
            showToast('Registration successful', 'success');
        } else {
            throw new Error('Auto-login after registration failed');
        }
    } catch (error) {
        showToast('Registration failed: ' + error.message, 'danger');
    }
}

async function fetchCurrentUser() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch user');
        }
        
        currentUser = await response.json();
        usernameDisplay.textContent = currentUser.username;
        
        showWhiteboardSection();
        
        // Create a new whiteboard by default
        createNewWhiteboardSession();
    } catch (error) {
        console.error('Error fetching user:', error);
        localStorage.removeItem('authToken');
        authToken = null;
        showAuthSection();
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    currentWhiteboard = null;
    
    // Close WebSocket if open
    if (websocket) {
        websocket.close();
        websocket = null;
    }
    
    // Clear collaborators
    collaborators.clear();
    updateCollaboratorsList();
    
    showAuthSection();
    showToast('Logged out successfully', 'info');
}

// Whiteboard functions
async function createNewWhiteboardSession() {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name: 'New Whiteboard',
                description: 'A new collaborative whiteboard'
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create whiteboard');
        }
        
        currentWhiteboard = await response.json();
        whiteboardTitle.textContent = currentWhiteboard.name;
        
        // Clear canvas
        clearCanvas();
        
        // Connect to WebSocket for real-time updates
        connectWebSocket();
        
        showToast('New whiteboard created', 'success');
    } catch (error) {
        showToast('Failed to create whiteboard: ' + error.message, 'danger');
    }
}

async function showMyWhiteboards() {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch whiteboards');
        }
        
        const whiteboards = await response.json();
        
        // Clear existing list
        whiteboardsList.innerHTML = '';
        
        if (whiteboards.length === 0) {
            whiteboardsList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-folder-x display-1 text-muted"></i>
                    <p class="text-muted mt-3">No whiteboards found. Create your first whiteboard!</p>
                </div>
            `;
        } else {
            whiteboards.forEach(whiteboard => {
                const card = document.createElement('div');
                card.className = 'col-md-6 col-lg-4 mb-3';
                
                const date = new Date(whiteboard.updated_at).toLocaleDateString();
                
                card.innerHTML = `
                    <div class="card whiteboard-card h-100" data-id="${whiteboard.id}">
                        <div class="whiteboard-thumbnail">
                            <i class="bi bi-palette"></i>
                        </div>
                        <div class="whiteboard-info">
                            <div class="whiteboard-title">${whiteboard.name}</div>
                            <div class="whiteboard-meta">
                                <small>Updated: ${date}</small>
                            </div>
                        </div>
                    </div>
                `;
                
                card.addEventListener('click', () => loadWhiteboard(whiteboard.id));
                whiteboardsList.appendChild(card);
            });
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('whiteboards-modal'));
        modal.show();
    } catch (error) {
        showToast('Failed to fetch whiteboards: ' + error.message, 'danger');
    }
}

async function loadWhiteboard(whiteboardId) {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/${whiteboardId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load whiteboard');
        }
        
        currentWhiteboard = await response.json();
        whiteboardTitle.textContent = currentWhiteboard.name;
        
        // Clear and redraw canvas with saved elements
        clearCanvas();
        if (currentWhiteboard.elements && currentWhiteboard.elements.length > 0) {
            redrawElements(currentWhiteboard.elements);
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('whiteboards-modal'));
        modal.hide();
        
        // Connect to WebSocket for real-time updates
        connectWebSocket();
        
        showToast('Whiteboard loaded', 'success');
    } catch (error) {
        showToast('Failed to load whiteboard: ' + error.message, 'danger');
    }
}

function showNewWhiteboardModal() {
    const modal = new bootstrap.Modal(document.getElementById('new-whiteboard-modal'));
    modal.show();
}

async function createNewWhiteboard() {
    const name = document.getElementById('whiteboard-name').value;
    const description = document.getElementById('whiteboard-description').value;
    
    if (!name) {
        showToast('Please enter a name for the whiteboard', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, description })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create whiteboard');
        }
        
        currentWhiteboard = await response.json();
        whiteboardTitle.textContent = currentWhiteboard.name;
        
        // Clear canvas
        clearCanvas();
        
        // Connect to WebSocket for real-time updates
        connectWebSocket();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('new-whiteboard-modal'));
        modal.hide();
        
        // Reset form
        document.getElementById('new-whiteboard-form').reset();
        
        showToast('New whiteboard created', 'success');
    } catch (error) {
        showToast('Failed to create whiteboard: ' + error.message, 'danger');
    }
}

function showShareModal() {
    if (!currentWhiteboard) {
        showToast('No whiteboard to share', 'warning');
        return;
    }
    
    // Generate share link
    const shareUrl = `${window.location.origin}?whiteboard=${currentWhiteboard.id}`;
    shareLink.value = shareUrl;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('share-modal'));
    modal.show();
}

function copyShareLink() {
    shareLink.select();
    document.execCommand('copy');
    showToast('Share link copied to clipboard', 'success');
}

async function addCollaborator() {
    const username = document.getElementById('collaborator-username').value;
    
    if (!username) {
        showToast('Please enter a username', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/${currentWhiteboard.id}/collaborators?collaborator_username=${username}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to add collaborator');
        }
        
        // Reset input
        document.getElementById('collaborator-username').value = '';
        
        showToast('Collaborator added successfully', 'success');
    } catch (error) {
        showToast('Failed to add collaborator: ' + error.message, 'danger');
    }
}

// WebSocket connection for real-time updates
function connectWebSocket() {
    if (!currentWhiteboard || !authToken) {
        return;
    }
    
    // Close existing connection if any
    if (websocket) {
        websocket.close();
    }
    
    // Create WebSocket connection
    const wsUrl = `ws://localhost:8000/api/webrtc/ws/${authToken}?whiteboard_id=${currentWhiteboard.id}`;
    websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
        console.log('WebSocket connected');
        showConnectionStatus('connected');
        
        // Join the whiteboard session
        websocket.send(JSON.stringify({
            type: 'join_session',
            whiteboard_id: currentWhiteboard.id
        }));
    };
    
    websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };
    
    websocket.onclose = () => {
        console.log('WebSocket disconnected');
        showConnectionStatus('disconnected');
    };
    
    websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        showConnectionStatus('error');
    };
}

function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'drawing_data':
            // Apply drawing data from other users
            applyDrawingData(message.data);
            break;
        case 'user_joined':
            // Update collaborators list
            addCollaborator(message.user_id, message.user_info);
            showToast(`${message.user_info?.username || message.user_id} joined the whiteboard`, 'info');
            break;
        case 'user_left':
            // Update collaborators list
            removeCollaborator(message.user_id);
            showToast(`${message.user_info?.username || message.user_id} left the whiteboard`, 'info');
            break;
        case 'current_users':
            // Set current users in the session
            message.users.forEach(user => {
                addCollaborator(user.user_id, user.user_info);
            });
            break;
        case 'offer':
        case 'answer':
        case 'ice_candidate':
            // Handle WebRTC signaling
            handleWebRTCSignaling(message);
            break;
    }
}

function showConnectionStatus(status) {
    // This would update a UI element to show connection status
    console.log('Connection status:', status);
}

// Drawing functions
function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
    }
    
    // Save state for undo/redo
    saveState();
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineWidth = currentLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (currentTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.lineTo(x, y);
        ctx.stroke();
        
        // Send drawing data to other users
        sendDrawingData({
            tool: 'pen',
            coordinates: [{x: startX, y: startY}, {x, y}],
            style: {
                color: currentColor,
                width: currentLineWidth
            }
        });
        
        startX = x;
        startY = y;
    } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineTo(x, y);
        ctx.stroke();
        
        // Send drawing data to other users
        sendDrawingData({
            tool: 'eraser',
            coordinates: [{x: startX, y: startY}, {x, y}],
            style: {
                width: currentLineWidth
            }
        });
        
        startX = x;
        startY = y;
    }
}

function stopDrawing(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    let drawingData = null;
    
    if (currentTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        drawingData = {
            tool: 'line',
            coordinates: [{x: startX, y: startY}, {x: endX, y: endY}],
            style: {
                color: currentColor,
                width: currentLineWidth
            }
        };
    } else if (currentTool === 'rectangle') {
        ctx.beginPath();
        ctx.rect(startX, startY, endX - startX, endY - startY);
        ctx.stroke();
        
        drawingData = {
            tool: 'rectangle',
            coordinates: [{x: startX, y: startY}, {x: endX, y: endY}],
            style: {
                color: currentColor,
                width: currentLineWidth
            }
        };
    } else if (currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        drawingData = {
            tool: 'circle',
            coordinates: [{x: startX, y: startY}, {x: endX, y: endY}],
            style: {
                color: currentColor,
                width: currentLineWidth
            }
        };
    }
    
    isDrawing = false;
    
    // Send drawing data to other users
    if (drawingData) {
        sendDrawingData(drawingData);
    }
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                     e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingHistory = [];
    historyStep = -1;
    
    // Send clear canvas event to other users
    sendDrawingData({
        tool: 'clear',
        coordinates: []
    });
}

function saveCanvas() {
    if (!currentWhiteboard) {
        showToast('No whiteboard to save', 'warning');
        return;
    }
    
    // Convert canvas to base64
    const dataURL = canvas.toDataURL('image/png');
    
    // Download the image
    const link = document.createElement('a');
    link.download = `${currentWhiteboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    link.href = dataURL;
    link.click();
    
    showToast('Canvas saved successfully', 'success');
}

function saveState() {
    historyStep++;
    if (historyStep < drawingHistory.length) {
        drawingHistory.length = historyStep;
    }
    drawingHistory.push(canvas.toDataURL());
    
    // Limit history to 50 states
    if (drawingHistory.length > 50) {
        drawingHistory.shift();
        historyStep--;
    }
}

function undo() {
    if (historyStep > 0) {
        historyStep--;
        const canvasPic = new Image();
        canvasPic.src = drawingHistory[historyStep];
        canvasPic.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvasPic, 0, 0);
        }
    }
}

function redo() {
    if (historyStep < drawingHistory.length - 1) {
        historyStep++;
        const canvasPic = new Image();
        canvasPic.src = drawingHistory[historyStep];
        canvasPic.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvasPic, 0, 0);
        }
    }
}

function redrawCanvas() {
    if (historyStep >= 0) {
        const canvasPic = new Image();
        canvasPic.src = drawingHistory[historyStep];
        canvasPic.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvasPic, 0, 0);
        }
    }
}

function redrawElements(elements) {
    // Redraw elements from saved whiteboard data
    elements.forEach(element => {
        ctx.strokeStyle = element.style.color || '#000000';
        ctx.lineWidth = element.style.width || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (element.tool === 'pen') {
            ctx.beginPath();
            element.coordinates.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
        } else if (element.tool === 'line') {
            ctx.beginPath();
            ctx.moveTo(element.coordinates[0].x, element.coordinates[0].y);
            ctx.lineTo(element.coordinates[1].x, element.coordinates[1].y);
            ctx.stroke();
        } else if (element.tool === 'rectangle') {
            ctx.beginPath();
            ctx.rect(
                element.coordinates[0].x,
                element.coordinates[0].y,
                element.coordinates[1].x - element.coordinates[0].x,
                element.coordinates[1].y - element.coordinates[0].y
            );
            ctx.stroke();
        } else if (element.tool === 'circle') {
            const radius = Math.sqrt(
                Math.pow(element.coordinates[1].x - element.coordinates[0].x, 2) +
                Math.pow(element.coordinates[1].y - element.coordinates[0].y, 2)
            );
            ctx.beginPath();
            ctx.arc(element.coordinates[0].x, element.coordinates[0].y, radius, 0, 2 * Math.PI);
            ctx.stroke();
        }
    });
    
    // Save the state after redrawing
    saveState();
}

function applyDrawingData(data) {
    // Apply drawing data received from other users
    ctx.strokeStyle = data.style.color || '#000000';
    ctx.lineWidth = data.style.width || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (data.tool === 'pen') {
        ctx.beginPath();
        data.coordinates.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();
    } else if (data.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        data.coordinates.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    } else if (data.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(data.coordinates[0].x, data.coordinates[0].y);
        ctx.lineTo(data.coordinates[1].x, data.coordinates[1].y);
        ctx.stroke();
    } else if (data.tool === 'rectangle') {
        ctx.beginPath();
        ctx.rect(
            data.coordinates[0].x,
            data.coordinates[0].y,
            data.coordinates[1].x - data.coordinates[0].x,
            data.coordinates[1].y - data.coordinates[0].y
        );
        ctx.stroke();
    } else if (data.tool === 'circle') {
        const radius = Math.sqrt(
            Math.pow(data.coordinates[1].x - data.coordinates[0].x, 2) +
            Math.pow(data.coordinates[1].y - data.coordinates[0].y, 2)
        );
        ctx.beginPath();
        ctx.arc(data.coordinates[0].x, data.coordinates[0].y, radius, 0, 2 * Math.PI);
        ctx.stroke();
    } else if (data.tool === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Save the state after applying new drawing data
    saveState();
}

function sendDrawingData(data) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            type: 'drawing_data',
            data: data
        }));
    }
}

// Collaborator management
function addCollaborator(userId, userInfo = {}) {
    if (!collaborators.has(userId)) {
        collaborators.set(userId, {
            id: userId,
            username: userInfo.username || userId,
            status: 'online'
        });
        updateCollaboratorsList();
    }
}

function removeCollaborator(userId) {
    if (collaborators.has(userId)) {
        collaborators.delete(userId);
        updateCollaboratorsList();
    }
}

function updateCollaboratorsList() {
    collaboratorsList.innerHTML = '';
    collaboratorCount.textContent = collaborators.size;
    
    if (collaborators.size === 0) {
        collaboratorsList.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="bi bi-person-x display-4"></i>
                <p class="mt-2">No collaborators</p>
            </div>
        `;
        return;
    }
    
    collaborators.forEach((collaborator, userId) => {
        const item = document.createElement('div');
        item.className = 'collaborator-item';
        item.id = `collaborator-${userId}`;
        
        const initial = collaborator.username.charAt(0).toUpperCase();
        
        item.innerHTML = `
            <div class="collaborator-avatar">${initial}</div>
            <div class="collaborator-info">
                <div class="collaborator-name">${collaborator.username}</div>
                <div class="collaborator-status ${collaborator.status}">Online</div>
            </div>
            <div class="collaborator-status-indicator ${collaborator.status}"></div>
        `;
        
        collaboratorsList.appendChild(item);
    });
}

// WebRTC signaling (simplified)
function handleWebRTCSignaling(message) {
    // In a full implementation, you would handle WebRTC offer/answer/ICE candidates here
    console.log('WebRTC signaling message:', message);
}

// Utility functions
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        canvas.requestFullscreen().catch(err => {
            showToast(`Error attempting to enable fullscreen: ${err.message}`, 'danger');
        });
    } else {
        document.exitFullscreen();
    }
}

function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }
    
    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
    }
    
    // Escape to exit fullscreen
    if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen();
    }
    
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCanvas();
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const icon = {
        'success': 'bi-check-circle',
        'danger': 'bi-exclamation-triangle',
        'warning': 'bi-exclamation-triangle',
        'info': 'bi-info-circle'
    }[type] || 'bi-info-circle';
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi ${icon} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Check for shared whiteboard in URL
function checkSharedWhiteboard() {
    const urlParams = new URLSearchParams(window.location.search);
    const whiteboardId = urlParams.get('whiteboard');
    
    if (whiteboardId && authToken) {
        loadWhiteboard(whiteboardId);
    }
}

// Initialize on page load
window.addEventListener('load', () => {
    // Hide loading screen after a short delay
    setTimeout(() => {
        if (!authToken) {
            showAuthSection();
        }
    }, 1000);
    
    // Check for shared whiteboard
    checkSharedWhiteboard();
});