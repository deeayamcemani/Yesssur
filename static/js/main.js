// Main JavaScript file for CS Present
document.addEventListener('DOMContentLoaded', function() {
    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }, 500);
    
    // Initialize animations
    initializeAnimations();
    
    // Initialize mobile navigation
    initializeMobileNav();
    
    // Initialize theme
    initializeTheme();
    
    // Auto-hide flash messages
    autoHideFlashMessages();
    
    // Initialize real-time updates
    initializeRealTimeUpdates();
});

// Animation initialization
function initializeAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, {
        threshold: 0.1
    });

    // Observe elements for animation
    document.querySelectorAll('.stat-card, .course-card, .feature-card').forEach((el) => {
        observer.observe(el);
    });
}

// Mobile navigation
function initializeMobileNav() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPath) {
            item.classList.add('active');
        }
    });
}

// Theme management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Flash message auto-hide
function autoHideFlashMessages() {
    const flashMessages = document.querySelectorAll('.flash-message');
    
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.style.transform = 'translateX(100%)';
            message.style.opacity = '0';
            
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 5000);
    });
}

// Real-time updates for active sessions
function initializeRealTimeUpdates() {
    // Update class session statuses
    updateSessionStatuses();
    
    // Check every minute for active sessions
    setInterval(updateSessionStatuses, 60000);
}

function updateSessionStatuses() {
    const sessionElements = document.querySelectorAll('[data-session-id]');
    
    sessionElements.forEach(element => {
        const sessionId = element.getAttribute('data-session-id');
        const startTime = element.getAttribute('data-start-time');
        const endTime = element.getAttribute('data-end-time');
        const sessionDate = element.getAttribute('data-session-date');
        
        if (startTime && endTime && sessionDate) {
            const now = new Date();
            const sessionStart = new Date(`${sessionDate}T${startTime}`);
            const sessionEnd = new Date(`${sessionDate}T${endTime}`);
            
            let status = 'upcoming';
            
            if (now >= sessionStart && now <= sessionEnd) {
                status = 'active';
            } else if (now > sessionEnd) {
                status = 'completed';
            }
            
            updateElementStatus(element, status);
        }
    });
}

function updateElementStatus(element, status) {
    const statusElement = element.querySelector('.course-status');
    if (statusElement) {
        statusElement.className = `course-status status-${status}`;
        statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
    
    // Show/hide attendance button based on status
    const attendanceBtn = element.querySelector('.attendance-btn');
    if (attendanceBtn) {
        if (status === 'active') {
            attendanceBtn.style.display = 'block';
            attendanceBtn.classList.add('animate-pulse');
        } else {
            attendanceBtn.style.display = 'none';
            attendanceBtn.classList.remove('animate-pulse');
        }
    }
}

// Attendance marking functionality
async function markAttendance(sessionId) {
    const button = document.querySelector(`[data-session-id="${sessionId}"] .attendance-btn`);
    
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marking...';
        
        try {
            const response = await fetch('/api/mark-attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                button.innerHTML = '<i class="fas fa-check"></i> Present';
                button.classList.remove('btn-primary');
                button.classList.add('btn-success');
                
                showNotification('Attendance marked successfully!', 'success');
            } else {
                throw new Error(data.message || 'Failed to mark attendance');
            }
            
        } catch (error) {
            console.error('Error marking attendance:', error);
            button.innerHTML = '<i class="fas fa-user-check"></i> Mark Present';
            button.disabled = false;
            
            showNotification('Failed to mark attendance. Please try again.', 'error');
        }
    }
}

// Course joining functionality
async function joinCourse(courseCode) {
    try {
        const response = await fetch('/api/join-course', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                course_code: courseCode
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Successfully joined course!', 'success');
            // Refresh the page to show the new course
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error(data.message || 'Failed to join course');
        }
        
    } catch (error) {
        console.error('Error joining course:', error);
        showNotification('Failed to join course. Please check the code.', 'error');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const container = document.querySelector('.flash-container') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `flash-message flash-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="flash-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.className = 'flash-container';
    document.body.appendChild(container);
    return container;
}

// Course filtering
function filterCourses(filter) {
    const courses = document.querySelectorAll('.course-card');
    
    courses.forEach(course => {
        const courseCode = course.querySelector('.course-code').textContent.toLowerCase();
        
        if (filter === 'all' || courseCode.includes(filter.toLowerCase())) {
            course.style.display = 'block';
            course.classList.add('animate-fade-in');
        } else {
            course.style.display = 'none';
        }
    });
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('course-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterCourses(query || 'all');
        });
    }
}

// Modal functionality
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('animate-fade-in');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// Form validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });
    
    // Email validation
    const emailFields = form.querySelectorAll('[type="email"]');
    emailFields.forEach(field => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (field.value && !emailPattern.test(field.value)) {
            field.classList.add('error');
            isValid = false;
        }
    });
    
    // Password confirmation
    const password = form.querySelector('[name="password"]');
    const confirmPassword = form.querySelector('[name="confirm_password"]');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
        confirmPassword.classList.add('error');
        isValid = false;
    }
    
    return isValid;
}

// Export functionality
async function exportAttendance(format = 'excel') {
    try {
        const response = await fetch(`/api/export-attendance?format=${format}`, {
            method: 'GET'
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showNotification('Attendance exported successfully!', 'success');
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Error exporting attendance:', error);
        showNotification('Failed to export attendance', 'error');
    }
}

// Utility functions
function formatTime(time) {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(date) {
    return new Date(date).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('course-search');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal[style*="flex"]');
        openModals.forEach(modal => {
            closeModal(modal.id);
        });
    }
});

// Performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize search with debouncing
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('course-search');
    if (searchInput) {
        const debouncedSearch = debounce((query) => {
            filterCourses(query || 'all');
        }, 300);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value.toLowerCase());
        });
    }
});

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Offline detection
window.addEventListener('online', () => {
    showNotification('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showNotification('You are offline', 'warning');
});

// Touch gestures for mobile
function setupTouchGestures() {
    let startX, startY, endX, endY;
    
    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;
        
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        // Swipe right to go back (if applicable)
        if (diffX < -100 && Math.abs(diffY) < 50) {
            // Handle swipe right
            const backButton = document.querySelector('.back-button');
            if (backButton) {
                backButton.click();
            }
        }
    });
}

// Initialize touch gestures on mobile
if ('ontouchstart' in window) {
    setupTouchGestures();
}