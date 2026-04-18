const firebaseConfig = {
    apiKey: "AIzaSyDpkLi2XtoPpDTlk5GVroB4T_jRUWldFH4",
    authDomain: "crm-45045.firebaseapp.com",
    projectId: "crm-45045",
    storageBucket: "crm-45045.firebasestorage.app",
    messagingSenderId: "1036987790203",
    appId: "1:1036987790203:web:798ea8515106403b7943de",
    measurementId: "G-TDB65MJEH7",
    databaseURL: "https://crm-45045-default-rtdb.firebaseio.com"
};

let db = null;
const sessionID = Date.now() + Math.random().toString(36).substring(2);

try {
    if (typeof firebase !== 'undefined') {
        const firebaseApp = firebase.initializeApp(firebaseConfig);
        db = firebaseApp.database();
        console.log('[Fire-Sync] Initialized Realtime Database');
    } else {
        console.warn('[Fire-Sync] Firebase SDK not found. Real-time tracking disabled.');
    }
} catch (e) { console.error('[Fire-Sync] Init error:', e); }

const CITY_STATE_MAP = {
    // Gujarat Cities
    "Ahmedabad": "Gujarat", "Surat": "Gujarat", "Vadodara": "Gujarat", "Rajkot": "Gujarat", "Bhavnagar": "Gujarat",
    "Jamnagar": "Gujarat", "Gandhinagar": "Gujarat", "Junagadh": "Gujarat", "Anand": "Gujarat", "Navsari": "Gujarat",
    "Morbi": "Gujarat", "Nadiad": "Gujarat", "Surendranagar": "Gujarat", "Bharuch": "Gujarat", "Vapi": "Gujarat",
    "Bhuj": "Gujarat", "Porbandar": "Gujarat", "Palanpur": "Gujarat", "Valsad": "Gujarat", "Godhra": "Gujarat",
    "Patan": "Gujarat", "Amreli": "Gujarat", "Deesa": "Gujarat",
    // Major Indian Metros and Cities
    "Mumbai": "Maharashtra", "Delhi": "Delhi", "Bangalore": "Karnataka", "Hyderabad": "Telangana",
    "Chennai": "Tamil Nadu", "Kolkata": "West Bengal", "Pune": "Maharashtra", "Jaipur": "Rajasthan",
    "Lucknow": "Uttar Pradesh", "Kanpur": "Uttar Pradesh", "Nagpur": "Maharashtra", "Indore": "Madhya Pradesh",
    "Thane": "Maharashtra", "Bhopal": "Madhya Pradesh", "Visakhapatnam": "Andhra Pradesh", "Patna": "Bihar",
    "Ludhiana": "Punjab", "Agra": "Uttar Pradesh", "Nashik": "Maharashtra", "Faridabad": "Haryana",
    "Meerut": "Uttar Pradesh", "Varanasi": "Uttar Pradesh", "Srinagar": "Jammu and Kashmir", "Aurangabad": "Maharashtra",
    "Amritsar": "Punjab", "Allahabad": "Uttar Pradesh", "Ranchi": "Jharkhand", "Coimbatore": "Tamil Nadu",
    "Jabalpur": "Madhya Pradesh", "Gwalior": "Madhya Pradesh", "Vijayawada": "Andhra Pradesh", "Jodhpur": "Rajasthan",
    "Madurai": "Tamil Nadu", "Raipur": "Chhattisgarh", "Kota": "Rajasthan", "Guwahati": "Assam", "Chandigarh": "Chandigarh",
    "Solapur": "Maharashtra", "Tiruchirappalli": "Tamil Nadu", "Jalandhar": "Punjab", "Bhubaneswar": "Odisha"
};

class ArtStudioCRM {
    constructor() {
        this.currentUser = null;
        this.followUps = [];
        this.clients = [];
        this.teamMembers = [];
        this.students = [];
        this.passwords = {};
        this.paymentReminders = [];
        this.currentAssignTaskId = null;
        this.confirmCallback = null;
        this.searchQuery = '';
        this.dashboardFilter = 'All';
        this.followUpTab = 'Active';
        this.initTime = Date.now();
        this.acceptedNotifications = JSON.parse(localStorage.getItem('artis_accepted_notifs')) || [];
        this.notificationQueue = [];
        this.isShowingNotification = false;
        this.config = JSON.parse(localStorage.getItem('artis_crm_config')) || {
            studioName: 'Artis Studio Co.',
            email: 'admin@artis.com',
            currency: 'INR'
        };
        this.init();
    }

    setDashboardFilter(filter) {
        this.dashboardFilter = filter;
        this.renderFollowUpsPreview();
    }

    setFollowUpTab(tab) {
        this.followUpTab = tab;
        const activeBtn = document.getElementById('tab-active-fw');
        const completedBtn = document.getElementById('tab-completed-fw');

        if (activeBtn) {
            activeBtn.className = tab === 'Active' ? 'btn-primary' : 'btn-secondary';
            activeBtn.style.background = tab === 'Active' ? 'var(--primary)' : 'transparent';
            activeBtn.style.color = tab === 'Active' ? '#fff' : 'var(--text-light)';
            activeBtn.style.border = tab === 'Active' ? 'none' : '1px solid var(--glass-border)';
            activeBtn.style.boxShadow = tab === 'Active' ? 'none' : 'none';
        }
        if (completedBtn) {
            completedBtn.className = tab === 'Completed' ? 'btn-primary' : 'btn-secondary';
            completedBtn.style.background = tab === 'Completed' ? 'var(--primary)' : 'transparent';
            completedBtn.style.color = tab === 'Completed' ? '#fff' : 'var(--text-light)';
            completedBtn.style.border = tab === 'Completed' ? 'none' : '1px solid var(--glass-border)';
            completedBtn.style.boxShadow = tab === 'Completed' ? 'none' : 'none';
        }
        this.renderFollowUpsFull();
    }

    init() {
        this.populateCityDropdown();
        this.loadData();
        this.checkAuth();
        this.setupEventListeners();
        this.setupSliderDrag();

        // Setup Firebase Real-time cross-device notifications
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        // Cross-Tab Fallback Notification Listener
        window.addEventListener('storage', (e) => {
            if (e.key === 'artis_crm_notify' && e.newValue) {
                const data = JSON.parse(e.newValue);
                if (data && this.currentUser && data.sender !== this.currentUser) {
                    const fallbackId = 'local_' + data.timestamp;
                    if (!this.acceptedNotifications.includes(fallbackId)) {
                        this.processNotificationData(data, fallbackId);
                    }
                }
            }
        });

        // Initialize Intl-Tel-Input wrapper logic
        const itiOptions = {
            initialCountry: "in",
            separateDialCode: true,
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
        };
        const fContact = document.querySelector("#f-contact");
        if (fContact) this.fIti = window.intlTelInput(fContact, itiOptions);

        const tPhone = document.querySelector("#t-phone");
        if (tPhone) this.tIti = window.intlTelInput(tPhone, itiOptions);

        // Restore theme
        const savedTheme = localStorage.getItem('artis_crm_theme') || 'dark';
        this.switchTheme(savedTheme);

        // Update the radio buttons to reflect the current theme
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        themeRadios.forEach(r => {
            if (r.value === savedTheme) r.checked = true;
        });

        this.applyConfig();
        this.startGlobalSync();
    }

