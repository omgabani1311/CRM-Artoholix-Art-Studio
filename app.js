import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, query, limitToLast } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

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

const firebaseApp = initializeApp(firebaseConfig);
let db = null;
try {
    db = getDatabase(firebaseApp);
} catch (e) { console.error(e); }

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
        this.teamMembers = [];
        this.passwords = {};
        this.paymentReminders = [];
        this.currentAssignTaskId = null;
        this.confirmCallback = null;
        this.searchQuery = '';
        this.initTime = Date.now();
        this.acceptedNotifications = JSON.parse(localStorage.getItem('artis_accepted_notifs')) || [];
        this.notificationQueue = [];
        this.isShowingNotification = false;
        this.init();
    }

    init() {
        this.populateCityDropdown();
        this.loadData();
        this.checkAuth();
        this.setupEventListeners();

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

    startNotificationListener() {
        if (!db) return;
        if (this.notificationListenerStarted) return;
        this.notificationListenerStarted = true;

        try {
            const notifRef = ref(db, 'studio_notifications');
            const recentNotifs = query(notifRef, limitToLast(50));
            onChildAdded(recentNotifs, (snapshot) => {
                const data = snapshot.val();
                const notifId = snapshot.key;
                console.debug('[notif] onChildAdded received', { notifId, data, currentUser: this.currentUser });
                if (data && data.sender !== this.currentUser && !this.acceptedNotifications.includes(notifId)) {
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
            push(ref(db, 'studio_notifications'), payload);
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
        const storedReminders = localStorage.getItem('artis_crm_reminders');
        this.paymentReminders = storedReminders ? JSON.parse(storedReminders) : [];

        const stored = localStorage.getItem('artis_crm_data');
        if (stored) {
            this.followUps = JSON.parse(stored);
        } else {
            const d1 = new Date(); d1.setDate(d1.getDate() + 1);
            const d2 = new Date(); d2.setDate(d2.getDate() + 3);
            const d3 = new Date(); d3.setDate(d3.getDate() + 5);

            this.followUps = [
                {
                    id: 1, client: 'Emma Watson', contact: '+91 9988776655', location: 'Mumbai', style: 'Portrait', size: '24x36',
                        desc: 'Custom Portrait 24x36 - Discuss color palette', total: 15000, advance: 5000, remaining: 10000,
                        date: d1.toISOString().split('T')[0], status: 'Pending', stage: 'Sketching', stagenote: 'Awaiting client approval',
                        payments: [{ amount: 5000, date: d1.toISOString().split('T')[0], note: 'Initial advance' }],
                    assign: 'Manager'
                },
                {
                    id: 2, client: 'John Smith', contact: '+91 8877665544', location: 'Delhi', style: 'Abstract Canvas', size: '48x48',
                        desc: 'Abstract Canvas Delivery', total: 30000, advance: 30000, remaining: 0,
                        date: d2.toISOString().split('T')[0], status: 'In Progress', stage: 'Framing', stagenote: 'Final wood frame requested',
                        payments: [{ amount: 30000, date: d2.toISOString().split('T')[0], note: 'Full advance' }],
                    assign: 'Team'
                },
                {
                    id: 3, client: 'Sophia Patel', contact: '+91 7766554433', location: 'Pune', style: 'Mural Design', size: 'N/A',
                        desc: 'Review sketches for mural', total: 45000, advance: 10000, remaining: 35000,
                        date: d3.toISOString().split('T')[0], status: 'Pending', stage: 'Consultation', stagenote: 'Sent 3 drafts',
                        payments: [{ amount: 10000, date: d3.toISOString().split('T')[0], note: 'Advance' }],
                    assign: 'Team: Rahul Kumar'
                }
            ];
            this.saveData();
        }

        const storedTeam = localStorage.getItem('artis_crm_team');
        if (storedTeam) {
            this.teamMembers = JSON.parse(storedTeam);
        } else {
            this.teamMembers = [
                { id: 101, name: 'Amit Sharma', role: 'Manager', phone: '+91 9876543210' },
                { id: 102, name: 'Rahul Kumar', role: 'Team', phone: '+91 8765432109' }
            ];
            this.saveTeamData();
        }

        const storedPass = localStorage.getItem('artis_crm_passwords');
        if (storedPass) {
            this.passwords = JSON.parse(storedPass);
        } else {
            this.passwords = { Owner: 'Owner@123', Manager: 'Manager@123' };
            localStorage.setItem('artis_crm_passwords', JSON.stringify(this.passwords));
        }
    }

    saveData() {
        localStorage.setItem('artis_crm_data', JSON.stringify(this.followUps));
    }

    saveTeamData() {
        localStorage.setItem('artis_crm_team', JSON.stringify(this.teamMembers));
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

    showLogin() {
        document.getElementById('dashboard-view').classList.remove('active');
        document.getElementById('login-view').classList.add('active');
        this.backToRoles();
    }

    showDashboard() {
        document.getElementById('login-view').classList.remove('active');
        document.getElementById('dashboard-view').classList.add('active');

        document.getElementById('user-role-badge').textContent = this.currentUser;
        document.getElementById('welcome-message').textContent = `Welcome, ${this.currentUser}`;

        const mgmtLinks = document.querySelectorAll('.restricted.mgmt');
        const ownerLinks = document.querySelectorAll('.restricted.owner-only');
        const passBlock = document.getElementById('settings-password-block');

        if (this.currentUser === 'Team') {
            mgmtLinks.forEach(el => el.style.display = 'none');
            ownerLinks.forEach(el => el.style.display = 'none');
            if (passBlock) passBlock.style.display = 'none';
        } else if (this.currentUser === 'Manager') {
            mgmtLinks.forEach(el => el.style.display = 'flex');
            ownerLinks.forEach(el => el.style.display = 'none');
            if (passBlock) passBlock.style.display = 'block';
        } else {
            mgmtLinks.forEach(el => el.style.display = 'flex');
            ownerLinks.forEach(el => el.style.display = 'flex');
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
        if (this.currentUser === 'Team' && (pageId === 'clients' || pageId === 'analytics' || pageId === 'team' || pageId === 'reminders')) {
            this.showAlert('You do not have permission to view this page.', 'Access Denied');
            return;
        }
        if (this.currentUser === 'Manager' && pageId === 'team') {
            this.showAlert('Team management is restricted to Owner.', 'Access Denied');
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
        } else if (pageId === 'settings') {
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
            }
        }
    }

    getRelevantFollowUps() {
        let baseList = this.followUps;

        if (this.currentUser === 'Team') {
            baseList = this.followUps.filter(f => f.assign === 'Team' || (f.assign && f.assign.startsWith('Team:')));
        } else if (this.currentUser === 'Manager') {
            baseList = this.followUps.filter(f => f.assign === 'Manager' || (f.assign && f.assign.startsWith('Manager:')));
        }

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
        return this.currentUser === 'Owner';
    }

    renderAnalytics() {
        // Use all follow-ups (global) to compute analytics across all projects
        const all = this.followUps || [];
        let totalRev = 0;
        let paymentsReceived = 0;
        let paymentsThisMonth = 0;
        const monthsSet = new Set();

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        all.forEach(item => {
            const t = parseFloat(item.total) || 0;
            totalRev += t;

            // Sum payments history if present, otherwise fallback to advance as single payment on item.date
            if (Array.isArray(item.payments) && item.payments.length > 0) {
                item.payments.forEach(p => {
                    const amt = parseFloat(p.amount) || 0;
                    paymentsReceived += amt;
                    if (p.date) {
                        const d = new Date(p.date);
                        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
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
                        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
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

        let clientMap = {};
        // Aggregate clients based on all historical and active global followUps data
        this.followUps.forEach(f => {
            if (!f.client) return;
            const key = f.client.trim().toLowerCase();
            if (!clientMap[key]) {
                clientMap[key] = {
                    name: f.client,
                    contact: f.contact || '-',
                    location: f.location ? (f.state ? `${f.location}, ${f.state}` : f.location) : '-',
                    projects: 0,
                    revenue: 0
                };
            }
            clientMap[key].projects++;
            clientMap[key].revenue += (f.total || 0);

            // Overwrite placeholder strings with valid strings if encountered later
            if (clientMap[key].contact === '-' && f.contact) clientMap[key].contact = f.contact;
            if (clientMap[key].location === '-' && f.location) clientMap[key].location = f.location ? (f.state ? `${f.location}, ${f.state}` : f.location) : '-';
        });

        // Convert the map to an array and sort by most projects
        const clients = Object.values(clientMap).sort((a, b) => b.projects - a.projects);

        if (clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No clients found. Add a follow-up to auto-generate clients.</td></tr>`;
            return;
        }

        let html = '';
        clients.forEach(c => {
            const encName = encodeURIComponent(c.name);
            const encPhone = encodeURIComponent(c.contact);
            html += `
                <tr style="transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    <td style="font-weight: 600;">${c.name}</td>
                    <td>${c.contact}</td>
                    <td>${c.location}</td>
                    <td style="color: var(--primary); font-weight: 600;">${c.projects}</td>
                    <td style="color: var(--success); font-weight: 600;">${this.isAmountVisible() ? `₹${c.revenue}` : '--'}</td>
                    <td>
                        <button class="btn-secondary" style="padding: 6px 12px; font-size: 13px; display: flex; align-items: center; gap: 5px;" onclick="app.notifyClient('${encName}', '${encPhone}')" title="Message Client">
                            <i class='bx bxl-whatsapp' style="font-size: 16px; color: #25d366;"></i> Notify
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
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
                    if (diffDays <= 5) { urgencyColor = 'var(--danger)'; urgencyClass = 'urgent-red'; }
                    else if (diffDays <= 10) { urgencyColor = '#ff7a00'; urgencyClass = 'urgent-orange'; }
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
                            const cd = new Date(item.completedAt); cd.setHours(0,0,0,0);
                            const dd = Math.floor((today.getTime() - cd.getTime()) / (1000*60*60*24));
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
                if (diffDays <= 5) { urgencyColor = 'var(--danger)'; urgencyClass = 'urgent-red'; }
                else if (diffDays <= 10) { urgencyColor = '#ff7a00'; urgencyClass = 'urgent-orange'; }
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
                        const cd = new Date(item.completedAt); cd.setHours(0,0,0,0);
                        const dd = Math.floor((today.getTime() - cd.getTime()) / (1000*60*60*24));
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
                        <span>${(function(){ try{ const assignedRole = item.assign ? item.assign.split(':')[0].trim() : ''; if ((this.currentUser === 'Manager' || this.currentUser === 'Team') && item.status !== 'Completed' && assignedRole === this.currentUser) { return `<button class="btn-quick complete" onclick="event.stopPropagation(); app.markCompleted(${item.id})" title="Mark Completed" style="background:var(--success); color:#000; padding:6px 10px; border-radius:6px; font-size:12px;">✓ Completed</button>`; } } catch(e){} return ''; }).call(this)}</span>
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

        data.sort((a, b) => {
            if (a.status === 'Completed' && b.status !== 'Completed') return 1;
            if (a.status !== 'Completed' && b.status === 'Completed') return -1;
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB;
        });

        if (limit) data = data.slice(0, limit);

        if (data.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); padding: 20px;">No follow-ups found.</p>`;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const showAmounts = this.currentUser === 'Owner';

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

        data.forEach((item, index) => {
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
                if (diffDays <= 5) {
                    urgencyColor = 'var(--danger)';
                } else if (diffDays <= 10) {
                    urgencyColor = '#ff7a00';
                } else if (diffDays <= 15) {
                    urgencyColor = '#facc15';
                }
                console.debug('[followups-urgency] item', item.id, 'diffDays', diffDays, 'color', urgencyColor);
            }

            let quickAssignHtml = '';
            if (this.currentUser === 'Owner') {
                quickAssignHtml = `
                    <button class="btn-quick manager" onclick="event.stopPropagation(); app.openAssignModal(${item.id}, 'Manager')" title="Assign to Manager"><i class='bx bx-briefcase'></i> To Manager</button>
                    <button class="btn-quick team" onclick="event.stopPropagation(); app.openAssignModal(${item.id}, 'Team')" title="Assign to Team"><i class='bx bx-paint'></i> To Team</button>
                    <button class="btn-icon" style="color: var(--danger); width: 28px; height: 28px;" title="Delete" onclick="event.stopPropagation(); app.deleteFollowUp(${item.id})"><i class='bx bx-trash'></i></button>
                `;
            } else if (this.currentUser === 'Manager' || this.currentUser === 'Team') {
                // For Manager/Team, only show a Completed action when the task is assigned to them
                try {
                    const assignedRole = item.assign ? item.assign.split(':')[0].trim() : '';
                    if (assignedRole === this.currentUser && item.status !== 'Completed') {
                        quickAssignHtml = `<button class="btn-quick complete" onclick="event.stopPropagation(); app.markCompleted(${item.id})" title="Mark Completed">✓ Completed</button>`;
                    } else {
                        quickAssignHtml = '';
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
                    ${showAmounts ? `<td style="color: var(--primary); font-weight: 600;">₹${item.total || 0}</td>
                    <td style="color: var(--success);">₹${item.advance || 0}</td>
                    <td style="color: var(--danger);">₹${item.remaining || 0}</td>` : ''}
                    <td>${item.date}</td>
                    <td><span class="f-status-pill ${statusClass}">${item.status}</span></td>
                    <td style="text-align: center;">${daysSinceCompletedHtml}</td>
                    <td style="font-weight: 500;">${item.stage || '-'}</td>
                    <td><div class="truncate-text" title="${item.stagenote}">${item.stagenote || '-'}</div></td>
                    <td><i class='bx bx-user-pin'></i> ${item.assign}</td>
                    <td>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            ${quickAssignHtml}
                            ${payReminderHtml}
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
                <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
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

            <div class="table-responsive">
                <table class="artis-table" style="min-width: 900px;">
                    <thead>
                        <tr>
                            <th style="width: 30px; text-align: center;">No.</th>
                            <th>Client Name</th>
                            <th>Contact</th>
                            <th>Art Style</th>
                            <th>Project (₹)</th>
                            <th>Advance (₹)</th>
                            <th style="color: var(--danger);">Remaining (₹)</th>
                            <th>Sent At</th>
                            <th>Sent By</th>
                            <th>Days Since Completed</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        reminders.forEach((r, idx) => {
            const sentDate = new Date(r.sentAt);
            const sentDateStr = sentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const sentTimeStr = sentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            // How many times this client has been reminded
            const key = (r.client || '').toLowerCase().trim();
            const timesCount = clientSummary[key] ? clientSummary[key].count : 1;
            const timesHtml = timesCount > 1 ? `<span style="background: var(--warning); color: #000; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 700; margin-left: 6px;">${timesCount}x</span>` : '';

            const daysBadge = r.daysSinceCompleted !== null && r.daysSinceCompleted !== undefined
                ? `<span style="color: ${r.daysSinceCompleted > 30 ? 'var(--danger)' : r.daysSinceCompleted > 7 ? '#ff7a00' : '#facc15'}; font-weight: 600;">${r.daysSinceCompleted}d</span>`
                : `<span style="color: var(--text-muted);">-</span>`;

            const waNum = (r.contact || '').replace(/[^0-9]/g, '');
            const canResend = waNum.length >= 10;

            html += `
                <tr style="transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
                    <td style="text-align: center; color: var(--text-muted); font-weight: 600;">${idx + 1}</td>
                    <td style="font-weight: 700; color: #fff;">${r.client || '-'}${timesHtml}</td>
                    <td style="color: var(--text-muted);">${r.contact || '-'}</td>
                    <td>${r.style || '-'}</td>
                    <td style="color: var(--primary); font-weight: 600;">₹${(r.total||0).toLocaleString('en-IN')}</td>
                    <td style="color: var(--success);">₹${(r.advance||0).toLocaleString('en-IN')}</td>
                    <td style="color: var(--danger); font-weight: 700;">₹${(r.remaining||0).toLocaleString('en-IN')}</td>
                    <td>
                        <div style="font-weight: 600; font-size: 13px;">${sentDateStr}</div>
                        <div style="color: var(--text-muted); font-size: 11px;">${sentTimeStr}</div>
                    </td>
                    <td><span class="badge">${r.sentBy || '-'}</span></td>
                    <td style="text-align: center;">${daysBadge}</td>
                    <td>
                        ${canResend ? `<button onclick="app.sendPaymentReminder(${r.taskId})" style="background: linear-gradient(135deg,#25d366,#128c7e); color:#fff; padding:5px 10px; border-radius:6px; font-size:11px; display:flex; align-items:center; gap:4px; border:none; cursor:pointer; font-weight:600; white-space:nowrap;"><i class='bx bxl-whatsapp' style='font-size:13px;'></i> Resend</button>` : '<span style="color:var(--text-muted); font-size:12px;">No phone</span>'}
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
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
            row.innerHTML = `<div style="color:var(--text-muted);">${p.note || 'Payment'}</div><div style="color:var(--primary);">₹${(parseFloat(p.amount)||0).toLocaleString('en-IN')} <span style="color:var(--text-muted); font-size:12px; margin-left:8px">${p.date || ''}</span></div>`;
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
        // Enforce strong restriction
        if (this.currentUser !== 'Owner') {
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
        // Only Owner can open the edit modal
        if (this.currentUser !== 'Owner') {
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
        const phoneRaw = document.getElementById('t-phone').value.trim();
        const phone = (this.tIti && this.tIti.getNumber()) ? this.tIti.getNumber() : phoneRaw;

        const id = document.getElementById('t-id').value;
        const payload = {
            id: id ? parseInt(id) : Date.now(),
            name: name,
            role: role,
            phone: phone
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
        localStorage.setItem('artis_crm_passwords', JSON.stringify(this.passwords));

        msgBox.className = 'error-text';
        msgBox.style.background = 'rgba(16, 185, 129, 0.1)';
        msgBox.style.color = 'var(--success)';
        msgBox.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        msgBox.textContent = 'Password successfully updated!';
        msgBox.style.display = 'block';

        document.getElementById('change-pass-form').reset();
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

        window.onclick = function (event) {
            const fModal = document.getElementById('followup-modal');
            const tModal = document.getElementById('team-modal');
            const aModal = document.getElementById('assign-modal');

            if (event.target == fModal) app.closeModal();
            if (event.target == tModal) app.closeTeamModal();
            if (event.target == aModal) app.closeAssignModal();

            const alModal = document.getElementById('custom-alert');
            const cModal = document.getElementById('custom-confirm');
            if (event.target == alModal) app.closeAlert();
        }
    }
}

window.app = new ArtStudioCRM();