    populateCityDropdown() {
        const select = document.getElementById('f-location');
        if (!select) return;

        select.innerHTML = '<option value="" disabled selected>Select City</option>';
        const cities = Object.keys(CITY_STATE_MAP).sort();
        cities.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city;
            opt.textContent = city;
            select.appendChild(opt);
        });
    }

    updateState() {
        const city = document.getElementById('f-location').value;
        const stateInput = document.getElementById('f-state');
        if (stateInput && city && CITY_STATE_MAP[city]) {
            stateInput.value = CITY_STATE_MAP[city];
        } else if (stateInput) {
            stateInput.value = '';
        }
    }

    startGlobalSync() {
        if (!db) return;
        
        // Listen for all records changes
        db.ref('studio_records').on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            console.debug(`[Fire-Sync] Sync Received from ${data.syncBy} (Session: ${data.sessionID || 'legacy'})`);
            
            // Avoid syncing back our own changes
            if (data.sessionID === sessionID) {
                return;
            }
            
            let updated = false;
            
            if (data.followUps && JSON.stringify(data.followUps) !== JSON.stringify(this.followUps)) {
                this.followUps = data.followUps;
                localStorage.setItem('artis_crm_data', JSON.stringify(this.followUps));
                updated = true;
            }
            
            if (data.clients && JSON.stringify(data.clients) !== JSON.stringify(this.clients)) {
                this.clients = data.clients;
                localStorage.setItem('artis_crm_clients', JSON.stringify(this.clients));
                updated = true;
            }
            
            if (data.teamMembers && JSON.stringify(data.teamMembers) !== JSON.stringify(this.teamMembers)) {
                this.teamMembers = data.teamMembers;
                localStorage.setItem('artis_crm_team', JSON.stringify(this.teamMembers));
                updated = true;
            }
            
            if (data.students && JSON.stringify(data.students) !== JSON.stringify(this.students)) {
                this.students = data.students;
                localStorage.setItem('artis_crm_students', JSON.stringify(this.students));
                updated = true;
            }
            
            if (data.config && JSON.stringify(data.config) !== JSON.stringify(this.config)) {
                this.config = data.config;
                localStorage.setItem('artis_crm_config', JSON.stringify(this.config));
                this.applyConfig();
                updated = true;
            }
            
            if (data.passwords && JSON.stringify(data.passwords) !== JSON.stringify(this.passwords)) {
                this.passwords = data.passwords;
                localStorage.setItem('artis_crm_passwords', JSON.stringify(this.passwords));
                updated = true;
            }

            if (updated) {
                console.debug('[sync] UI Refresh triggered by sync');
                const activePage = document.querySelector('.page-section.section-active');
                if (activePage) this.navigate(activePage.id.replace('page-', ''));
            }
        });
    }

    pushToFirebase() {
        if (!db || !this.currentUser) return;
        
        // Prevent rapid duplicate syncs
        const now = Date.now();
        if (this.lastPush && (now - this.lastPush) < 500) return;
        this.lastPush = now;

        const payload = {
            followUps: this.followUps,
            clients: this.clients,
            teamMembers: this.teamMembers,
            students: this.students,
            config: this.config,
            passwords: this.passwords,
            lastSync: now,
            syncBy: this.currentUser,
            sessionID: sessionID
        };
        
        console.debug('[Fire-Sync] Pushing local data to Cloud...', { role: this.currentUser });
        db.ref('studio_records').set(payload).then(() => {
            console.debug('[Fire-Sync] Cloud sync successful');
        }).catch(e => {
            console.error('[Fire-Sync] Cloud sync failed (Check Table Rules):', e);
        });
    }

    applyConfig() {
        const studioBadge = document.getElementById('logo-sidebar');
        // If we had a studio name text in header, we'd update it here.
        // For now, let's update the inputs on the settings page if it's active
        const nameInput = document.getElementById('conf-studio-name');
        const emailInput = document.getElementById('conf-studio-email');
        const currInput = document.getElementById('conf-studio-currency');
        
        if (nameInput) nameInput.value = this.config.studioName;
        if (emailInput) emailInput.value = this.config.email;
        if (currInput) currInput.value = this.config.currency;
        
        // Update welcome message or other UI elements if needed
        const welcome = document.getElementById('welcome-message');
        if (welcome && this.currentUser) {
            welcome.textContent = `Welcome to ${this.config.studioName}, ${this.currentUser}`;
        }
    }

    saveProfileSettings() {
        if (!['Owner', 'Manager'].includes(this.currentUser)) {
            this.showAlert('Access Denied', 'Permission Required');
            return;
        }
        
        this.config = {
            studioName: document.getElementById('conf-studio-name').value.trim(),
            email: document.getElementById('conf-studio-email').value.trim(),
            currency: document.getElementById('conf-studio-currency').value
        };
        
        localStorage.setItem('artis_crm_config', JSON.stringify(this.config));
        this.pushToFirebase();
        this.applyConfig();
        this.showAlert('Profile settings saved and synced!', 'Success');
    }

    startNotificationListener() {
        if (!db) return;
        if (this.notificationListenerStarted) return;
        this.notificationListenerStarted = true;

        try {
            db.ref('studio_notifications').limitToLast(50).on('child_added', (snapshot) => {
                const data = snapshot.val();
                const notifId = snapshot.key;
                console.debug('[notif] onChildAdded received', { notifId, data, currentUser: this.currentUser });
                if (data && !data.globalAccepted && data.sender !== this.currentUser && !this.acceptedNotifications.includes(notifId)) {
                    this.processNotificationData(data, notifId);
                }
            });
        } catch (e) {
            console.log("Firebase RTDB listener failed bounds", e);
        }
    }

    processNotificationData(data, notifId) {
        console.debug('[notif] processNotificationData called', { notifId, data, currentUser: this.currentUser });
        let shouldNotify = false;
        if (!data.target || data.target === 'All') {
            shouldNotify = true;
        } else if (data.target.startsWith('Manager') && this.currentUser === 'Manager') {
            shouldNotify = true;
        } else if (data.target.startsWith('Team') && this.currentUser === 'Team') {
            shouldNotify = true;
        } else if (data.target.startsWith('Owner') && this.currentUser === 'Owner') {
            shouldNotify = true;
        }

        if (shouldNotify) {
            this.triggerPersistentNotification(data, notifId);
        } else {
            console.debug('[notif] filtered out notification for current role', { notifId, data, currentUser: this.currentUser });
        }
    }

    triggerHardwareNotification(title, message) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, {
                body: message,
                icon: 'https://res.cloudinary.com/dzgc4sghz/image/upload/v1773142856/logo_white_c01abm.png'
            });
        } else {
            this.showAlert(message, title);
        }
    }

    // Enqueue the full notification payload so accept handlers can act on metadata (action, taskId, etc.)
    triggerPersistentNotification(data, notifId) {
        if (!data) return;
        console.debug('[notif] triggerPersistentNotification', { notifId, data });
        if ("Notification" in window && Notification.permission === "granted") {
            try {
                new Notification(data.title, {
                    body: data.message,
                    icon: 'https://res.cloudinary.com/dzgc4sghz/image/upload/v1773142856/logo_white_c01abm.png'
                });
            } catch (e) { console.debug('[notif] system notification failed', e); }
        }

        const entry = Object.assign({}, data, { id: notifId });
        this.notificationQueue.push(entry);
        if (!this.isShowingNotification) {
            this.showNextNotification();
        }
    }

    showNextNotification() {
        if (this.notificationQueue.length === 0) {
            this.isShowingNotification = false;
            const notifModal = document.getElementById('persistent-notification');
            if (notifModal) notifModal.classList.remove('active');
            return;
        }
        this.isShowingNotification = true;
        const nextNotif = this.notificationQueue[0];
        console.debug('[notif] showing next notification', nextNotif);
        const notifModal = document.getElementById('persistent-notification');
        if (notifModal) {
            const titleEl = document.getElementById('pn-title');
            const msgEl = document.getElementById('pn-msg');
            if (titleEl) titleEl.innerHTML = nextNotif.title || nextNotif.message || 'Notification';
            if (msgEl) msgEl.textContent = nextNotif.message || '';
            notifModal.classList.add('active');
        }
    }

    acceptNotification() {
        if (this.notificationQueue.length === 0) return this.showNextNotification();

        const current = this.notificationQueue.shift();

        // If this notification is an assignment request, and includes a taskId, mark assignment accepted
        if (current && (current.action === 'assign' || (current.metadata && current.metadata.action === 'assign')) && (current.taskId || (current.metadata && current.metadata.taskId))) {
            const taskId = current.taskId || (current.metadata && current.metadata.taskId);
            const item = this.followUps.find(f => f.id === taskId);
            if (item) {
                // mark assign accepted and progress status where appropriate
                item.assignAccepted = true;
                if (item.status === 'Pending' || !item.status) item.status = 'In Progress';
                this.saveData();
                this.renderStats();
                this.renderFollowUpsPreview();
                this.renderFollowUpsFull();

                // Notify owner that assignee accepted
                const ownerTarget = 'Owner';
                this.sendGlobalNotification('Assignment Accepted ✅', `${this.currentUser} accepted assignment for ${item.client}`, ownerTarget, { action: 'assignAccepted', taskId: item.id, by: this.currentUser });
            }
        }

        // Persist that this notification was accepted so we don't show again
        if (current && current.id) {
            this.acceptedNotifications.push(current.id);
            if (this.acceptedNotifications.length > 200) {
                this.acceptedNotifications.splice(0, this.acceptedNotifications.length - 100);
            }
            localStorage.setItem('artis_accepted_notifs', JSON.stringify(this.acceptedNotifications));

            if (db && !current.id.startsWith('local_')) {
                try {
                    db.ref('studio_notifications/' + current.id).update({ globalAccepted: true });
                } catch (e) { console.debug('Failed to global accept notif', e); }
            }
        }

        this.showNextNotification();

        // If UI rendering was paused waiting for notification acceptance, resume now
        if (this.pendingUIResumeCallback && this.notificationQueue.length === 0) {
            try {
                const cb = this.pendingUIResumeCallback;
                this.pendingUIResumeCallback = null;
                cb();
            } catch (e) { console.debug('resume callback failed', e); }
        }
    }

    // When a user logs in / opens dashboard, check for any pending notifications
    // targeted to their role and show them before proceeding with normal UI.
    processPendingNotificationsOnLoad() {
        try {
            // If notifications already queued (from RTDB listener), show them now and pause UI
            if (this.notificationQueue && this.notificationQueue.length > 0) {
                this.pendingUIResumeCallback = () => { /* caller will navigate when ready */ };
                this.showNextNotification();
                return true;
            }

            // Check localStorage fallback single-entry
            const raw = localStorage.getItem('artis_crm_notify');
            if (raw) {
                let payload = null;
                try { payload = JSON.parse(raw); } catch (e) { payload = null; }
                if (payload) {
                    // create a stable id for this local payload
                    const localId = 'local_load_' + (payload.timestamp || Date.now());
                    if (!this.acceptedNotifications.includes(localId)) {
                        // Only process if targeted to this role
                        const target = payload.target || 'All';
                        let shouldNotify = false;
                        if (!target || target === 'All') shouldNotify = true;
                        else if (target.startsWith('Manager') && this.currentUser === 'Manager') shouldNotify = true;
                        else if (target.startsWith('Team') && this.currentUser === 'Team') shouldNotify = true;
                        else if (target.startsWith('Owner') && this.currentUser === 'Owner') shouldNotify = true;

                        if (shouldNotify) {
                            this.processNotificationData(payload, localId);
                            this.pendingUIResumeCallback = () => { /* caller will navigate when ready */ };
                            return true;
                        }
                    }
                }
            }
        } catch (e) { console.debug('processPendingNotificationsOnLoad failed', e); }
        return false;
    }

    // metadata is optional object, e.g. { action: 'assign', taskId: 123, assignTo: 'Manager: Amit' }
    sendGlobalNotification(title, message, targetRole = 'All', metadata = {}) {
        const payload = {
            title: title,
            message: message,
            sender: this.currentUser,
            target: targetRole,
            timestamp: Date.now(),
            metadata: metadata,
            // for backwards compatibility expose top-level action/taskId
            action: metadata.action || undefined,
            taskId: metadata.taskId || undefined,
            assignTo: metadata.assignTo || undefined
        };

        // Instant local cross-tab push (Failsafe)
        localStorage.setItem('artis_crm_notify', JSON.stringify(payload));

        if (!this.currentUser || !db) return;
        try {
            db.ref('studio_notifications').push(payload);
        } catch (e) {
            console.log("Firebase DB Push Failed", e);
        }
    }

    // quick helper for testing notifications locally
    sendTestNotification() {
        const demoTaskId = (this.followUps && this.followUps.length) ? this.followUps[0].id : Date.now();
        const demoAssign = 'Manager';
        const payload = {
            title: 'Test Assignment 🔔',
            message: `Test assign to ${demoAssign} (task ${demoTaskId}). Click Accept to simulate acceptance.`,
            sender: this.currentUser || 'LocalTest',
            target: demoAssign,
            timestamp: Date.now(),
            metadata: { action: 'assign', taskId: demoTaskId, assignTo: demoAssign },
            action: 'assign',
            taskId: demoTaskId
        };

        // Push to local UI immediately and to localStorage fallback
        this.triggerPersistentNotification(payload, 'local_test_' + Date.now());
        try { localStorage.setItem('artis_crm_notify', JSON.stringify(payload)); } catch (e) { console.debug('localStorage write failed', e); }
    }

    triggerWhatsApp(assignString, clientName, style) {
        let phoneNum = '';
        let targetName = '';
        if (assignString === 'Manager') {
            const manager = this.teamMembers.find(t => t.role === 'Manager');
            if (manager && manager.phone) {
                phoneNum = manager.phone;
                targetName = manager.name;
            }
        } else if (assignString.startsWith('Team:')) {
            const tName = assignString.split(':')[1].trim();
            const tm = this.teamMembers.find(t => t.name === tName);
            if (tm && tm.phone) {
                phoneNum = tm.phone;
                targetName = tm.name;
            }
        }

        if (phoneNum) {
            const waNum = phoneNum.replace(/[^0-9]/g, '');
            if (waNum.length >= 10) {
                const msg = `Hello ${targetName} ✨\nYou have been explicitly assigned a new project: *${clientName}*.\nArt Style: ${style}\n\nPlease login to the Studio CRM to view updates.`;
                window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
            }
        }
    }

    loadData() {
        const CURRENT_VERSION = '1.0.0';
        const isInitialized = localStorage.getItem('crm_initialized');
        const currentVersion = localStorage.getItem('crm_version');

        // First-Time Load Reset Logic & Version-Based Reset
        if (!isInitialized || currentVersion !== CURRENT_VERSION) {
            localStorage.clear();
            localStorage.setItem('crm_initialized', 'true');
            localStorage.setItem('crm_version', CURRENT_VERSION);
        }

        // Load from localStorage if available, otherwise initialize as empty array
        this.clients = JSON.parse(localStorage.getItem('artis_crm_clients')) || [];
        this.paymentReminders = JSON.parse(localStorage.getItem('artis_crm_reminders')) || [];
        this.followUps = JSON.parse(localStorage.getItem('artis_crm_data')) || [];
        this.teamMembers = JSON.parse(localStorage.getItem('artis_crm_team')) || [];
        this.students = JSON.parse(localStorage.getItem('artis_crm_students')) || [];

        // Legacy auto-population for clients based on followUps (if imported)
        if (this.clients.length === 0 && this.followUps.length > 0) {
            let cMap = {};
            this.followUps.forEach(f => {
                if (!f.client) return;
                const key = f.client.trim().toLowerCase();
                if (!cMap[key]) {
                    cMap[key] = {
                        id: Date.now() + Math.random(),
                        name: f.client,
                        contact: f.contact || '-',
                        location: f.location ? (f.state ? `${f.location}, ${f.state}` : f.location) : '-'
                    };
                }
            });
            this.clients = Object.values(cMap);
            this.saveClientsData();
        }

        // Passwords logic must retain default credentials
        const storedPass = localStorage.getItem('artis_crm_passwords');
        this.passwords = storedPass ? JSON.parse(storedPass) : { Owner: 'Owner@123', Manager: 'Manager@123' };
        if (!storedPass) {
            localStorage.setItem('artis_crm_passwords', JSON.stringify(this.passwords));
        }
    }

    saveData() {
        localStorage.setItem('artis_crm_data', JSON.stringify(this.followUps));
        this.pushToFirebase();
    }

    saveClientsData() {
        localStorage.setItem('artis_crm_clients', JSON.stringify(this.clients));
        this.pushToFirebase();
    }

    saveTeamData() {
        localStorage.setItem('artis_crm_team', JSON.stringify(this.teamMembers));
        this.pushToFirebase();
    }

    saveStudentsData() {
        localStorage.setItem('artis_crm_students', JSON.stringify(this.students));
        this.pushToFirebase();
    }

    savePasswords() {
        localStorage.setItem('artis_crm_passwords', JSON.stringify(this.passwords));
        this.pushToFirebase();
    }

    checkAuth() {
        const storedRole = sessionStorage.getItem('artis_crm_role');
        if (storedRole && ['Owner', 'Manager', 'Team'].includes(storedRole)) {
            this.currentUser = storedRole;
            // Start the notification listener first so cross-device messages arrive early
            this.startNotificationListener();
            // Show dashboard but process pending notifications first (may pause UI until accepted)
            this.showDashboard();
        } else {
            this.showLogin();
        }
    }

    login(role) {
        this.currentUser = role;
        sessionStorage.setItem('artis_crm_role', role);
        // ensure notifications listener is active before showing dashboard
        this.startNotificationListener();
        this.showDashboard();
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('artis_crm_role');
        window.location.reload();
    }

    downloadBackupCSV() {
        let csvContent = "";
        
        // FollowUps (Clients/Projects)
        csvContent += "=== CLIENTS / PROJECTS ===\n";
        csvContent += "ID,Client,Contact,Location,Style,Size,Total,Advance,Remaining,Status,Stage,Date,Assign\n";
        this.followUps.forEach(f => {
            csvContent += `${f.id},"${f.client || ''}","${f.contact || ''}","${f.location || ''}","${f.style || ''}","${f.size || ''}",${f.total || 0},${f.advance || 0},${f.remaining || 0},"${f.status || ''}","${f.stage || ''}","${f.date || ''}","${f.assign || ''}"\n`;
        });
        
        // Students
        csvContent += "\n=== STUDENTS ===\n";
        csvContent += "ID,Name,Phone,Course,Location,Admission Date,Monthly Fee,Charged Fee,Contract/Note\n";
        this.students.forEach(s => {
            csvContent += `${s.id},"${s.name || ''}","${s.phone || ''}","${s.course || ''}","${s.location || ''}","${s.date || ''}",${s.monthly_fee || 0},${s.chargedFee || 0},"${s.contract || ''}"\n`;
        });

        // Team Members
        csvContent += "\n=== EMPLOYEES / TEAM ===\n";
        csvContent += "ID,Name,Role,Phone,Base Salary,Paid Salary,Remaining,Note\n";
        this.teamMembers.forEach(m => {
            const base = m.baseSalary || 0;
            const paid = m.paidSalary || 0;
            csvContent += `${m.id},"${m.name || ''}","${m.role || ''}","${m.phone || ''}",${base},${paid},${base - paid},"${m.salaryNote || ''}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `ArtStudio_CRM_Backup_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showLogin() {
        document.getElementById('dashboard-view').classList.remove('active');
        document.getElementById('login-view').classList.add('active');
        this.backToRoles();
    }


    // ==========================================
    // Monthly Auto-Reset Logic (Real-time 30-day)
    // ==========================================
    checkMonthlyReset() {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
        const lastResetKey = localStorage.getItem('artis_salary_reset_month');

        if (lastResetKey !== currentMonthKey) {
            // New month detected — reset all employee paid salaries
            this.teamMembers.forEach(m => {
                m.prevPaidSalary = m.paidSalary || 0; // archive last month
                m.paidSalary = 0;
                m.salaryNote = '';
            });
            this.saveTeamData();

            this.students.forEach(s => {
                s.prevChargedFee = s.chargedFee || 0;
                s.chargedFee = 0;
                s.feeNote = '';
            });
            this.saveStudentsData();

            localStorage.setItem('artis_salary_reset_month', currentMonthKey);
            console.log('[CRM] Monthly salary and fee reset applied for:', currentMonthKey);
        }
    }

    showDashboard() {
        document.getElementById('login-view').classList.remove('active');
        document.getElementById('dashboard-view').classList.add('active');

        this.checkMonthlyReset();
        document.getElementById('user-role-badge').textContent = this.currentUser;
        document.getElementById('welcome-message').textContent = `Welcome, ${this.currentUser}`;

        const mgmtLinks = document.querySelectorAll('.restricted.mgmt');
        const ownerLinks = document.querySelectorAll('.restricted.owner-only');
        const ownerManagerLinks = document.querySelectorAll('.restricted.owner-manager');
        const passBlock = document.getElementById('settings-password-block');

        if (this.currentUser === 'Team') {
            mgmtLinks.forEach(el => el.style.display = 'none');
            ownerLinks.forEach(el => el.style.display = 'none');
            ownerManagerLinks.forEach(el => el.style.display = 'none');
            if (passBlock) passBlock.style.display = 'none';
        } else if (this.currentUser === 'Manager') {
            mgmtLinks.forEach(el => el.style.display = 'flex');
            ownerLinks.forEach(el => el.style.display = 'none');
            ownerManagerLinks.forEach(el => el.style.display = 'flex');
            if (passBlock) passBlock.style.display = 'block';
        } else {
            mgmtLinks.forEach(el => el.style.display = 'flex');
            ownerLinks.forEach(el => el.style.display = 'flex');
            ownerManagerLinks.forEach(el => el.style.display = 'flex');
            if (passBlock) passBlock.style.display = 'block';
        }

        // Before actually navigating, check for any pending notifications targeted to this user
        this.updateReminderBadge();
        const resumeNavigation = () => { this.navigate('dashboard'); };
        const pendingShown = this.processPendingNotificationsOnLoad();
        if (pendingShown) {
            // If a notification was shown, resume navigation after it's accepted
            this.pendingUIResumeCallback = resumeNavigation;
        } else {
            resumeNavigation();
        }
    }

    navigate(pageId) {
        if (this.currentUser === 'Team' && (pageId === 'clients' || pageId === 'analytics' || pageId === 'team' || pageId === 'reminders' || pageId === 'employees')) {
            this.showAlert('You do not have permission to view this page.', 'Access Denied');
            return;
        }
        if (this.currentUser === 'Manager' && (pageId === 'team' || pageId === 'employees')) {
            this.showAlert('This page is restricted to Owner.', 'Access Denied');
            return;
        }

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (activeLink) activeLink.classList.add('active');

        document.querySelectorAll('.page-section').forEach(el => el.classList.remove('section-active'));
        document.getElementById(`page-${pageId}`).classList.add('section-active');

        if (pageId === 'dashboard') {
            this.renderStats();
            this.renderFollowUpsPreview();

        } else if (pageId === 'followups') {
            this.renderFollowUpsFull();
        } else if (pageId === 'team') {
            this.renderTeam();
        } else if (pageId === 'clients') {
            this.renderClients();
        } else if (pageId === 'analytics') {
            this.renderAnalytics();
        } else if (pageId === 'reminders') {
            this.renderReminders();
        } else if (pageId === 'students') {
            if (this.currentUser === 'Owner') {
                this.renderStudents();
            } else {
                this.showAlert('Access Denied. Owner only.', 'Locked');
            }
        } else if (pageId === 'employees') {
            this.renderEmployees();
        } else if (pageId === 'settings') {
            this.applyConfig();
            const passMsg = document.getElementById('pass-msg');
            if (passMsg) {
                passMsg.style.display = 'none';
                passMsg.className = 'error-text';
            }
            const passForm = document.getElementById('change-pass-form');
            if (passForm) passForm.reset();
        }
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();

        // Re-render currently active views
        const activePage = document.querySelector('.page-section.section-active');
        if (activePage) {
            const pId = activePage.id;
            if (pId === 'page-dashboard') {
                this.renderStats();
                this.renderFollowUpsPreview();

            } else if (pId === 'page-followups') {
                this.renderFollowUpsFull();
            } else if (pId === 'page-analytics') {
                this.renderAnalytics();
            } else if (pId === 'page-employees') {
                this.renderEmployees();
            }
        }
    }

    getRelevantFollowUps() {
        let baseList = this.followUps;

        if (this.currentUser === 'Team') {
            baseList = this.followUps.filter(f => f.assign === 'Team' || (f.assign && f.assign.startsWith('Team:')));
        }
        // Manager sees ALL follow-ups (same as Owner) so they can manage the full list

        if (this.searchQuery) {
            baseList = baseList.filter(f =>
                (f.client && f.client.toLowerCase().includes(this.searchQuery)) ||
                (f.desc && f.desc.toLowerCase().includes(this.searchQuery)) ||
                (f.contact && f.contact.toLowerCase().includes(this.searchQuery)) ||
                (f.style && f.style.toLowerCase().includes(this.searchQuery)) ||
                (f.status && f.status.toLowerCase().includes(this.searchQuery)) ||
                (f.stage && f.stage.toLowerCase().includes(this.searchQuery))
            );
        }

        return baseList;
    }

    renderStats() {
        let relevant = this.getRelevantFollowUps();
        const pending = relevant.filter(f => f.status === 'Pending').length;
        const complete = relevant.filter(f => f.status === 'Completed').length;

        document.getElementById('stat-total').textContent = relevant.length;
        document.getElementById('stat-pending').textContent = pending;
        document.getElementById('stat-completed').textContent = complete;
    }

    isAmountVisible() {
        return this.currentUser === 'Owner' || this.currentUser === 'Manager';
    }

    renderAnalytics() {
        // Use only non-completed, non-deleted follow-ups for total revenue
        const all = this.followUps || [];
        let totalRev = 0;
        let paymentsReceived = 0;
        let paymentsThisMonth = 0;
        const monthsSet = new Set();

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        all.forEach(item => {
            // Only count active (non-completed) items in total revenue
            const isActive = item.status !== 'Completed';
            const t = parseFloat(item.total) || 0;
            if (isActive) totalRev += t;

            // Sum payments history if present, otherwise fallback to advance as single payment on item.date
            if (Array.isArray(item.payments) && item.payments.length > 0) {
                item.payments.forEach(p => {
                    const amt = parseFloat(p.amount) || 0;
                    paymentsReceived += amt;
                    if (p.date) {
                        const d = new Date(p.date);
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        monthsSet.add(key);
                        if (d >= monthStart && d <= monthEnd) paymentsThisMonth += amt;
                    }
                });
            } else {
                // fallback: treat advance as received on follow-up date
                const a = parseFloat(item.advance) || 0;
                if (a > 0) {
                    paymentsReceived += a;
                    if (item.date) {
                        const d = new Date(item.date);
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        monthsSet.add(key);
                        if (d >= monthStart && d <= monthEnd) paymentsThisMonth += a;
                    }
                }
            }
        });

        const upcoming = totalRev - paymentsReceived;

        const elTotal = document.getElementById('analytics-total');
        if (elTotal) elTotal.textContent = this.isAmountVisible() ? `₹ ${totalRev.toLocaleString('en-IN')}` : '--';

        const elMonthly = document.getElementById('analytics-monthly');
        if (elMonthly) elMonthly.textContent = this.isAmountVisible() ? `₹ ${paymentsThisMonth.toLocaleString('en-IN')}` : '--';

        const elReceived = document.getElementById('analytics-received');
        if (elReceived) elReceived.textContent = this.isAmountVisible() ? `₹ ${paymentsReceived.toLocaleString('en-IN')}` : '--';

        const elUpcoming = document.getElementById('analytics-upcoming');
        if (elUpcoming) elUpcoming.textContent = this.isAmountVisible() ? `₹ ${upcoming.toLocaleString('en-IN')}` : '--';

        const elMonths = document.getElementById('analytics-months');
        if (elMonths) elMonths.textContent = this.isAmountVisible() ? `${monthsSet.size}` : '--';
    }

    renderFollowUpsPreview() {
        const container = document.getElementById('dashboard-followup-container');
        this.buildDashboardCards(container); // Traney panel mate common (Team card click unable to edit)
    }

    renderFollowUpsFull() {
        const container = document.getElementById('full-followup-container');
        this.buildFollowupHtml(container); // Everyone sees table here
    }

    renderClients() {
        const tbody = document.getElementById('clients-tbody');
        if (!tbody) return;

        if (this.clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No clients added yet. Clients will automatically generate from follow-ups or can be manually managed.</td></tr>`;
            return;
        }

        // Calculate dynamic specific metrics per client based on follow ups (only for display)
        let metricsMap = {};
        this.followUps.forEach(f => {
            if (!f.client) return;
            const key = f.client.trim().toLowerCase();
            if (!metricsMap[key]) metricsMap[key] = { projects: 0, revenue: 0 };
            metricsMap[key].projects++;
            metricsMap[key].revenue += (f.total || 0);
        });

        let html = '';
        this.clients.forEach(c => {
            const encName = encodeURIComponent(c.name);
            const encPhone = encodeURIComponent(c.contact);
            const key = c.name.toLowerCase().trim();
            const projs = metricsMap[key] ? metricsMap[key].projects : 0;
            const rev = metricsMap[key] ? metricsMap[key].revenue : 0;

            html += `
                <tr style="transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    <td style="font-weight: 600;">${c.name}</td>
                    <td>${c.contact}</td>
                    <td>${c.location}</td>
                    <td style="color: var(--primary); font-weight: 600;">${projs}</td>
                    <td style="color: var(--success); font-weight: 600;">${this.isAmountVisible() ? `₹${rev}` : '--'}</td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button class="btn-secondary" style="padding: 6px 12px; font-size: 13px; display: flex; align-items: center; gap: 5px;" onclick="app.notifyClient('${encName}', '${encPhone}')" title="Message Client">
                                <i class='bx bxl-whatsapp' style="font-size: 16px; color: #25d366;"></i> Notify
                            </button>
                            <button class="btn-secondary restricted owner-only" style="padding: 6px 12px; font-size: 13px; display: flex; align-items: center; gap: 5px; color: var(--danger); border-color: var(--danger);" onclick="app.deleteClient(${c.id})" title="Delete Client">
                                <i class='bx bx-trash'></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    deleteClient(id) {
        if (this.currentUser !== 'Owner') return;

        this.showConfirm('Are you sure you want to permanently delete this client? This will NOT delete their Follow-ups, but will remove them from the persistent Directory.', () => {
            this.clients = this.clients.filter(c => c.id !== id);
            this.saveClientsData();
            this.renderClients();
        }, 'Delete Client?');
    }

    notifyClient(encName, encPhone) {
        const name = decodeURIComponent(encName);
        const phone = decodeURIComponent(encPhone);

        if (!phone || phone === '-') {
            this.showAlert('No valid phone number found for this client. Please update their details in Follow-ups first.', 'Cannot Send WhatsApp');
            return;
        }

        const waNum = phone.replace(/[^0-9]/g, '');
        if (waNum.length < 10) {
            this.showAlert('The phone number is too short or invalid. It must have 10 digits.', 'Invalid Number');
            return;
        }

        const msg = `Hello ${name},\n\nWarm greetings from the Art Studio! ✨\nWe are reaching out regarding your artwork projects. Please let us know if you have any questions or require an update.`;
        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    buildDashboardCards(container) {
        // preserve horizontal scroll position (parent .card-horizontal-scroller)
        const parentScroller = container && container.parentElement ? container.parentElement : null;
        const prevScrollLeft = parentScroller ? parentScroller.scrollLeft : 0;

        container.innerHTML = '';
        let data = this.getRelevantFollowUps();

        if (this.dashboardFilter !== 'All') {
            data = data.filter(f => f.status === this.dashboardFilter);
        }

        data.sort((a, b) => {
            if (a.status === 'Completed' && b.status !== 'Completed') return 1;
            if (a.status !== 'Completed' && b.status === 'Completed') return -1;
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB;
        });

        if (data.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); padding: 20px;">No clients found.</p>`;
            if (parentScroller) parentScroller.scrollLeft = prevScrollLeft;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // If this is the dashboard preview container, render horizontal cards
        if (container.id === 'dashboard-followup-container') {
            let html = `<div class="dashboard-horizontal-cards">`;

            data.forEach((item, idx) => {
                let statusClass = 'pill-pending';
                if (item.status === 'In Progress') statusClass = 'pill-progress';
                if (item.status === 'Completed') statusClass = 'pill-completed';

                let urgencyColor = 'rgba(255,255,255,0.1)';
                let urgencyClass = '';
                if (item.status !== 'Completed' && item.date) {
                    const itemDate = new Date(item.date);
                    itemDate.setHours(0, 0, 0, 0);
                    const diffTime = itemDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    // Urgency thresholds: <=5 days -> red, <=10 -> orange, <=15 -> yellow
                    // Red color removed per request
                    if (diffDays <= 10) { urgencyColor = '#ff7a00'; urgencyClass = 'urgent-orange'; }
                    else if (diffDays <= 15) { urgencyColor = '#facc15'; urgencyClass = 'urgent-yellow'; }
                    console.debug('[urgency] item', item.id, 'date', item.date, 'diffDays', diffDays, 'class', urgencyClass);
                }

                let clickAttr = '';
                if (this.currentUser === 'Owner') clickAttr = `onclick="app.editModal(${item.id})" style="cursor: pointer;" title="Click to Edit"`;

                // Show a quick 'Mark Completed' button to Manager/Team when the task is assigned to them
                let completeBtnHtml = '';
                try {
                    const assignedRole = item.assign ? item.assign.split(':')[0].trim() : '';
                    if ((this.currentUser === 'Manager' || this.currentUser === 'Team') && item.status !== 'Completed' && assignedRole === this.currentUser) {
                        completeBtnHtml = `<button class="btn-quick complete" onclick="event.stopPropagation(); app.markCompleted(${item.id})" title="Mark Completed" style="background:var(--success); color:#000; padding:6px 10px; border-radius:6px; font-size:12px;">✓ Completed</button>`;
                    }
                } catch (e) { completeBtnHtml = ''; }

                const displayNumber = idx + 1;
                const numberBadge = (this.currentUser === 'Owner') ? `<div class="client-card-badge">${displayNumber}</div>` : '';

                html += `
                <div class="client-card ${urgencyClass}" ${clickAttr}>
                    <div class="client-card-topbar" style="background: ${urgencyColor}"></div>
                    ${numberBadge}
                    
                    <div style="font-size: 11px; font-weight: 600; color: var(--primary); margin-bottom: 4px; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px;" class="truncate-text">${item.style || 'Artwork Project'}</div>
                    <div style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 5px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${item.desc}">${item.desc || 'No Title Provided'}</div>
                    
                    <div style="color: var(--text-muted); font-size: 13px; margin-bottom: 4px; margin-top: 10px;"><i class='bx bx-user'></i> ${item.client || 'Unknown Client'}</div>
                    <div style="color: var(--text-muted); font-size: 12px; margin-bottom: 15px;"><i class='bx bx-phone'></i> ${item.contact || '-'}</div>
                    
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                            <span style="color: var(--text-muted);">Total</span>
                            <span style="color: var(--primary); font-weight: 500;">${this.isAmountVisible() ? `₹${item.total || 0}` : '--'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                            <span style="color: var(--text-muted);">Advance</span>
                            <span style="color: var(--success); font-weight: 500;">${this.isAmountVisible() ? `₹${item.advance || 0}` : '--'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 15px; border-bottom: 1px dotted rgba(255,255,255,0.1); padding-bottom: 8px;">
                            <span style="color: var(--text-muted);">Remaining</span>
                            <span style="color: var(--danger);">${this.isAmountVisible() ? `₹${item.remaining || 0}` : '--'}</span>
                        </div>
                        
                        <div style="font-size: 12px; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;">
                            <i class='bx bx-briefcase-alt-2' style="color: var(--text-muted);"></i> 
                            <span class="truncate-text">${item.stage || 'No stage'}</span>
                        </div>
                        <div style="font-size: 12px; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;">
                            <i class='bx bx-time-five' style="color: var(--text-muted);"></i> 
                            <span>Due: ${item.date}</span>
                        </div>
                        ${(item.status === 'Completed' && item.completedAt) ? (() => {
                        const cd = new Date(item.completedAt); cd.setHours(0, 0, 0, 0);
                        const dd = Math.floor((today.getTime() - cd.getTime()) / (1000 * 60 * 60 * 24));
                        const dc = dd > 30 ? 'var(--danger)' : dd > 7 ? '#ff7a00' : dd > 0 ? '#facc15' : 'var(--success)';
                        return `<div style="font-size:12px; margin-bottom:6px; display:flex; align-items:center; gap:5px;"><i class='bx bx-check-circle' style="color:${dc};"></i> <span style="color:${dc}; font-weight:600;">Completed ${dd}d ago</span></div>`;
                    })() : ''}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex; justify-content: space-between; align-items: center; gap:8px;">
                            <span style="display:flex; align-items:center; gap:8px;">
                                <span class="f-status-pill ${statusClass}" style="font-size: 10px;">${item.status}</span>
                                <span style="font-size: 11px; color: var(--text-muted);"><i class='bx bx-user-pin'></i> ${item.assign ? item.assign.split(':')[0] : 'Unassigned'}</span>
                            </span>
                            <span>${completeBtnHtml}</span>
                        </div>
                        ${(this.currentUser === 'Owner' && (item.remaining > 0)) ? `
                        <button onclick="event.stopPropagation(); app.sendPaymentReminder(${item.id})" title="Send WhatsApp Payment Reminder" style="background: linear-gradient(135deg,#25d366,#128c7e); color:#fff; padding:7px 10px; border-radius:8px; font-size:12px; display:flex; align-items:center; justify-content:center; gap:6px; width:100%; border:none; cursor:pointer; font-weight:600;">
                            <i class='bx bxl-whatsapp' style='font-size:15px;'></i> Send Payment Reminder
                        </button>` : ''}
                    </div>
                </div>
                `;
            });

            html += `</div>`;
            container.innerHTML = html;
            if (parentScroller) parentScroller.scrollLeft = prevScrollLeft;
            return;
        }

        // Fallback to original grid layout for other containers
        let gridHtml = `<div class="client-card-grid">`;

        data.forEach((item, idx) => {
            let statusClass = 'pill-pending';
            if (item.status === 'In Progress') statusClass = 'pill-progress';
            if (item.status === 'Completed') statusClass = 'pill-completed';

            let urgencyColor = 'rgba(255,255,255,0.1)';
            let urgencyClass = '';
            if (item.status !== 'Completed' && item.date) {
                const itemDate = new Date(item.date);
                itemDate.setHours(0, 0, 0, 0);
                const diffTime = itemDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Urgency thresholds: <=5 days -> red, <=10 -> orange, <=15 -> yellow
                // Red color removed per request
                if (diffDays <= 10) { urgencyColor = '#ff7a00'; urgencyClass = 'urgent-orange'; }
                else if (diffDays <= 15) { urgencyColor = '#facc15'; urgencyClass = 'urgent-yellow'; }
                console.debug('[urgency] item', item.id, 'date', item.date, 'diffDays', diffDays, 'class', urgencyClass);
            }

            let clickAttr = '';
            if (this.currentUser === 'Owner') clickAttr = `onclick="app.editModal(${item.id})" style="cursor: pointer;" title="Click to Edit"`;

            const displayNumber = idx + 1;
            const numberBadge = (this.currentUser === 'Owner') ? `<div class="client-card-badge">${displayNumber}</div>` : '';

            gridHtml += `
            <div class="client-card ${urgencyClass}" ${clickAttr}>
                <div class="client-card-topbar" style="background: ${urgencyColor}"></div>
                ${numberBadge}
                
                <div style="font-size: 11px; font-weight: 600; color: var(--primary); margin-bottom: 4px; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px;" class="truncate-text">${item.style || 'Artwork Project'}</div>
                <div style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 5px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${item.desc}">${item.desc || 'No Title Provided'}</div>
                
                <div style="color: var(--text-muted); font-size: 13px; margin-bottom: 4px; margin-top: 10px;"><i class='bx bx-user'></i> ${item.client || 'Unknown Client'}</div>
                <div style="color: var(--text-muted); font-size: 12px; margin-bottom: 15px;"><i class='bx bx-phone'></i> ${item.contact || '-'}</div>
                
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                        <span style="color: var(--text-muted);">Total</span>
                        <span style="color: var(--primary); font-weight: 500;">${this.isAmountVisible() ? `₹${item.total || 0}` : '--'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                        <span style="color: var(--text-muted);">Advance</span>
                        <span style="color: var(--success); font-weight: 500;">${this.isAmountVisible() ? `₹${item.advance || 0}` : '--'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 15px; border-bottom: 1px dotted rgba(255,255,255,0.1); padding-bottom: 8px;">
                        <span style="color: var(--text-muted);">Remaining</span>
                        <span style="color: var(--danger);">${this.isAmountVisible() ? `₹${item.remaining || 0}` : '--'}</span>
                    </div>
                    
                    <div style="font-size: 12px; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;">
                        <i class='bx bx-briefcase-alt-2' style="color: var(--text-muted);"></i> 
                        <span class="truncate-text">${item.stage || 'No stage'}</span>
                    </div>
                    <div style="font-size: 12px; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;">
                        <i class='bx bx-time-five' style="color: var(--text-muted);"></i> 
                        <span>Due: ${item.date}</span>
                    </div>
                    ${(item.status === 'Completed' && item.completedAt) ? (() => {
                    const cd = new Date(item.completedAt); cd.setHours(0, 0, 0, 0);
                    const dd = Math.floor((today.getTime() - cd.getTime()) / (1000 * 60 * 60 * 24));
                    const dc = dd > 30 ? 'var(--danger)' : dd > 7 ? '#ff7a00' : dd > 0 ? '#facc15' : 'var(--success)';
                    return `<div style="font-size:12px; margin-bottom:6px; display:flex; align-items:center; gap:5px;"><i class='bx bx-check-circle' style="color:${dc};"></i> <span style="color:${dc}; font-weight:600;">Completed ${dd}d ago</span></div>`;
                })() : ''}
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; justify-content: space-between; align-items: center; gap:8px;">
                        <span style="display:flex; align-items:center; gap:8px;">
                            <span class="f-status-pill ${statusClass}" style="font-size: 10px;">${item.status}</span>
                            <span style="font-size: 11px; color: var(--text-muted);"><i class='bx bx-user-pin'></i> ${item.assign ? item.assign.split(':')[0] : 'Unassigned'}</span>
                        </span>
                        <span>${(function () { try { const assignedRole = item.assign ? item.assign.split(':')[0].trim() : ''; if ((this.currentUser === 'Manager' || this.currentUser === 'Team') && item.status !== 'Completed' && assignedRole === this.currentUser) { return `<button class="btn-quick complete" onclick="event.stopPropagation(); app.markCompleted(${item.id})" title="Mark Completed" style="background:var(--success); color:#000; padding:6px 10px; border-radius:6px; font-size:12px;">✓ Completed</button>`; } } catch (e) { } return ''; }).call(this)}</span>
                    </div>
                    ${(this.currentUser === 'Owner' && (item.remaining > 0)) ? `
                    <button onclick="event.stopPropagation(); app.sendPaymentReminder(${item.id})" title="Send WhatsApp Payment Reminder" style="background: linear-gradient(135deg,#25d366,#128c7e); color:#fff; padding:7px 10px; border-radius:8px; font-size:12px; display:flex; align-items:center; justify-content:center; gap:6px; width:100%; border:none; cursor:pointer; font-weight:600;">
                        <i class='bx bxl-whatsapp' style='font-size:15px;'></i> Send Payment Reminder
                    </button>` : ''}
                </div>
            </div>
            `;
        });

        gridHtml += `</div>`;
        container.innerHTML = gridHtml;
        if (parentScroller) parentScroller.scrollLeft = prevScrollLeft;
    }

    // Huge 13 Field Spreadsheet Table Render
    buildFollowupHtml(container, limit = null) {
        container.innerHTML = '';
        let data = this.getRelevantFollowUps();

        if (this.followUpTab === 'Active') {
            data = data.filter(f => f.status !== 'Completed');
            data.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateA - dateB;
            });
        } else if (this.followUpTab === 'Completed') {
            data = data.filter(f => f.status === 'Completed');
            data.sort((a, b) => {
                const dateA = new Date(a.completedAt || a.date);
                const dateB = new Date(b.completedAt || b.date);
                return dateB - dateA;
            });
        } else {
            data.sort((a, b) => {
                if (a.status === 'Completed' && b.status !== 'Completed') return 1;
                if (a.status !== 'Completed' && b.status === 'Completed') return -1;
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateA - dateB;
            });
        }

        if (limit) data = data.slice(0, limit);

        if (data.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); padding: 20px;">No follow-ups found.</p>`;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const showAmounts = this.currentUser === 'Owner' || this.currentUser === 'Manager';

        let tableHtml = `
            <div class="table-responsive">
                <table class="artis-table">
                    <thead>
                        <tr>
                            <th style="width: 8px; padding: 0 border: none;"></th>
                            <th style="width: 30px; text-align: center;">No.</th>
                            <th>Client Name</th>
                            <th>Contact No.</th>
                            <th>City, State</th>
                            <th>Art Style</th>
                            <th>Size</th>
                            ${showAmounts ? `<th>Project (₹)</th>
                            <th>Advance (₹)</th>
                            <th>Received (₹)</th>
                            <th>Remaining (₹)</th>` : ''}
                            <th>Deadline</th>
                            <th>Status</th>
                            <th style="white-space:nowrap;">Days Since<br>Completed</th>
                            <th>Stage</th>
                            <th>Stage Note</th>
                            <th>Assignee</th>
                            <th class="actions-cell">Actions</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let currentMonthKey = '';

        data.forEach((item, index) => {
            if (this.followUpTab === 'Completed' && item.completedAt) {
                const cd = new Date(item.completedAt);
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const monthKey = `${monthNames[cd.getMonth()]} ${cd.getFullYear()}`;
                if (monthKey !== currentMonthKey) {
                    currentMonthKey = monthKey;
                    tableHtml += `
                        <tr style="background: rgba(212, 175, 55, 0.1);">
                            <td colspan="100%" style="font-weight: 600; color: var(--primary); font-size: 13px; padding: 12px 15px;">
                                <i class='bx bx-calendar'></i> ${monthKey}
                            </td>
                        </tr>
                    `;
                }
            }

            let statusClass = 'pill-pending';
            if (item.status === 'In Progress') statusClass = 'pill-progress';
            if (item.status === 'Completed') statusClass = 'pill-completed';

            let urgencyColor = 'transparent';
            if (item.status !== 'Completed' && item.date) {
                const itemDate = new Date(item.date);
                itemDate.setHours(0, 0, 0, 0);
                const diffTime = itemDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Match dashboard thresholds: <=5 days -> red, <=10 -> orange, <=15 -> yellow
                // Red color removed per request
                if (diffDays <= 10) {
                    urgencyColor = '#ff7a00';
                } else if (diffDays <= 15) {
                    urgencyColor = '#facc15';
                }
                console.debug('[followups-urgency] item', item.id, 'diffDays', diffDays, 'color', urgencyColor);
            }

            let quickAssignHtml = '';
            if (this.currentUser === 'Owner') {
                // Owner layout handled in the template below
                quickAssignHtml = ''; 
            } else if (this.currentUser === 'Manager' || this.currentUser === 'Team') {
                try {
                    const assignedRole = item.assign ? item.assign.split(':')[0].trim() : '';
                    if (assignedRole === this.currentUser && item.status !== 'Completed') {
                        quickAssignHtml = `<button class="btn-quick complete" onclick="event.stopPropagation(); app.markCompleted(${item.id})" title="Mark Completed">✓ Completed</button>`;
                    }
                } catch (e) { quickAssignHtml = ''; }
            }

            let cardAttributes = '';
            // Make rows clickable for managers & owners only
            if (this.currentUser === 'Owner' || this.currentUser === 'Manager') {
                cardAttributes = `onclick="app.editModal(${item.id})" style="cursor: pointer;" title="Click to Edit"`;
            }

            // Calculate days since completed
            let daysSinceCompletedHtml = '-';
            if (item.status === 'Completed' && item.completedAt) {
                const completedDate = new Date(item.completedAt);
                completedDate.setHours(0, 0, 0, 0);
                const diffMs = today.getTime() - completedDate.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                let dayColor = 'var(--success)';
                let dayIcon = '🟢';
                if (diffDays > 30) { dayColor = 'var(--danger)'; dayIcon = '🔴'; }
                else if (diffDays > 7) { dayColor = '#ff7a00'; dayIcon = '🟠'; }
                else if (diffDays > 0) { dayColor = '#facc15'; dayIcon = '🟡'; }
                daysSinceCompletedHtml = `<span style="color:${dayColor}; font-weight:600; font-size:13px;">${dayIcon} ${diffDays}d ago</span>`;
            } else if (item.status === 'Completed') {
                daysSinceCompletedHtml = `<span style="color:var(--success); font-weight:600;">✓ Done</span>`;
            }

            // Payment reminder button (WhatsApp)
            let payReminderHtml = '';
            if (this.currentUser === 'Owner' && item.remaining > 0) {
                payReminderHtml = `<button class="btn-quick" onclick="event.stopPropagation(); app.sendPaymentReminder(${item.id})" title="Send WhatsApp Payment Reminder" style="background: linear-gradient(135deg,#25d366,#128c7e); color:#fff; padding:5px 9px; border-radius:6px; font-size:11px; display:flex; align-items:center; gap:4px; white-space:nowrap;"><i class='bx bxl-whatsapp' style='font-size:14px;'></i> Pay Reminder</button>`;
            }

            tableHtml += `
                <tr ${cardAttributes}>
                    <td style="background: ${urgencyColor}; width: 6px; padding: 0;"></td>
                    <td style="font-weight: bold; color: var(--text-muted); text-align: center;">${index + 1}</td>
                    <td style="font-weight: 600;">${item.client || '-'}</td>
                    <td>${item.contact || '-'}</td>
                    <td>${item.location || '-'}${item.state ? ', ' + item.state : ''}</td>
                    <td>${item.style || '-'}</td>
                    <td>${item.size || '-'}</td>
                    ${showAmounts ? (() => {
                    const received = Array.isArray(item.payments) && item.payments.length > 0
                        ? item.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
                        : (parseFloat(item.advance) || 0);
                    return `<td style="color: var(--primary); font-weight: 600;">₹${(item.total || 0).toLocaleString('en-IN')}</td>
                    <td style="color: #60a5fa; font-weight: 600;">₹${received.toLocaleString('en-IN')}</td>
                    <td style="color: var(--success);">₹${(item.advance || 0).toLocaleString('en-IN')}</td>
                    <td style="color: var(--danger);">₹${(item.remaining || 0).toLocaleString('en-IN')}</td>`;
                })() : ''}
                    <td>${item.date}</td>
                    <td><span class="f-status-pill ${statusClass}">${item.status}</span></td>
                    <td style="text-align: center;">${daysSinceCompletedHtml}</td>
                    <td style="font-weight: 500;">${item.stage || '-'}</td>
                    <td><div class="truncate-text" title="${item.stagenote}">${item.stagenote || '-'}</div></td>
                    <td><i class='bx bx-user-pin'></i> ${item.assign}</td>
                    <td>
                        <div style="display: flex; flex-direction: column; gap: 6px; width: max-content;">
                            <div style="display: flex; gap: 6px;">
                                ${this.currentUser === 'Owner' ? `
                                    <button class="btn-quick manager" onclick="event.stopPropagation(); app.openAssignModal(${item.id}, 'Manager')" title="Assign to Manager"><i class='bx bx-briefcase'></i> To Manager</button>
                                    <button class="btn-quick team" onclick="event.stopPropagation(); app.openAssignModal(${item.id}, 'Team')" title="Assign to Team"><i class='bx bx-paint'></i> To Team</button>
                                ` : quickAssignHtml}
                            </div>
                            <div style="display: flex; gap: 6px; align-items: center;">
                                ${payReminderHtml}
                                ${this.currentUser === 'Owner' ? `<button class="btn-icon" style="color: var(--danger); width: 28px; height: 28px; background: rgba(255,255,255,0.05); border-radius: 50%;" title="Delete" onclick="event.stopPropagation(); app.deleteFollowUp(${item.id})"><i class='bx bx-trash'></i></button>` : ''}
                            </div>
                        </div>
                    </td>
                    <td><div class="truncate-text" title="${item.desc}">${item.desc}</div></td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table></div>`;
        container.innerHTML = tableHtml;
    }

    sendPaymentReminder(taskId) {
        const item = this.followUps.find(f => f.id === taskId);
        if (!item) return;

        const phone = item.contact || '';
        if (!phone || phone === '-') {
            this.showAlert('No valid phone number found for this client. Please update their contact details first.', 'Cannot Send Reminder');
            return;
        }

        const waNum = phone.replace(/[^0-9]/g, '');
        if (waNum.length < 10) {
            this.showAlert('The phone number is too short or invalid. It must have at least 10 digits.', 'Invalid Number');
            return;
        }

        // Calculate days since completed
        let daysSinceNote = '';
        let daysSinceCount = null;
        if (item.completedAt) {
            const completedDate = new Date(item.completedAt);
            const today = new Date();
            const diffMs = today.getTime() - completedDate.getTime();
            daysSinceCount = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            daysSinceNote = `\n🗓️ Project completed ${daysSinceCount} day(s) ago.`;
        }

        const remaining = parseFloat(item.remaining) || 0;
        const total = parseFloat(item.total) || 0;
        const advance = parseFloat(item.advance) || 0;

        const msg =
            `Hello ${item.client} 🙏,

This is a friendly payment reminder from *Artis Studio*.

🎨 *Project Details:*
• Art Style: ${item.style || '-'}
• Size: ${item.size || '-'}
• Description: ${item.desc || '-'}${daysSinceNote}

💰 *Payment Summary:*
• Total Amount: ₹${total.toLocaleString('en-IN')}
• Advance Paid: ₹${advance.toLocaleString('en-IN')}
• *Remaining Due: ₹${remaining.toLocaleString('en-IN')}*

Kindly arrange the remaining payment at your earliest convenience. Thank you for choosing Artis Studio! 🌟`;

        // ── Log this reminder in the sent-reminders history ──
        const logEntry = {
            id: Date.now(),
            taskId: item.id,
            client: item.client,
            contact: item.contact,
            style: item.style || '-',
            size: item.size || '-',
            total: total,
            advance: advance,
            remaining: remaining,
            sentAt: new Date().toISOString(),
            sentBy: this.currentUser,
            daysSinceCompleted: daysSinceCount,
            projectStatus: item.status
        };
        if (!Array.isArray(this.paymentReminders)) this.paymentReminders = [];
        this.paymentReminders.unshift(logEntry); // newest first
        localStorage.setItem('artis_crm_reminders', JSON.stringify(this.paymentReminders));

        // Update badge count on sidebar
        this.updateReminderBadge();

        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
        this.showAlert(`Payment reminder sent to ${item.client} via WhatsApp! Logged under "Reminders Sent".`, 'Reminder Sent ✅');
    }

    updateReminderBadge() {
        const badge = document.getElementById('reminder-count-badge');
        if (badge) {
            badge.textContent = (this.paymentReminders || []).length;
            badge.style.display = (this.paymentReminders || []).length > 0 ? 'inline-flex' : 'none';
        }
    }

    clearReminderLog() {
        this.showConfirm('Are you sure you want to clear the entire payment reminder history? This cannot be undone.', () => {
            this.paymentReminders = [];
            localStorage.setItem('artis_crm_reminders', JSON.stringify([]));
            this.updateReminderBadge();
            this.renderReminders();
        }, 'Clear Reminder Log');
    }

    renderReminders() {
        const container = document.getElementById('reminders-content');
        if (!container) return;

        const reminders = this.paymentReminders || [];

        if (reminders.length === 0) {
            container.innerHTML = `
                <div class="glass" style="text-align: center; padding: 60px 20px; color: var(--text-muted); width: 100%; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="font-size: 60px; margin-bottom: 20px;">💬</div>
                    <h3 style="color: var(--text-light); margin-bottom: 10px;">No Reminders Sent Yet</h3>
                    <p style="font-size: 14px;">When you send a WhatsApp payment reminder from the Follow-ups page, it will appear here.</p>
                </div>
            `;
            return;
        }

        // Group by client name for summary
        const clientSummary = {};
        reminders.forEach(r => {
            const key = (r.client || '').toLowerCase().trim();
            if (!clientSummary[key]) clientSummary[key] = { name: r.client, count: 0, lastSent: r.sentAt, remaining: r.remaining, contact: r.contact };
            clientSummary[key].count++;
            // keep the latest sentAt
            if (r.sentAt > clientSummary[key].lastSent) clientSummary[key].lastSent = r.sentAt;
        });

        let html = `
            <div class="glass" style="padding: 20px; margin-bottom: 24px; border-left: 3px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h3 style="color: var(--primary); margin-bottom: 4px;">📊 Summary</h3>
                        <p style="color: var(--text-muted); font-size: 13px;">${reminders.length} reminder(s) sent to ${Object.keys(clientSummary).length} unique client(s)</p>
                    </div>
                    <button class="btn-secondary" onclick="app.clearReminderLog()" style="padding: 8px 16px; font-size: 13px; color: var(--danger); border-color: var(--danger);">
                        <i class='bx bx-trash'></i> Clear Log
                    </button>
                </div>
            </div>
        `;

        reminders.slice().reverse().forEach((r, idx) => {
            const sentDate = new Date(r.sentAt);
            const sentDateStr = sentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            const sentTimeStr = sentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            // How many times this client has been reminded
            const key = (r.client || '').toLowerCase().trim();
            const timesCount = clientSummary[key] ? clientSummary[key].count : 1;
            const timesHtml = timesCount > 1 ? `<span style="background: var(--warning); color: #000; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 700; margin-left: 6px;">${timesCount}x</span>` : '';

            const daysBadge = r.daysSinceCompleted !== null && r.daysSinceCompleted !== undefined
                ? `<span style="color: ${r.daysSinceCompleted > 30 ? 'var(--danger)' : r.daysSinceCompleted > 7 ? '#ff7a00' : '#facc15'}; font-weight: 600; font-size:12px;">${r.daysSinceCompleted}d</span>`
                : `<span style="color: var(--text-muted); font-size:12px;">-</span>`;

            const waNum = (r.contact || '').replace(/[^0-9]/g, '');
            const canResend = waNum.length >= 10;

            html += `
                <div class="client-card glass" style="border: 1px solid var(--glass-border); padding: 15px; border-radius: 12px; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h3 style="font-size: 15px; margin: 0; color: #fff; line-height: 1.2;">
                            <i class='bx bxl-whatsapp' style="color: #25d366; vertical-align: middle; margin-right: 4px;"></i>${r.client || '-'}${timesHtml}
                        </h3>
                    </div>
                    
                    <div style="font-size: 13px; color: var(--text-muted); display: flex; justify-content: space-between;">
                        <span><i class='bx bx-phone'></i> ${r.contact || '-'}</span>
                        <span class="badge" style="font-size:10px;">${r.sentBy || '-'}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; margin-top: 4px;">
                        <div>
                            <div style="color: var(--text-muted);">Total</div>
                            <div style="font-weight: 600; color: var(--primary);">₹${(r.total || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: var(--text-muted);">Remaining</div>
                            <div style="font-weight: 700; color: var(--danger);">₹${(r.remaining || 0).toLocaleString('en-IN')}</div>
                        </div>
                    </div>

                    <div style="font-size: 12px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 6px;">
                        <span style="color: var(--text-muted);"><i class='bx bx-time'></i> ${sentDateStr} ${sentTimeStr}</span>
                        ${daysBadge}
                    </div>

                    ${canResend ? `<button onclick="app.sendPaymentReminder(${r.taskId})" style="margin-top:auto; background: linear-gradient(135deg,#25d366,#128c7e); color:#fff; padding:8px 10px; border-radius:6px; font-size:12px; width: 100%; border:none; cursor:pointer; font-weight:600;"><i class='bx bx-paper-plane'></i> Resend</button>` : `<div style="margin-top:auto; background: rgba(255,255,255,0.05); text-align:center; padding:8px; border-radius:6px; color:var(--text-muted); font-size:12px;">No phone</div>`}
                </div>
            `;
        });
        container.innerHTML = html;
    }

    openAssignModal(taskId, roleFilter) {
        // Only Owner can assign
        if (this.currentUser !== 'Owner') return;

        this.currentAssignTaskId = taskId;
        const list = document.getElementById('assign-member-list');
        list.innerHTML = '';

        const members = this.teamMembers.filter(m => m.role === roleFilter);

        if (members.length === 0) {
            list.innerHTML = `<p style="color: var(--warning); font-size: 13px;">No specific ${roleFilter} members found in Team Directory.</p>`;
        } else {
            members.forEach(m => {
                const btn = document.createElement('button');
                btn.className = 'btn-secondary';
                btn.style.width = '100%';
                btn.style.textAlign = 'left';
                btn.style.padding = '12px 15px';
                btn.style.display = 'flex';
                btn.style.alignItems = 'center';
                btn.style.gap = '10px';
                btn.innerHTML = `<i class='bx ${roleFilter === 'Manager' ? 'bx-briefcase' : 'bx-paint'}'></i> ${m.name} <span class="badge" style="margin-left:auto">${m.role}</span>`;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.confirmQuickAssign(`${roleFilter}: ${m.name}`);
                };
                list.appendChild(btn);
            });
        }



        document.getElementById('assign-modal-title').textContent = `Assign to ${roleFilter}`;
        document.getElementById('assign-modal').classList.add('active');
    }

    closeAssignModal() {
        const modal = document.getElementById('assign-modal');
        if (modal) modal.classList.remove('active');
        this.currentAssignTaskId = null;
    }

    confirmQuickAssign(assignString) {
        if (this.currentAssignTaskId) {
            const item = this.followUps.find(f => f.id === this.currentAssignTaskId);
            if (item) {
                item.assign = assignString;
                // mark assignment as not yet accepted by assignee
                item.assignAccepted = false;
                this.saveData();

                // determine role target from assignString (e.g. 'Manager: Amit' -> 'Manager')
                let targetRole = 'All';
                if (assignString && assignString.indexOf(':') > -1) {
                    targetRole = assignString.split(':')[0].trim();
                } else if (assignString === 'Manager' || assignString === 'Team' || assignString === 'Owner') {
                    targetRole = assignString;
                }

                this.sendGlobalNotification('Task Assigned 📌', `${item.client}'s project was assigned to ${assignString}. Please accept to start work.`, targetRole, { action: 'assign', taskId: item.id, assignTo: assignString });
                if (this.currentUser === 'Owner') {
                    this.triggerWhatsApp(assignString, item.client, item.style);
                }
                this.renderStats();
                this.renderFollowUpsPreview();
                this.renderFollowUpsFull();
            }
        }
        this.closeAssignModal();
    }

    markCompleted(taskId) {
        const self = this;
        const item = this.followUps.find(f => f.id === taskId);
        if (!item) return;

        // Ask for confirmation before marking completed
        this.showConfirm(`Are you sure you want to mark the project for ${item.client} as Completed?`, () => {
            // Permission: Owner can mark anything; Manager/Team only if assigned to them
            const role = self.currentUser;
            const assignedRole = item.assign ? item.assign.split(':')[0].trim() : '';
            if (role === 'Manager' || role === 'Team') {
                if (assignedRole !== role) {
                    self.showAlert('This task is not assigned to you.', 'Not Assigned');
                    return;
                }
            }

            item.status = 'Completed';
            item.completedBy = self.currentUser;
            item.completedAt = new Date().toISOString();
            self.saveData();
            self.renderStats();
            self.renderFollowUpsPreview();
            self.renderFollowUpsFull();

            // Notify Owner about completion only when action performed by Manager/Team
            if (self.currentUser === 'Manager' || self.currentUser === 'Team') {
                self.sendGlobalNotification('Work Completed ✅', `${self.currentUser} marked project for ${item.client} as Completed.`, 'Owner', { action: 'completed', taskId: item.id, by: self.currentUser });
            }

            self.showAlert('Marked as Completed', 'Success');
        }, 'Confirm Completion');
    }

    populateAssignDropdown() {
        const select = document.getElementById('f-assign');
        if (!select) return;

        select.innerHTML = `
            <option value="Unassigned">Unassigned</option>
        `;

        this.teamMembers.forEach(m => {
            const opt = document.createElement('option');
            opt.value = `${m.role}: ${m.name}`;
            opt.textContent = `${m.role} - ${m.name}`;
            select.appendChild(opt);
        });
    }

    calculateRemaining() {
        const total = parseFloat(document.getElementById('f-total').value) || 0;
        const advance = parseFloat(document.getElementById('f-advance').value) || 0;
        document.getElementById('f-remaining').value = (total - advance);
    }

    renderPaymentsInModal(item) {
        const list = document.getElementById('payments-list');
        if (!list) return;
        list.innerHTML = '';

        const payments = Array.isArray(item.payments) ? item.payments.slice().reverse() : [];
        if (payments.length === 0) {
            list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">No payments recorded.</div>';
            return;
        }

        payments.forEach(p => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.fontSize = '13px';
            row.style.color = 'var(--text-light)';
            row.innerHTML = `<div style="color:var(--text-muted);">${p.note || 'Payment'}</div><div style="color:var(--primary);">₹${(parseFloat(p.amount) || 0).toLocaleString('en-IN')} <span style="color:var(--text-muted); font-size:12px; margin-left:8px">${p.date || ''}</span></div>`;
            list.appendChild(row);
        });
    }

    addPaymentFromModal() {
        const id = document.getElementById('f-id').value;
        if (!id) {
            this.showAlert('Please save the follow-up before adding payments.', 'Save First');
            return;
        }

        const amount = parseFloat(document.getElementById('p-amount').value) || 0;
        const date = document.getElementById('p-date').value || new Date().toISOString().split('T')[0];
        const note = document.getElementById('p-note').value.trim();

        if (amount <= 0) {
            this.showAlert('Enter a valid payment amount.', 'Invalid Amount');
            return;
        }

        const item = this.followUps.find(f => f.id === parseInt(id));
        if (!item) return;

        if (!Array.isArray(item.payments)) item.payments = [];
        item.payments.push({ amount: amount, date: date, note: note });

        // Update advance/remaining based on payments
        const prevAdvance = parseFloat(item.advance) || 0;
        item.advance = prevAdvance + amount;
        item.remaining = (parseFloat(item.total) || 0) - item.advance;

        this.saveData();
        this.renderPaymentsInModal(item);
        this.renderStats();
        this.renderFollowUpsPreview();
        this.renderFollowUpsFull();

        // Clear payment inputs
        document.getElementById('p-amount').value = '';
        document.getElementById('p-note').value = '';
        document.getElementById('p-date').value = '';
    }

    openModal() {
        // Owner and Manager can add/edit follow-ups
        if (this.currentUser !== 'Owner' && this.currentUser !== 'Manager') {
            this.showAlert('You do not have permission to add follow-ups.', 'Access Denied');
            return;
        }

        this.populateAssignDropdown();
        document.getElementById('f-id').value = '';
        document.getElementById('followup-form').reset();
        this.calculateRemaining();
        document.getElementById('modal-title').textContent = 'Add Follow-up';

        // Clear payments inputs/list for new follow-up
        const paymentsList = document.getElementById('payments-list');
        if (paymentsList) paymentsList.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">No payments recorded.</div>';
        const pdate = document.getElementById('p-date');
        if (pdate) pdate.value = new Date().toISOString().split('T')[0];

        // Set min date to today to prevent selecting past dates
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        document.getElementById('f-date').setAttribute('min', `${yyyy}-${mm}-${dd}`);

        document.getElementById('followup-modal').classList.add('active');
    }

    editModal(id) {
        // Owner and Manager can open the edit modal
        if (this.currentUser !== 'Owner' && this.currentUser !== 'Manager') {
            this.showAlert('You do not have permission to edit follow-ups.', 'Access Denied');
            return;
        }

        this.populateAssignDropdown();
        const item = this.followUps.find(f => f.id === id);
        if (!item) return;

        document.getElementById('f-id').value = item.id;
        document.getElementById('f-client').value = item.client;
        document.getElementById('f-contact').value = item.contact || '';
        if (this.fIti) {
            setTimeout(() => this.fIti.setNumber(item.contact || ''), 10);
        }
        document.getElementById('f-location').value = item.location || '';
        document.getElementById('f-state').value = item.state || '';
        this.updateState();
        document.getElementById('f-style').value = item.style || '';
        document.getElementById('f-size').value = item.size || '';
        document.getElementById('f-desc').value = item.desc || '';

        document.getElementById('f-total').value = item.total || 0;
        document.getElementById('f-advance').value = item.advance || 0;
        this.calculateRemaining(); // Pre-fill remaining visually

        // Set min date to today to prevent selecting past dates
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        document.getElementById('f-date').setAttribute('min', `${yyyy}-${mm}-${dd}`);

        document.getElementById('f-date').value = item.date;
        document.getElementById('f-status').value = item.status;
        document.getElementById('f-stage').value = item.stage || '';
        document.getElementById('f-stagenote').value = item.stagenote || '';

        const fAssign = document.getElementById('f-assign');
        fAssign.value = item.assign || 'Unassigned';

        // Render payments history into modal (if any)
        if (typeof this.renderPaymentsInModal === 'function') this.renderPaymentsInModal(item);

        document.getElementById('modal-title').textContent = 'Edit Follow-up';
        document.getElementById('followup-modal').classList.add('active');
    }

    closeModal() {
        document.getElementById('followup-modal').classList.remove('active');
    }

    saveFollowUp(e) {
        e.preventDefault();

        // Safe extraction of 13 fields
        const clientName = document.getElementById('f-client').value.trim();
        const contactRaw = document.getElementById('f-contact').value.trim();
        const contact = (this.fIti && this.fIti.getNumber()) ? this.fIti.getNumber() : contactRaw;
        const location = document.getElementById('f-location').value.trim();
        const state = document.getElementById('f-state').value.trim();
        const style = document.getElementById('f-style').value.trim();
        const size = document.getElementById('f-size').value.trim();
        const desc = document.getElementById('f-desc').value.trim();

        const total = parseFloat(document.getElementById('f-total').value) || 0;
        const advance = parseFloat(document.getElementById('f-advance').value) || 0;
        const remaining = total - advance;

        const date = document.getElementById('f-date').value;
        const status = document.getElementById('f-status').value;
        const stage = document.getElementById('f-stage').value.trim();
        const stagenote = document.getElementById('f-stagenote').value.trim();

        const assign = document.getElementById('f-assign').value;

        if (clientName.length < 3) {
            this.showAlert('Client Name must be at least 3 characters long.', 'Validation Error');
            return;
        }

        const phoneRegex = /^[0-9\s\+\-\(\)]{10,15}$/;
        if (contact && !phoneRegex.test(contact)) {
            this.showAlert('Please enter a valid Phone Number (10 to 15 digits).', 'Validation Error');
            return;
        }

        if (total < 0 || advance < 0) {
            this.showAlert('Amounts cannot be negative.', 'Validation Error');
            return;
        }

        if (advance > total) {
            this.showAlert('Advance amount cannot be greater than the Total Project Amount.', 'Validation Error');
            return;
        }

        if (!style) {
            this.showAlert('Please select an Art Style from the dropdown.', 'Validation Error');
            return;
        }

        if (assign === 'Unassigned' && status === 'In Progress') {
            this.showAlert('An In-Progress task cannot be Unassigned.', 'Validation Error');
            return;
        }

        const id = document.getElementById('f-id').value;

        // Preserve existing payments when updating an existing follow-up
        let existingPayments = [];
        if (id) {
            const existing = this.followUps.find(f => f.id === parseInt(id));
            if (existing && Array.isArray(existing.payments)) existingPayments = existing.payments.slice();
        }

        const payload = {
            id: id ? parseInt(id) : Date.now(),
            client: clientName,
            contact: contact,
            location: location,
            state: state,
            style: style,
            size: size,
            desc: desc,
            total: total,
            advance: advance,
            remaining: remaining,
            date: date,
            status: status,
            stage: stage,
            stagenote: stagenote,
            assign: assign,
            payments: existingPayments
        };

        const existingClient = this.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
        if (!existingClient) {
            this.clients.push({
                id: Date.now() + Math.random(),
                name: clientName,
                contact: contact || '-',
                location: location ? (state ? `${location}, ${state}` : location) : '-'
            });
            this.saveClientsData();
        } else if (contact && existingClient.contact === '-') {
            existingClient.contact = contact;
            this.saveClientsData();
        }

        if (id) {
            const idx = this.followUps.findIndex(f => f.id === parseInt(id));
            if (idx > -1) this.followUps[idx] = payload;
            this.sendGlobalNotification('Task Edited ✏️', `${clientName}'s Project was updated by ${this.currentUser}`, 'All');
        } else {
            this.followUps.push(payload);
            this.sendGlobalNotification('New Follow-up Assigned 📌', `${clientName}'s project was created and assigned to ${assign}`, 'All');
            if (this.currentUser === 'Owner' && assign !== 'Unassigned') {
                this.triggerWhatsApp(assign, clientName, style);
            }
        }

        this.saveData();
        this.closeModal();
        this.renderStats();
        this.renderFollowUpsPreview();
        this.renderFollowUpsFull();
    }

    deleteFollowUp(id) {
        // Only Owner can delete follow-ups
        if (this.currentUser !== 'Owner') return;

        this.showConfirm('Are you sure you want to completely delete this follow-up?', () => {
            this.followUps = this.followUps.filter(f => f.id !== id);
            this.saveData();
            this.renderStats();
            this.renderFollowUpsPreview();
            this.renderFollowUpsFull();
        }, 'Delete Follow-up?');
    }

    // ==========================================
    // Team Management Logic
    // ==========================================
    renderTeam() {
        const container = document.getElementById('team-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.teamMembers.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); padding: 20px;">No Team members added yet.</p>`;
            return;
        }

        this.teamMembers.forEach(member => {
            const html = `
                <div class="f-item">
                    <div class="f-main">
                        <div class="f-title">${member.name}</div>
                        <div class="f-desc">${member.phone}</div>
                    </div>
                    <div class="f-meta">
                        <div style="font-size: 14px; font-weight: 500; color: ${member.role === 'Manager' ? 'var(--primary)' : 'var(--success)'};">
                            <i class='bx ${member.role === 'Manager' ? 'bx-briefcase' : 'bx-paint'}'></i> ${member.role}
                        </div>
                    </div>
                    <div class="f-actions" style="flex-direction: row;">
                        <button class="btn-icon" title="Edit" onclick="app.editTeamModal(${member.id})"><i class='bx bx-edit-alt'></i></button>
                        <button class="btn-icon" style="color: var(--danger)" title="Remove" onclick="app.deleteTeamMember(${member.id})"><i class='bx bx-trash'></i></button>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
    }

    openTeamModal() {
        document.getElementById('t-id').value = '';
        document.getElementById('team-form').reset();
        document.getElementById('team-modal-title').textContent = 'Add Team Member';
        document.getElementById('team-modal').classList.add('active');
    }

    editTeamModal(id) {
        const member = this.teamMembers.find(m => m.id === id);
        if (!member) return;

        document.getElementById('t-id').value = member.id;
        document.getElementById('t-name').value = member.name;
        document.getElementById('t-location').value = member.location || '';
        document.getElementById('t-role').value = member.role;
        document.getElementById('t-phone').value = member.phone;
        if (this.tIti) {
            setTimeout(() => this.tIti.setNumber(member.phone || ''), 10);
        }

        document.getElementById('team-modal-title').textContent = 'Edit Team Member';
        document.getElementById('team-modal').classList.add('active');
    }

    closeTeamModal() {
        document.getElementById('team-modal').classList.remove('active');
    }

    saveTeamMember(e) {
        e.preventDefault();

        const name = document.getElementById('t-name').value.trim();
        const role = document.getElementById('t-role').value;
        const location = document.getElementById('t-location').value.trim();
        const phoneRaw = document.getElementById('t-phone').value.trim();
        const phone = (this.tIti && this.tIti.getNumber()) ? this.tIti.getNumber() : phoneRaw;

        const id = document.getElementById('t-id').value;
        
        // Preserve existing salary data if editing
        let baseSalary = 0;
        let paidSalary = 0;
        let salaryNote = '';
        
        if (id) {
            const existing = this.teamMembers.find(m => m.id === parseInt(id));
            if (existing) {
                baseSalary = existing.baseSalary || 0;
                paidSalary = existing.paidSalary || 0;
                salaryNote = existing.salaryNote || '';
            }
        }

        const payload = {
            id: id ? parseInt(id) : Date.now(),
            name: name,
            location: location,
            role: role,
            phone: phone,
            baseSalary: baseSalary,
            paidSalary: paidSalary,
            salaryNote: salaryNote
        };

        if (id) {
            const idx = this.teamMembers.findIndex(m => m.id === parseInt(id));
            if (idx > -1) this.teamMembers[idx] = payload;
        } else {
            this.teamMembers.push(payload);
        }

        this.saveTeamData();
        this.closeTeamModal();
        this.renderTeam();

        this.renderFollowUpsPreview();
        this.renderFollowUpsFull();
    }

    deleteTeamMember(id) {
        this.showConfirm('Are you sure you want to carefully remove this team member? This action cannot be undone.', () => {
            this.teamMembers = this.teamMembers.filter(m => m.id !== id);
            this.saveTeamData();
            this.renderTeam();
        }, 'Remove Member?');
    }

    // ==========================================

    slideInstitute(index) {
        const slider = document.getElementById('institute-slider');
        const pill = document.getElementById('institute-pill');
        const btnStudents = document.getElementById('toggle-students');
        const btnEmployees = document.getElementById('toggle-employees');

        if (!slider) return;

        if (index === 0) {
            slider.scrollTo({ left: 0, behavior: 'smooth' });
            if (pill) pill.style.transform = 'translateX(0)';
            if (btnStudents) { btnStudents.style.color = '#fff'; btnStudents.classList.add('active'); }
            if (btnEmployees) { btnEmployees.style.color = 'var(--text-light)'; btnEmployees.classList.remove('active'); }
        } else {
            slider.scrollTo({ left: slider.scrollWidth, behavior: 'smooth' });
            if (pill) pill.style.transform = 'translateX(100%)';
            if (btnStudents) { btnStudents.style.color = 'var(--text-light)'; btnStudents.classList.remove('active'); }
            if (btnEmployees) { btnEmployees.style.color = '#fff'; btnEmployees.classList.add('active'); }
        }
    }

    // Employees Module Logic
    // ==========================================
    renderEmployees() {
        if (this.currentUser !== 'Owner') return;
        const tbody = document.getElementById('employees-tbody');
        if (!tbody) return;

        let totalBase = 0;
        let totalPaid = 0;

        let html = '';
        this.teamMembers.forEach(m => {
            const baseSalary = parseFloat(m.baseSalary) || 0;
            const paidSalary = parseFloat(m.paidSalary) || 0;

            totalBase += baseSalary;
            totalPaid += paidSalary;

            html += `
                <tr style="transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    <td style="font-weight: 600;">${m.name}</td>
                    <td>${m.location || '-'}</td>
                    <td style="color: ${m.role === 'Manager' ? 'var(--primary)' : 'var(--success)'}; font-weight: 500;">${m.role}</td>
                    <td>${m.phone || '-'}</td>
                    <td style="color: var(--primary); font-weight: 600;">₹${baseSalary.toLocaleString('en-IN')}</td>
                    <td style="color: var(--success); font-weight: 600;">₹${paidSalary.toLocaleString('en-IN')}</td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button class="btn-quick manager" style="padding: 6px 12px; font-size: 13px;" onclick="app.openSalaryModal(${m.id})">
                                <i class='bx bx-wallet'></i> Pay
                            </button>
                            <button class="btn-quick" style="padding: 6px 12px; font-size: 13px;" onclick="app.openEmployeeDetail(${m.id})">
                                <i class='bx bx-detail'></i> Details
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html.length > 0 ? html : `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No employees in directory.</td></tr>`;

        const statBase = document.getElementById('emp-stat-base');
        const statPaid = document.getElementById('emp-stat-paid');
        const statPending = document.getElementById('emp-stat-pending');

        if (statBase) statBase.textContent = `₹ ${totalBase.toLocaleString('en-IN')}`;
        if (statPaid) statPaid.textContent = `₹ ${totalPaid.toLocaleString('en-IN')}`;
        if (statPending) statPending.textContent = `₹ ${(totalBase - totalPaid).toLocaleString('en-IN')}`;
    }

    openSalaryModal(empId) {
        if (this.currentUser !== 'Owner') return;
        const emp = this.teamMembers.find(m => m.id === empId);
        if (!emp) return;

        document.getElementById('salary-form').reset();
        document.getElementById('sal-emp-id').value = emp.id;
        document.getElementById('sal-emp-name').value = emp.name;
        document.getElementById('sal-base').value = emp.baseSalary || 0;
        document.getElementById('sal-paid').value = emp.paidSalary || 0;
        document.getElementById('sal-note').value = emp.salaryNote || '';
        this.calculateSalaryRemaining();

        document.getElementById('salary-modal').classList.add('active');
    }

    closeSalaryModal() {
        document.getElementById('salary-modal').classList.remove('active');
    }

    calculateSalaryRemaining() {
        const base = parseFloat(document.getElementById('sal-base').value) || 0;
        const paid = parseFloat(document.getElementById('sal-paid').value) || 0;
        document.getElementById('sal-remaining').value = (base - paid);
    }

    saveSalary(e) {
        e.preventDefault();
        const empId = parseInt(document.getElementById('sal-emp-id').value);
        const emp = this.teamMembers.find(m => m.id === empId);
        if (!emp) return;

        emp.baseSalary = parseFloat(document.getElementById('sal-base').value) || 0;
        emp.paidSalary = parseFloat(document.getElementById('sal-paid').value) || 0;
        emp.salaryNote = document.getElementById('sal-note').value;

        this.saveTeamData();
        this.renderEmployees();

        this.showAlert(`Salary records for ${emp.name} saved.`, '✅ Saved');
    }

    sendSalaryReminder(phone, name, remaining) {
        if (!phone || phone === '-') {
            this.showAlert('No valid phone number found for this employee.', 'Cannot Send WhatsApp');
            return;
        }

        const waNum = phone.replace(/[^0-9]/g, '');
        if (waNum.length < 10) {
            this.showAlert('The phone number is invalid.', 'Invalid Number');
            return;
        }

        const msg = `Hello ${name},\n\nWe have updated your salary details. Note that ₹${remaining.toLocaleString('en-IN')} is still pending for this cycle.\nRegards, Artis Studio`;
        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    // ==========================================
    // Students Module Logic (Owner Only)
    // ==========================================
    saveStudentsData() {
        localStorage.setItem('artis_crm_students', JSON.stringify(this.students));
    }

    renderStudents() {
        if (this.currentUser !== 'Owner') return;
        const tbody = document.getElementById('students-tbody');
        if (!tbody) return;

        let totalMonthlyFees = 0;
        let totalCharged = 0;
        let html = '';

        this.students.forEach(s => {
            const fee = parseFloat(s.monthly_fee) || 0;
            const chargedFee = parseFloat(s.chargedFee) || 0;
            totalMonthlyFees += fee;
            totalCharged += chargedFee;

            html += `<tr style="transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                        <td style="font-weight: 600;">${s.name}</td>
                        <td>${s.location || '-'}</td>
                        <td style="color: var(--primary); font-weight: 500;">${s.course}</td>
                        <td>${s.phone || '-'}</td>
                        <td style="color: var(--primary); font-weight: 600;">₹${fee.toLocaleString('en-IN')}</td>
                        <td style="color: var(--success); font-weight: 600;">₹${chargedFee.toLocaleString('en-IN')}</td>
                        <td style="color: var(--warning); font-weight: 600;">₹${(fee - chargedFee).toLocaleString('en-IN')}</td>
                        <td>
                            <div style="display:flex; gap:6px;">
                                <button class="btn-quick manager" style="padding: 6px 12px; font-size: 13px;" onclick="app.openFeeModal(${s.id})">
                                    <i class='bx bx-rupee'></i> Receive ₹
                                </button>
                                <button class="btn-quick" style="padding: 6px 12px; font-size: 13px;" onclick="app.openStudentDetail(${s.id})">
                                    <i class='bx bx-detail'></i> Details
                                </button>
                                <button class="btn-quick" style="padding: 6px 12px; font-size: 13px;" onclick="app.openStudentModal(${s.id})" title="Edit">
                                    <i class='bx bx-edit-alt'></i>
                                </button>
                                <button class="btn-quick" style="padding: 6px 12px; font-size: 13px; color: var(--danger);" onclick="app.deleteStudent(${s.id})" title="Delete">
                                    <i class='bx bx-trash'></i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
        });

        tbody.innerHTML = html.length > 0 ? html : `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">No students found in directory.</td></tr>`;

        const statTotal = document.getElementById('student-stat-total');
        if (statTotal) statTotal.textContent = `₹ ${totalMonthlyFees.toLocaleString('en-IN')}`;

        const statPaid = document.getElementById('student-stat-paid');
        if (statPaid) statPaid.textContent = `₹ ${totalCharged.toLocaleString('en-IN')}`;

        const statPending = document.getElementById('student-stat-pending');
        if (statPending) statPending.textContent = `₹ ${(totalMonthlyFees - totalCharged).toLocaleString('en-IN')}`;
    }

    openStudentModal(id = null) {
        if (this.currentUser !== 'Owner') {
            this.showAlert('Only the Owner can manage student records.', 'Permission Denied');
            return;
        }

        const form = document.getElementById('student-form');
        if (form) form.reset();

        const title = document.getElementById('student-modal-title');

        if (id) {
            const s = this.students.find(x => x.id === id);
            if (s) {
                if (title) title.textContent = 'Edit Student Record';
                document.getElementById('stu-id').value = s.id;
                document.getElementById('stu-name').value = s.name;
                document.getElementById('stu-course').value = s.course;
                document.getElementById('stu-phone').value = s.phone;
                document.getElementById('stu-location').value = s.location || '';
                document.getElementById('stu-date').value = s.date;
                document.getElementById('stu-fee').value = s.monthly_fee || 0;
                document.getElementById('stu-note').value = s.contract || '';
            }
        } else {
            if (title) title.textContent = 'Add New Student';
            document.getElementById('stu-id').value = '';
            document.getElementById('stu-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('stu-fee').value = 0;
        }

        const modal = document.getElementById('student-modal');
        if (modal) modal.classList.add('active');
    }

    closeStudentModal() {
        const modal = document.getElementById('student-modal');
        if (modal) modal.classList.remove('active');
    }

    saveStudent(e) {
        e.preventDefault();
        if (this.currentUser !== 'Owner') return;

        const id = document.getElementById('stu-id').value;
        const studentObj = {
            id: id ? parseInt(id) : Date.now(),
            name: document.getElementById('stu-name').value.trim(),
            course: document.getElementById('stu-course').value,
            phone: document.getElementById('stu-phone').value.trim(),
            location: document.getElementById('stu-location').value.trim(),
            date: document.getElementById('stu-date').value,
            monthly_fee: parseFloat(document.getElementById('stu-fee').value) || 0,
            contract: document.getElementById('stu-note').value.trim()
        };

        if (id) {
            const index = this.students.findIndex(x => x.id === parseInt(id));
            if (index !== -1) {
                this.students[index] = studentObj;
            }
        } else {
            this.students.push(studentObj);
        }

        this.saveStudentsData();
        this.renderStudents();
        
        this.closeStudentModal();
        this.showAlert('Student record saved.', '✅ Saved');
    }

    deleteStudent(id) {
        if (this.currentUser !== 'Owner') {
            this.showAlert('Only the Owner can delete student records.', 'Permission Denied');
            return;
        }
        this.showConfirm('Are you sure you want to permanently delete this student record?', () => {
            this.students = this.students.filter(s => s.id !== id);
            this.saveStudentsData();
            this.renderStudents();
        }, 'Delete Student?');
    }

    openFeeModal(stuId) {
        if (this.currentUser !== 'Owner') return;
        const stu = this.students.find(m => m.id === stuId);
        if (!stu) return;

        document.getElementById('fee-form').reset();
        document.getElementById('fee-stu-id').value = stu.id;
        document.getElementById('fee-stu-name').value = stu.name;
        document.getElementById('fee-base').value = stu.monthly_fee || 0;
        document.getElementById('fee-charged').value = stu.chargedFee || 0;
        document.getElementById('fee-note').value = stu.feeNote || '';
        document.getElementById('fee-location').value = stu.course || '';
        this.calculateFeeRemaining();

        document.getElementById('fee-modal').classList.add('active');
    }

    closeFeeModal() {
        document.getElementById('fee-modal').classList.remove('active');
    }

    calculateFeeRemaining() {
        const base = parseFloat(document.getElementById('fee-base').value) || 0;
        const charged = parseFloat(document.getElementById('fee-charged').value) || 0;
        document.getElementById('fee-remaining').value = (base - charged);
    }

    saveFee(e) {
        e.preventDefault();
        const stuId = parseInt(document.getElementById('fee-stu-id').value);
        const stu = this.students.find(m => m.id === stuId);
        if (!stu) return;

        stu.monthly_fee = parseFloat(document.getElementById('fee-base').value) || 0;
        stu.chargedFee = parseFloat(document.getElementById('fee-charged').value) || 0;
        stu.feeNote = document.getElementById('fee-note').value;
        stu.course = (document.getElementById('fee-location').value || '').trim();

        this.saveStudentsData();
        this.renderStudents();

        this.showAlert(`Fee records for ${stu.name} saved.`, '✅ Saved');
    }


    // ==========================================
    // Alerts and Confirms Core Logic
    // ==========================================
    showAlert(msg, title = 'Notice') {
        const alertModal = document.getElementById('custom-alert');
        if (alertModal) {
            document.getElementById('custom-alert-msg').textContent = msg;
            document.getElementById('custom-alert-title').innerHTML = title;
            alertModal.classList.add('active');
        } else {
            alert(msg);
        }
    }

    closeAlert() {
        const alertModal = document.getElementById('custom-alert');
        if (alertModal) alertModal.classList.remove('active');
    }

    showConfirm(msg, callback, title = 'Confirm Action') {
        const confirmModal = document.getElementById('custom-confirm');
        if (confirmModal) {
            document.getElementById('custom-confirm-msg').textContent = msg;
            document.getElementById('custom-confirm-title').innerHTML = title;
            confirmModal.classList.add('active');
            this.confirmCallback = callback;
        } else {
            if (confirm(msg)) callback();
        }
    }

    closeConfirm(confirmed) {
        const confirmModal = document.getElementById('custom-confirm');
        if (confirmModal) confirmModal.classList.remove('active');
        if (confirmed && this.confirmCallback) {
            this.confirmCallback();
        }
        this.confirmCallback = null;
    }

    // ==========================================
    // Auth & Utilities
    // ==========================================
    selectRole(role) {
        if (role === 'Team') {
            this.login('Team');
        } else {
            document.getElementById('roles-selection').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('login-role-title').textContent = `Login as ${role}`;
            document.getElementById('login-role').value = role;

            const errorBox = document.getElementById('login-error');
            errorBox.style.display = 'none';
            errorBox.className = 'error-text';

            document.getElementById('login-password').focus();
        }
    }

    backToRoles() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('roles-selection').style.display = 'grid';
        document.getElementById('login-form').reset();
    }

    handleLogin(e) {
        e.preventDefault();
        const role = document.getElementById('login-role').value;
        const passInput = document.getElementById('login-password').value;
        const errorBox = document.getElementById('login-error');

        errorBox.className = 'error-text';
        errorBox.style.background = 'rgba(239, 68, 68, 0.1)';
        errorBox.style.color = 'var(--danger)';
        errorBox.style.borderColor = 'rgba(239, 68, 68, 0.3)';

        if (passInput !== this.passwords[role]) {
            errorBox.textContent = `Incorrect Password for ${role}.`;
            errorBox.style.display = 'block';
            return;
        }

        errorBox.style.display = 'none';
        this.backToRoles();
        this.login(role);
    }

    handleChangePassword(e) {
        e.preventDefault();
        const currentPass = document.getElementById('cp-current').value;
        const newPass = document.getElementById('cp-new').value;
        const confirmPass = document.getElementById('cp-confirm').value;
        const msgBox = document.getElementById('pass-msg');

        msgBox.className = 'error-text';
        msgBox.style.background = 'rgba(239, 68, 68, 0.1)';
        msgBox.style.color = 'var(--danger)';
        msgBox.style.borderColor = 'rgba(239, 68, 68, 0.3)';

        if (currentPass !== this.passwords[this.currentUser]) {
            msgBox.textContent = 'Current Password does not match.';
            msgBox.style.display = 'block';
            return;
        }

        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passRegex.test(newPass)) {
            msgBox.textContent = 'Validation Error: New Password requirements not met.';
            msgBox.style.display = 'block';
            return;
        }

        if (newPass !== confirmPass) {
            msgBox.textContent = 'New Passwords do not match.';
            msgBox.style.display = 'block';
            return;
        }

        this.passwords[this.currentUser] = newPass;
        this.savePasswords();

        msgBox.className = 'error-text';
        msgBox.style.background = 'rgba(16, 185, 129, 0.1)';
        msgBox.style.color = 'var(--success)';
        msgBox.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        msgBox.textContent = 'Password successfully updated!';
        msgBox.style.display = 'block';

        document.getElementById('change-pass-form').reset();
    }

    switchTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            const logoLogin = document.getElementById('logo-login');
            if (logoLogin) logoLogin.src = 'https://res.cloudinary.com/dzgc4sghz/image/upload/q_auto/f_auto/v1775379935/logo_main_cqprlc.png';

            const logoSidebar = document.getElementById('logo-sidebar');
            if (logoSidebar) logoSidebar.src = 'https://res.cloudinary.com/dzgc4sghz/image/upload/q_auto/f_auto/v1775379935/logo_main_cqprlc.png';
        } else {
            document.body.classList.remove('light-theme');
            const logoLogin = document.getElementById('logo-login');
            if (logoLogin) logoLogin.src = 'https://res.cloudinary.com/dzgc4sghz/image/upload/v1773142856/logo_white_c01abm.png';

            const logoSidebar = document.getElementById('logo-sidebar');
            if (logoSidebar) logoSidebar.src = 'https://res.cloudinary.com/dzgc4sghz/image/upload/v1773142856/logo_white_c01abm.png';
        }

        localStorage.setItem('artis_crm_theme', theme);
    }


    setupSliderDrag() {
        const slider = document.getElementById('institute-slider');
        if (!slider) return;

        let isDown = false;
        let startX;
        let scrollLeft;

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.style.cursor = 'grabbing';
            slider.style.scrollSnapType = 'none'; // disable snap while dragging
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.style.cursor = 'grab';
            slider.style.scrollSnapType = 'x mandatory';
        });
        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.style.cursor = 'grab';
            slider.style.scrollSnapType = 'x mandatory';

            // Snap to nearest dynamically
            if (slider.scrollLeft > slider.clientWidth / 2) {
                this.slideInstitute(1);
            } else {
                this.slideInstitute(0);
            }
        });
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2; // scroll-fast
            slider.scrollLeft = scrollLeft - walk;
        });

        // Sync pill on normal scroll
        slider.addEventListener('scroll', () => {
            if (isDown) return; // avoid conflict with drag
            if (slider.scrollLeft > slider.clientWidth / 2) {
                const pill = document.getElementById('institute-pill');
                const btnStudents = document.getElementById('toggle-students');
                const btnEmployees = document.getElementById('toggle-employees');
                if (pill) pill.style.transform = 'translateX(100%)';
                if (btnStudents) { btnStudents.style.color = 'var(--text-light)'; btnStudents.classList.remove('active'); }
                if (btnEmployees) { btnEmployees.style.color = '#fff'; btnEmployees.classList.add('active'); }
            } else {
                const pill = document.getElementById('institute-pill');
                const btnStudents = document.getElementById('toggle-students');
                const btnEmployees = document.getElementById('toggle-employees');
                if (pill) pill.style.transform = 'translateX(0)';
                if (btnStudents) { btnStudents.style.color = '#fff'; btnStudents.classList.add('active'); }
                if (btnEmployees) { btnEmployees.style.color = 'var(--text-light)'; btnEmployees.classList.remove('active'); }
            }
        });
    }

    setupEventListeners() {
        const pForm = document.getElementById('followup-form');
        if (pForm) pForm.addEventListener('submit', (e) => this.saveFollowUp(e));

        const tForm = document.getElementById('team-form');
        if (tForm) tForm.addEventListener('submit', (e) => this.saveTeamMember(e));

        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        const passForm = document.getElementById('change-pass-form');
        if (passForm) passForm.addEventListener('submit', (e) => this.handleChangePassword(e));

        const savePrefBtn = document.querySelector('.btn-secondary[onclick*="showAlert(\'Settings saved successfully!\'"]');
        if (savePrefBtn) {
            savePrefBtn.setAttribute('onclick', 'app.saveProfileSettings()');
        }

        const stuForm = document.getElementById('student-form');
        if (stuForm) stuForm.addEventListener('submit', (e) => this.saveStudent(e));

        const salForm = document.getElementById('salary-form');
        if (salForm) salForm.addEventListener('submit', (e) => this.saveSalary(e));

        const feeForm = document.getElementById('fee-form');
        if (feeForm) feeForm.addEventListener('submit', (e) => this.saveFee(e));

        // Modal backdrop click 
        window.onclick = function (event) {
            // Modals and popup forms should NOT close on backdrop click as per user request
            // User must explicitly save or cancel
            /*
            const tModal = document.getElementById('team-modal');
            const aModal = document.getElementById('assign-modal');
            const stuModal = document.getElementById('student-modal');
            const salModal = document.getElementById('salary-modal');

            if (event.target == tModal) app.closeTeamModal();
            if (event.target == aModal) app.closeAssignModal();
            if (event.target == stuModal) app.closeStudentModal();
            if (event.target == salModal) app.closeSalaryModal();

            const alModal = document.getElementById('custom-alert');
            if (event.target == alModal) app.closeAlert();
            */
        }
    }

    togglePasswordVisibility(inputId, btnId) {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);
        if (!input || !btn) return;
        if (input.type === 'password') {
            input.type = 'text';
            btn.innerHTML = "<i class='bx bx-show'></i>";
        } else {
            input.type = 'password';
            btn.innerHTML = "<i class='bx bx-hide'></i>";
        }
    }

    closeStudentDetail() {
        const modal = document.getElementById('student-detail-modal');
        if (modal) modal.classList.remove('active');
    }

    openStudentDetail(id) {
        const s = this.students.find(x => x.id === id);
        if (!s) return;
        const header = document.getElementById('sd-header-info');
        if (header) {
            const fee = parseFloat(s.monthly_fee) || 0;
            const chargedFee = parseFloat(s.chargedFee) || 0;
            header.innerHTML = `
                <h3 style="margin:0; font-size:18px;">${s.name}</h3>
                <p style="color:var(--text-muted); font-size:13px;"><i class='bx bx-phone'></i> ${s.phone || '-'} &nbsp; <i class='bx bx-map'></i> ${s.location || '-'}</p>
                <p style="color:var(--primary); font-size:13px; font-weight:600;">Course: ${s.course} &nbsp; Fee: ₹${fee.toLocaleString('en-IN')} &nbsp; Charged: ₹${chargedFee.toLocaleString('en-IN')}</p>
                <p style="color:var(--text-muted); font-size:12px;">${s.feeNote || 'No fee note'}</p>
            `;
        }
        const modal = document.getElementById('student-detail-modal');
        if (modal) modal.classList.add('active');
    }

    closeEmployeeDetail() {
        const modal = document.getElementById('employee-detail-modal');
        if (modal) modal.classList.remove('active');
    }

    openEmployeeDetail(id) {
        const emp = this.teamMembers.find(m => m.id === id);
        if (!emp) return;
        const header = document.getElementById('ed-header-info');
        if (header) {
            const baseSalary = parseFloat(emp.baseSalary) || 0;
            const paidSalary = parseFloat(emp.paidSalary) || 0;
            header.innerHTML = `
                <h3 style="margin:0; font-size:18px;">${emp.name}</h3>
                <p style="color:var(--text-muted); font-size:13px;"><i class='bx bx-phone'></i> ${emp.phone || '-'} &nbsp; <i class='bx bx-map'></i> ${emp.location || '-'}</p>
                <p style="color:var(--primary); font-size:13px; font-weight:600;">Role: ${emp.role} &nbsp; Base: ₹${baseSalary.toLocaleString('en-IN')} &nbsp; Paid: ₹${paidSalary.toLocaleString('en-IN')}</p>
                <p style="color:var(--text-muted); font-size:12px;">${emp.salaryNote || 'No payment note'}</p>
            `;
        }
        const modal = document.getElementById('employee-detail-modal');
        if (modal) modal.classList.add('active');
    }
}

window.app = new ArtStudioCRM();

