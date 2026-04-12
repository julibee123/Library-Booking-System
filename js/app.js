document.addEventListener('DOMContentLoaded', () => {

    const grid = document.getElementById('sessions-grid');
    const refreshBtn = document.getElementById('refresh-btn');

    // Modals
    const successModal = document.getElementById('success-modal');
    const closeSuccessBtn = document.getElementById('btn-close-success');

    // Advanced Booking References
    const advBookingModal = document.getElementById('advanced-booking-modal');
    const advBookingForm = document.getElementById('advanced-booking-form');
    const advTopicSelect = document.getElementById('adv-topic-select');

    // User Sidebar References
    const avatarBtn = document.getElementById('avatar-btn');
    const userSidebar = document.getElementById('user-sidebar');

    let scrollTimeout = null;
    let clickTimer = null;
    let selectedFacId = null;


    if (avatarBtn && userSidebar) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userSidebar.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (userSidebar.classList.contains('active') && !userSidebar.contains(e.target) && e.target !== avatarBtn && !avatarBtn.contains(e.target)) {
                userSidebar.classList.remove('active');
            }
        });
    }




    // Scroll Awareness Logic
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');

                // Update buttons
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update panes
                tabPanes.forEach(pane => {
                    pane.classList.remove('active');
                    if (pane.id === `${targetTab}-pane`) {
                        pane.classList.add('active');
                    }
                });

                if (targetTab === 'appointments') {
                    loadAppointments();
                } else if (targetTab === 'facilitators') {
                    loadFacilitators();
                }
            });
        });
    }

    // Calendar State
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let selectedDate = new Date().toISOString().split('T')[0];
    let allSessions = [];
    let isMonthView = false; // Start with Week view as requested

    const monthDisplay = document.getElementById('calendar-month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today-btn');
    const selectedDateLabel = document.getElementById('selected-date-label');
    const toggleViewBtn = document.getElementById('toggle-view-btn');

    // Calendar Navigation Listeners
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            if (isMonthView) {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
            } else {
                const date = new Date(selectedDate);
                date.setDate(date.getDate() - 7);
                selectedDate = date.toISOString().split('T')[0];
                currentMonth = date.getMonth();
                currentYear = date.getFullYear();
            }
            updateCalendar();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            if (isMonthView) {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
            } else {
                const date = new Date(selectedDate);
                date.setDate(date.getDate() + 7);
                selectedDate = date.toISOString().split('T')[0];
                currentMonth = date.getMonth();
                currentYear = date.getFullYear();
            }
            updateCalendar();
        });
    }

    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            const now = new Date();
            currentMonth = now.getMonth();
            currentYear = now.getFullYear();
            selectedDate = now.toISOString().split('T')[0];
            updateCalendar();
        });
    }

    if (toggleViewBtn) {
        toggleViewBtn.addEventListener('click', () => {
            isMonthView = !isMonthView;
            const span = toggleViewBtn.querySelector('span');
            const svg = toggleViewBtn.querySelector('svg');
            const calendarHero = document.querySelector('.calendar-hero');
            const calendarCard = document.querySelector('.calendar-card');
            
            if (isMonthView) {
                span.textContent = 'Collapse';
                svg.innerHTML = '<polyline points="17 11 12 6 7 11"></polyline><polyline points="17 18 12 13 7 18"></polyline>';
                if (calendarCard) calendarCard.classList.add('expanded');
                if (calendarHero) calendarHero.classList.add('expanded');
            } else {
                span.textContent = 'Expand';
                svg.innerHTML = '<polyline points="7 13 12 18 17 13"></polyline><polyline points="7 6 12 11 17 6"></polyline>';
                if (calendarCard) calendarCard.classList.remove('expanded');
                if (calendarHero) calendarHero.classList.remove('expanded');
            }
            renderCalendarGrid();
        });
    }


    // Main logic to refresh calendar view
    async function updateCalendar(forceFetch = false) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (monthDisplay) {
            monthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
        }

        // Ensure selectedDate is within the current month/year context when navigating (Only in month view)
        if (isMonthView) {
            const selDate = new Date(selectedDate);
            if (selDate.getMonth() !== currentMonth || selDate.getFullYear() !== currentYear) {
                selectedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
            }
        }

        if (allSessions.length === 0 || forceFetch) {
            try {
                const res = await fetch('api.php?action=get_appointments');
                const data = await res.json();
                if (data.success) allSessions = data.appointments;
            } catch (e) {
                console.error("Failed to sync sessions:", e);
            }
        }

        renderCalendarGrid();
        updateTodayTimeline();
        loadPublicSeminars();
    }

    let allSeminars = [];

    async function loadPublicSeminars() {
        try {
            const res = await fetch('api.php?action=get_seminars');
            const data = await res.json();
            
            if (data.success && data.seminars.length > 0) {
                allSeminars = data.seminars;
                const list = document.getElementById('seminars-list');
                if (list) {
                    list.innerHTML = '';
                    allSeminars.forEach(s => {
                        const date = new Date(s.date_time);
                        const card = document.createElement('div');
                        card.className = 'seminar-item-card';
                        card.innerHTML = `
                            <div class="sem-date-badge">
                                <span class="sem-month">${date.toLocaleString('default', { month: 'short' })}</span>
                                <span class="sem-day">${date.getDate()}</span>
                            </div>
                            <div class="sem-details">
                                <h4>${s.title}</h4>
                                <div class="sem-meta">
                                    <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ${s.speaker}</span>
                                    <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${s.venue}</span>
                                </div>
                            </div>
                        `;
                        list.appendChild(card);
                    });
                }
                renderCalendarGrid(); // Refresh grid with seminars
            } else {
                const list = document.getElementById('seminars-list');
                if (list) list.innerHTML = '<div class="empty-notice">No upcoming seminars scheduled.</div>';
            }
        } catch (e) {
            console.error(e);
        }
    }

    function renderCalendarGrid() {
        if (!calendarGrid) return;
        calendarGrid.innerHTML = '';

        if (selectedDateLabel) {
            const date = new Date(selectedDate);
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            selectedDateLabel.textContent = `Showing schedule for ${date.toLocaleDateString('en-US', options)}`;
        }

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

        const today = new Date();
        today.setHours(0,0,0,0);
        const gapDate = new Date(today);
        gapDate.setDate(today.getDate() + 2);

        let cells = [];

        // Previous month padding cells
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            const date = new Date(currentYear, currentMonth - 1, dayNum);
            const dateStr = date.toISOString().split('T')[0];
            const isRestricted = date < gapDate;
            const cell = createCell(dayNum, true, false, dateStr === selectedDate, dateStr, isRestricted);
            cells.push({ cell, dateStr, isRestricted });
        }

        // Current month cells
        const todayStr = new Date().toISOString().split('T')[0];
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const dateStr = date.toISOString().split('T')[0];
            const isRestricted = date < gapDate;
            const cell = createCell(i, false, dateStr === todayStr, dateStr === selectedDate, dateStr, isRestricted);
            cells.push({ cell, dateStr, isRestricted });
        }

        // Next month padding cells
        const totalUsed = cells.length;
        const paddingNeeded = 42 - totalUsed;
        for (let i = 1; i <= paddingNeeded; i++) {
            const date = new Date(currentYear, currentMonth + 1, i);
            const dateStr = date.toISOString().split('T')[0];
            const isRestricted = date < gapDate;
            const cell = createCell(i, true, false, dateStr === selectedDate, dateStr, isRestricted);
            cells.push({ cell, dateStr, isRestricted });
        }

        // If Week View, find the week containing selectedDate
        if (!isMonthView) {
            const selectedDateObj = new Date(selectedDate);
            const dayOfWeek = selectedDateObj.getDay();
            const startOfWeek = new Date(selectedDateObj);
            startOfWeek.setDate(selectedDateObj.getDate() - dayOfWeek);
            
            const weekStartStr = startOfWeek.toISOString().split('T')[0];
            
            // Find the index in our cells array that matches the start of the week
            let startIndex = cells.findIndex(c => c.dateStr === weekStartStr);
            
            if (startIndex !== -1) {
                cells = cells.slice(startIndex, startIndex + 7);
            } else {
                cells = cells.slice(0, 7);
            }
        }

        cells.forEach(({ cell, dateStr, isRestricted }) => {
            const daySessions = allSessions.filter(s => s.date_time.startsWith(dateStr) && s.booking_status !== 'Cancelled');
            const daySeminars = allSeminars.filter(s => s.date_time.startsWith(dateStr));
            const dotContainer = cell.querySelector('.day-content');

            if (daySessions.length > 0) {
                const dot = document.createElement('div');
                dot.className = `event-dot dot-booked`;
                dotContainer.appendChild(dot);
                if (daySessions.length > 1) {
                    const count = document.createElement('span');
                    count.style.fontSize = '0.7rem';
                    count.style.color = 'var(--text-secondary)';
                    count.textContent = `${daySessions.length} slots`;
                    dotContainer.appendChild(count);
                }
            } 
            
            if (daySeminars.length > 0) {
                const tag = document.createElement('div');
                tag.className = `seminar-tag`;
                tag.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> Seminar`;
                dotContainer.appendChild(tag);
            }

            if (daySessions.length === 0 && daySeminars.length === 0) {
                const cellDate = new Date(dateStr);
                const dayOfWeek = cellDate.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    const dot = document.createElement('div');
                    dot.className = 'event-dot dot-closed';
                    dotContainer.appendChild(dot);
                }
            }

            // Click listener for date selection
            cell.addEventListener('click', () => {
                if (isRestricted) {
                    alert('Due to preparation requirements, bookings must be made at least 2 days in advance.');
                    return;
                }
                selectedDate = dateStr;
                document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                
                if (typeof openAdvancedBooking === 'function') {
                    openAdvancedBooking(dateStr);
                }
            });

            calendarGrid.appendChild(cell);
        });
    }

    function createCell(day, inactive, isToday, isSelected, dateStr, isRestricted) {
        const cell = document.createElement('div');
        cell.className = `calendar-cell ${inactive ? 'inactive' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isRestricted ? 'restricted' : ''}`;
        cell.setAttribute('data-date', dateStr);
        cell.innerHTML = `
            <span class="day-number">${day}</span>
            <div class="day-content"></div>
        `;
        return cell;
    }



    // Facilitators & Admin Access Logic
    const adminLoginModal = document.getElementById('admin-login-modal');
    const adminLoginForm = document.getElementById('admin-login-form');
    let isFacilitatorAuthenticated = false;

    const facilitatorsModal = document.getElementById('facilitators-modal');
    const facilitatorsBtn = document.getElementById('view-facilitators-btn');
    const facilitatorsList = document.getElementById('facilitators-list');

    if (facilitatorsBtn) {
        facilitatorsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Find the tab button for facilitators and click it
            const facTabBtn = document.querySelector('.tab-btn[data-tab="facilitators"]');
            if (facTabBtn) {
                facTabBtn.click();
            }
        });
    }

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pass = document.getElementById('admin-password').value;
            const errorMsg = document.getElementById('admin-error');

            // Hardcoded management password for Demo
            if (pass === 'admin') {
                isFacilitatorAuthenticated = true;
                adminLoginModal.classList.remove('active');
                adminLoginForm.reset();
                errorMsg.style.display = 'none';

                // Proceed to facilitators modal
                facilitatorsModal.classList.add('active');
                loadFacilitators();
            } else {
                errorMsg.style.display = 'block';
                document.getElementById('admin-password').classList.add('shake');
                setTimeout(() => document.getElementById('admin-password').classList.remove('shake'), 400);
            }
        });
    }

    async function loadFacilitators() {
        const modalList = document.getElementById('facilitators-list');
        const mainList = document.getElementById('main-facilitators-list');
        
        if (modalList) modalList.innerHTML = '<div class="loader-container">Fetching instructors...</div>';
        if (mainList) mainList.innerHTML = '<div class="loader-container">Fetching our faculty...</div>';

        try {
            const res = await fetch('api.php?action=get_facilitators');
            const data = await res.json();

            if (data.success) {
                renderFacilitators(data.facilitators);
            }
        } catch (e) {
            console.error(e);
        }
    }

    function renderFacilitators(facilitators) {
        const modalList = document.getElementById('facilitators-list');
        const mainList = document.getElementById('main-facilitators-list');
        const adminControls = document.getElementById('admin-facilitator-controls');

        if (adminControls) {
            adminControls.style.display = isFacilitatorAuthenticated ? 'flex' : 'none';
        }

        const buildCard = (f) => {
            const initial = f.name.charAt(0).toUpperCase();
            const card = document.createElement('div');
            card.className = 'fac-profile-card';
            card.innerHTML = `
                ${isFacilitatorAuthenticated ? `
                <div class="fac-admin-pill">
                    <button class="btn-icon" title="Edit Instructor" onclick="handleEditFacilitator(${f.id}, '${f.name.replace(/'/g, "\\'")}', '${f.expertise ? f.expertise.replace(/'/g, "\\'") : ''}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-icon" title="Remove Instructor" style="color: var(--danger);" onclick="handleDeleteFacilitator(${f.id}, '${f.name.replace(/'/g, "\\'")}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                    <button class="btn-icon" title="Schedule" onclick="handleManageHours(${f.id}, '${f.name.replace(/'/g, "\\'")}')">
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                </div>
                ` : ''}
                <div class="fac-visual-box">
                    ${f.image ? `<img src="${f.image}" alt="${f.name}" class="fac-avatar-img">` : `
                    <div class="fac-default-logo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    `}
                </div>
                <strong class="fac-name-new">${f.name}</strong>
                <span class="fac-subject-new">${f.expertise || 'Library Faculty'}</span>
                
                <button class="btn-select-fac" onclick="handleShatterAndBook(this, ${f.id}, '${f.name}')">Select</button>
            `;
            return card;
        };

        if (modalList) {
            modalList.innerHTML = '';
            facilitators.forEach(f => modalList.appendChild(buildCard(f)));
        }
        if (mainList) {
            mainList.innerHTML = '';
            facilitators.forEach(f => mainList.appendChild(buildCard(f)));
            
            // Add search listener
            const searchInput = document.getElementById('fac-directory-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const term = e.target.value.toLowerCase();
                    const cards = mainList.querySelectorAll('.fac-profile-card');
                    cards.forEach(card => {
                        const name = card.querySelector('.fac-name-new').textContent.toLowerCase();
                        const subject = card.querySelector('.fac-subject-new').textContent.toLowerCase();
                        if (name.includes(term) || subject.includes(term)) {
                            card.style.display = 'block';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            }
        }
    }

    const facFormPanel = document.getElementById('facilitator-form-panel');
    const facCrudForm = document.getElementById('fac-crud-form');
    const facFormTitle = document.getElementById('fac-form-title');
    const facSaveBtn = document.getElementById('fac-save-btn');

    window.showFacilitatorForm = () => {
        facFormPanel.style.display = 'block';
        facFormTitle.textContent = 'Add New Instructor';
        facCrudForm.reset();
        document.getElementById('edit-fac-id').value = '';
        document.getElementById('fac-name').focus();

        const facTopics = document.getElementById('fac-topic-ids');
        if (facTopics) {
            facTopics.innerHTML = '';
            allTopics.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.name;
                facTopics.appendChild(opt);
            });
        }
    };

    window.hideFacilitatorForm = () => {
        facFormPanel.style.display = 'none';
        facCrudForm.reset();
    };

    window.handleEditFacilitator = (id, name, expertise) => {
        facFormPanel.style.display = 'block';
        facFormTitle.textContent = `Edit Profile: ${name}`;
        document.getElementById('edit-fac-id').value = id;
        document.getElementById('fac-name').value = name;

        const facTopics = document.getElementById('fac-topic-ids');
        if (facTopics) {
            facTopics.innerHTML = '';
            allTopics.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.name;
                // Pre-select if expertise string contains topic name
                if (expertise && expertise.includes(t.name)) {
                    opt.selected = true;
                }
                facTopics.appendChild(opt);
            });
        }

        facFormPanel.scrollIntoView({ behavior: 'smooth' });
    };

    window.handleDeleteFacilitator = async (id, name) => {
        if (!confirm(`Are you sure you want to completely remove ${name}? This will also wipe all their scheduled sessions.`)) return;

        try {
            const res = await fetch('api.php?action=delete_facilitator', {
                method: 'POST',
                body: JSON.stringify({ id: id })
            });
            const data = await res.json();
            if (data.success) {
                loadFacilitators();
                await updateCalendar(true);
            }
        } catch (e) { console.error(e); }
    };

    if (facCrudForm) {
        facCrudForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-fac-id').value;
            const name = document.getElementById('fac-name').value;

            const facTopics = document.getElementById('fac-topic-ids');
            const topicIds = Array.from(facTopics.selectedOptions).map(opt => parseInt(opt.value));

            const action = id ? 'update_facilitator' : 'add_facilitator';
            const payload = id ? { id, name, topic_ids: topicIds } : { name, topic_ids: topicIds };

            try {
                const res = await fetch(`api.php?action=${action}`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    hideFacilitatorForm();
                    loadFacilitators();
                } else {
                    alert('Error saving facilitator data.');
                }
            } catch (e) { console.error(e); }
        });
    }

    const managePanel = document.getElementById('facilitator-manage-panel');
    const manageFacName = document.getElementById('manage-facilitator-name');
    const manageFacIdInput = document.getElementById('manage-facilitator-id');
    const manageSessionsList = document.getElementById('manage-sessions-list');
    const addSessionForm = document.getElementById('add-session-form');

    window.handleManageHours = (id, name) => {
        facilitatorsList.style.display = 'none';
        managePanel.style.display = 'block';
        manageFacName.textContent = `Manage Hours for ${name}`;
        manageFacIdInput.value = id;

        const newTopicSelect = document.getElementById('new-session-topic');
        if (newTopicSelect) {
            newTopicSelect.innerHTML = '';
            // Since a session must have a topic, we populate it with all topics
            allTopics.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.name; // Keep as name string since add_session takes a string topic and DB is string
                opt.textContent = t.name;
                newTopicSelect.appendChild(opt);
            });
        }

        loadFacilitatorSessions(id);
    };

    window.closeManagePanel = () => {
        facilitatorsList.style.display = 'grid';
        managePanel.style.display = 'none';
    };

    async function loadFacilitatorSessions(fid) {
        manageSessionsList.innerHTML = '<div class="loader-container">Loading slots...</div>';

        // Use allSessions if already loaded, or fetch fresh
        if (allSessions.length === 0) await updateCalendar(true);

        const mine = allSessions.filter(s => s.facilitator_id == fid);
        renderManageSlots(mine, fid);
    }

    function renderManageSlots(sessions, fid) {
        if (sessions.length === 0) {
            manageSessionsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No hours scheduled yet.</p>';
            return;
        }

        let html = `
            <div style="background: #fff; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; background: #f8fafc; border-bottom: 2px solid var(--border); color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">
                            <th style="padding: 1rem;">Topic</th>
                            <th style="padding: 1rem;">Schedule</th>
                            <th style="padding: 1rem;">Mode</th>
                            <th style="padding: 1rem;">Status</th>
                            <th style="padding: 1rem; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        sessions.forEach(s => {
            const statusColor = s.status === 'AVAILABLE' ? 'var(--success)' : 'var(--danger)';
            html += `
                <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s ease;">
                    <td style="padding: 1rem; font-weight: 600;">${s.topic}</td>
                    <td style="padding: 1rem; font-size: 0.9rem;">${s.date_time}</td>
                    <td style="padding: 1rem;"><span class="badge ${s.mode.toLowerCase() === 'online' ? 'badge-online' : 'badge-onsite'}">${s.mode}</span></td>
                    <td style="padding: 1rem;"><span style="color: ${statusColor}; font-weight: 700; font-size: 0.8rem;">${s.status}</span></td>
                    <td style="padding: 1rem; text-align: right;">
                        ${s.status === 'AVAILABLE' ? `<button class="btn btn-muted btn-sm" style="color: var(--danger); border-color: rgba(207, 34, 46, 0.2);" onclick="handleDeleteSession(${s.id}, ${fid})">Remove</button>` : '<span style="color: var(--text-secondary); font-style: italic; font-size: 0.8rem;">Locked</span>'}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        manageSessionsList.innerHTML = html;
    }

    window.handleDeleteSession = async (sid, fid) => {
        if (!confirm('Are you sure you want to remove this available slot?')) return;

        const res = await fetch('api.php?action=remove_session', {
            method: 'POST',
            body: JSON.stringify({ session_id: sid })
        });
        const data = await res.json();

        if (data.success) {
            await updateCalendar(true); // Master refresh
            loadFacilitatorSessions(fid); // Panel refresh
        }
    };

    if (addSessionForm) {
        addSessionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fid = manageFacIdInput.value;
            const topic = document.getElementById('new-session-topic').value;
            const dt = document.getElementById('new-session-dt').value;
            const mode = document.getElementById('new-session-mode').value;

            const res = await fetch('api.php?action=add_session', {
                method: 'POST',
                body: JSON.stringify({ facilitator_id: fid, topic, date_time: dt, mode })
            });
            const data = await res.json();

            if (data.success) {
                addSessionForm.reset();
                await updateCalendar(true);
                loadFacilitatorSessions(fid);
            } else {
                alert('Error adding session slot.');
            }
        });
    }

    window.handleShatterAndBook = (btn, id, name) => {
        // Prevent multiple clicks
        if (btn.classList.contains('shattered')) return;
        btn.classList.add('shattered');

        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Create particles
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            createParticle(centerX, centerY);
        }

        // Hide button after a tiny delay
        setTimeout(() => {
            btn.style.opacity = '0';
            btn.style.transform = 'scale(0)';
        }, 50);

        // Redirect after the effect
        setTimeout(() => {
            openAdvancedBooking(selectedDate, id);
        }, 800);
    };

    function createParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'shatter-particle';

        // Random trajectory
        const angle = Math.random() * Math.PI * 2;
        const velocity = 2 + Math.random() * 5;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        // Custom colors (blueish light)
        const colors = ['#ffffff', '#79c0ff', '#2f81f7', '#e0f2fe'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];

        document.body.appendChild(particle);

        let posX = x;
        let posY = y;
        let opacity = 1;

        function animate() {
            posX += vx;
            posY += vy;
            opacity -= 0.02;

            particle.style.left = `${posX}px`;
            particle.style.top = `${posY}px`;
            particle.style.opacity = opacity;

            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        }

        requestAnimationFrame(animate);
    }

    window.viewInstructorSlots = (id, name) => {
        facilitatorsModal.classList.remove('active');
        // Filter current list to only this instructor
        const filtered = allSessions.filter(s => s.facilitator_id == id);
        selectedDateLabel.textContent = `Sessions with ${name}`;
        renderSessions(filtered);
        // Scroll to sessions
        document.getElementById('sessions-grid').scrollIntoView({ behavior: 'smooth' });
    };



    closeSuccessBtn.addEventListener('click', () => {
        successModal.classList.remove('active');
        updateCalendar(true);
    });

    // Provide the dynamic style injector needed for local load instances
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spinner { to { transform: rotate(360deg); } } 
        .spin { animation: spinner .6s linear infinite; }
        
        .shatter-particle {
            position: fixed;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            box-shadow: 0 0 10px rgba(255,255,255,0.8);
        }
        
        .shattered {
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
    `;
    document.head.appendChild(style);

    let allFacilitators = [];

    let allTopics = [];

    async function loadTopics() {
        if (!advTopicSelect) return;
        try {
            const res = await fetch('api.php?action=get_topics');
            const data = await res.json();
            if (data.success) {
                allTopics = data.topics;
                advTopicSelect.innerHTML = '<option value="" disabled selected>Select a topic...</option>';
                allTopics.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = t.name;
                    advTopicSelect.appendChild(opt);
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    // Load topics initially
    loadTopics();

    if (advTopicSelect) {
        advTopicSelect.addEventListener('change', async (e) => {
            const topicIdVal = e.target.value;

            const modalFacList = document.getElementById('modal-instructor-list');
            if (modalFacList) modalFacList.innerHTML = '<div class="loader-container">Syncing faculty...</div>';

            try {
                let url = 'api.php?action=get_facilitators';
                if (topicIdVal !== 'All') {
                    url += `&topic_id=${topicIdVal}`;
                }
                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    renderModalInstructors(data.facilitators);
                } else {
                    if (modalFacList) modalFacList.innerHTML = '<p>Error loading instructors.</p>';
                }
            } catch (err) {
                if (modalFacList) modalFacList.innerHTML = '<p>Error loading instructors.</p>';
            }

            selectedFacId = null;
        });
    }

    // Attach event listeners for the advanced booking type and time inputs
    const advBookingType = document.getElementById('adv-booking-type');
    const bookingStartTime = document.getElementById('booking-start-time');
    const bookingEndTime = document.getElementById('booking-end-time');

    if (advBookingType) {
        advBookingType.addEventListener('change', handleBookingTypeChange);
    }
    if (bookingStartTime) {
        bookingStartTime.addEventListener('change', validateBookingTime);
    }
    if (bookingEndTime) {
        bookingEndTime.addEventListener('change', validateBookingTime);
    }

    function handleBookingTypeChange() {
        if (!advBookingType) return;
        const type = advBookingType.value;
        const topicSec = document.getElementById('topic-section');
        const instSec = document.getElementById('instructor-section');
        const timeSec = document.getElementById('time-selection-section');

        if (!topicSec || !instSec || !timeSec) return;

        if (type === 'Instructional Program') {
            topicSec.style.display = 'block';
            instSec.style.display = 'block';
        } else {
            topicSec.style.display = 'none';
            instSec.style.display = 'none';
        }

        // Show time selection when a type is picked
        if (type) {
            timeSec.style.display = 'block';
            validateBookingTime();
        } else {
            timeSec.style.display = 'none';
        }
    }

    function validateBookingTime() {
        if (!advBookingType) return true;
        const type = advBookingType.value;
        const startObj = bookingStartTime;
        const endObj = bookingEndTime;
        const errorEl = document.getElementById('time-error-msg');

        if (!errorEl || !startObj || !endObj) return true;

        if (!startObj.value || !endObj.value) {
            errorEl.style.display = 'none';
            return true;
        }

        const startStr = startObj.value;
        const endStr = endObj.value;

        const [h1, m1] = startStr.split(':').map(Number);
        const [h2, m2] = endStr.split(':').map(Number);

        const startMins = h1 * 60 + m1;
        const endMins = h2 * 60 + m2;

        const diff = endMins - startMins;

        errorEl.style.display = 'none';

        if (diff <= 0) {
            errorEl.innerHTML = '<svg style="width:14px;height:14px;display:inline;margin-right:4px;vertical-align:-2px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>End time must be after start time.';
            errorEl.style.display = 'block';
            return false;
        } else if (type === 'Instructional Program') {
            if (diff < 30) {
                errorEl.innerHTML = '<svg style="width:14px;height:14px;display:inline;margin-right:4px;vertical-align:-2px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>Instructional programs must be at least 30 minutes.';
                errorEl.style.display = 'block';
                return false;
            } else if (diff > 240) {
                errorEl.innerHTML = '<svg style="width:14px;height:14px;display:inline;margin-right:4px;vertical-align:-2px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>Instructional programs cannot exceed 4 hours.';
                errorEl.style.display = 'block';
                return false;
            }
        }
        return true;
    }

    function openAdvancedBooking(date, preSelectFacId = null) {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        
        const dateDisplay = document.getElementById('booking-date-display');
        if (dateDisplay) dateDisplay.textContent = formattedDate;

        selectedFacId = preSelectFacId;

        // Reset new fields
        const typeSelect = document.getElementById('adv-booking-type');
        if (typeSelect) {
            typeSelect.value = preSelectFacId ? 'Instructional Program' : '';
        }

        const startTime = document.getElementById('booking-start-time');
        const endTime = document.getElementById('booking-end-time');
        if (startTime) startTime.value = '';
        if (endTime) endTime.value = '';

        const errorEl = document.getElementById('time-error-msg');
        if (errorEl) errorEl.style.display = 'none';

        if (advTopicSelect) advTopicSelect.value = '';

        loadModalInstructors();
        renderTimeAxisZones(); 
        advBookingModal.classList.add('active');

        // Ensure UI state is updated
        if (typeof handleBookingTypeChange === 'function') {
            handleBookingTypeChange();
        }
    }

    window.closeAdvancedBooking = () => {
        advBookingModal.classList.remove('active');
    };

    function renderTimeAxisZones() {
        const container = document.getElementById('axis-zones-container');
        if (!container) return;
        container.innerHTML = '';

        // Consts for 9AM - 8PM (11 hours)
        const startH = 9;
        const totalH = 11;

        // 1. Lunch Break (Fixed 12PM - 1PM)
        addZone(12, 13, 'zone-lunch');

        // 2. Instructor Bookings
        if (selectedFacId) {
            const bookings = allSessions.filter(s => 
                s.facilitator_id == selectedFacId && 
                s.date_time.startsWith(selectedDate) &&
                s.booking_status !== 'Cancelled'
            );
            
            bookings.forEach(b => {
                const bDate = new Date(b.date_time);
                const sH = bDate.getHours() + (bDate.getMinutes() / 60);
                
                // Estimate end time if missing (default 1h)
                let eH = sH + 1;
                if (b.end_time) {
                    const eDate = new Date(b.end_time);
                    eH = eDate.getHours() + (eDate.getMinutes() / 60);
                }
                addZone(sH, eH, 'zone-booked');
            });
        }

        // 3. Current Selection
        const sTime = document.getElementById('booking-start-time').value;
        const eTime = document.getElementById('booking-end-time').value;
        if (sTime && eTime) {
            const [h1, m1] = sTime.split(':').map(Number);
            const [h2, m2] = eTime.split(':').map(Number);
            const startVal = h1 + (m1 / 60);
            const endVal = h2 + (m2 / 60);
            addZone(startVal, endVal, 'zone-selected');
        }

        function addZone(s, e, className) {
            if (e <= startH || s >= startH + totalH) return;
            const left = Math.max(0, ((s - startH) / totalH) * 100);
            const width = Math.min(100 - left, ((e - s) / totalH) * 100);
            
            if (width <= 0) return;

            const zone = document.createElement('div');
            zone.className = `axis-zone ${className}`;
            zone.style.left = `${left}%`;
            zone.style.width = `${width}%`;
            container.appendChild(zone);
        }
    }

    // Attach listeners for axis live updates
    document.addEventListener('input', (e) => {
        if (e.target.id === 'booking-start-time' || e.target.id === 'booking-end-time') {
            renderTimeAxisZones();
            validateBookingTime();
        }
    });

    const modalFacList = document.getElementById('modal-instructor-list');

    async function loadModalInstructors() {
        if (!modalFacList) return;

        // Trigger the change event to fetch initial instructors based on selected topic
        if (advTopicSelect) {
            advTopicSelect.dispatchEvent(new Event('change'));
        }
    }

    function renderModalInstructors(facilitators) {
        modalFacList.innerHTML = '';
        facilitators.forEach(f => {
            const div = document.createElement('div');
            div.className = 'fac-card-new';
            div.innerHTML = `
                <div class="fac-avatar-new">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div class="fac-info-new">
                    <h5>${f.name}</h5>
                    <p>${f.expertise || 'Library Faculty'}</p>
                </div>
            `;

            div.addEventListener('click', () => {
                document.querySelectorAll('.fac-card-new').forEach(c => c.classList.remove('selected'));
                div.classList.add('selected');
                selectedFacId = f.id;
                renderTimeAxisZones();
            });

            if (selectedFacId && f.id == selectedFacId) {
                div.classList.add('selected');
                renderTimeAxisZones();
            }

            modalFacList.appendChild(div);
        });
    }

    // generateAdvancedSlots removed as we now use custom time range inputs


    // Helper to format time for comparison
    function formatTimeTo24h(timeStr) {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') {
            hours = modifier === 'AM' ? '00' : '12';
        } else if (modifier === 'PM') {
            hours = parseInt(hours, 10) + 12;
        }
        return `${String(hours).padStart(2, '0')}:${minutes}:00`;
    }

    if (advBookingForm) {
        advBookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const type = document.getElementById('adv-booking-type').value;
            const startTime = document.getElementById('booking-start-time').value;
            const endTime = document.getElementById('booking-end-time').value;

            if (!type) {
                alert('Please select a booking type.');
                return;
            }

            if (!startTime || !endTime) {
                alert('Please select both start and end times.');
                return;
            }

            if (type === 'Instructional Program' && !selectedFacId) {
                alert('Please select an instructor for the Instructional Program.');
                return;
            }

            if (typeof validateBookingTime === 'function' && !validateBookingTime()) {
                return;
            }

            const btn = document.getElementById('btn-confirm-advanced');
            const orig = btn.textContent;
            btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="spin"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="3"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" stroke-width="3"></path></svg> Linking...';
            btn.disabled = true;

            const mode = document.querySelector('input[name="book-mode"]:checked').value;

            let finalTopic = type;
            let finalFacId = selectedFacId || 1; // Default to first available or handle in API

            if (type === 'Instructional Program') {
                finalTopic = (advTopicSelect && advTopicSelect.value) ? advTopicSelect.options[advTopicSelect.selectedIndex].text : 'Library Consultation';
            }

            const payload = {
                type: type,
                topic: finalTopic,
                name: document.getElementById('book-name').value,
                email: document.getElementById('book-email').value,
                phone: document.getElementById('book-phone').value,
                notes: document.getElementById('book-notes').value,
                reminder: document.getElementById('book-reminder').value,
                mode: mode,
                facilitator_id: finalFacId,
                date: selectedDate,
                date_time: `${selectedDate} ${startTime}:00`,
                end_time: `${selectedDate} ${endTime}:00`
            };

            try {
                const res = await fetch('api.php?action=advanced_booking', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                btn.textContent = orig;
                btn.disabled = false;

                if (data.success) {
                    advBookingModal.classList.remove('active');
                    advBookingForm.reset();
                    selectedFacId = null;

                    document.getElementById('success-modal').classList.add('active');
                    await updateCalendar(true);

                    // Re-sync timeline if on hero
                    if (typeof updateTodayTimeline === 'function') updateTodayTimeline();

                } else {
                    alert('Error: ' + (data.message || 'The system could not establish the link.'));
                }
            } catch (e) {
                console.error(e);
                btn.textContent = orig;
                btn.disabled = false;
            }
        });
    }

    async function loadAppointments() {
        const grid = document.getElementById('my-appointments-grid');
        if (!grid) return;

        grid.innerHTML = '<div class="loader-container">Loading appointments...</div>';

        // Ensure facilitators are loaded for admin view
        if (isFacilitatorAuthenticated && (!allFacilitators || allFacilitators.length === 0)) {
            try {
                const resF = await fetch('api.php?action=get_facilitators');
                const dataF = await resF.json();
                if (dataF.success) allFacilitators = dataF.facilitators;
            } catch (e) { }
        }

        try {
            const res = await fetch('api.php?action=get_appointments');
            const data = await res.json();

            if (data.success) {
                renderAppointments(data.appointments);
            } else {
                grid.innerHTML = '<p>Failed to load appointments.</p>';
            }
        } catch (e) {
            console.error(e);
            grid.innerHTML = '<p>Error loading appointments.</p>';
        }
    }

    function renderAppointments(apps) {
        const grid = document.getElementById('my-appointments-grid');
        if (apps.length === 0) {
            grid.innerHTML = '<div class="loader-container">No appointments found.</div>';
            return;
        }

        grid.innerHTML = '';
        apps.forEach(app => {
            const dateObj = new Date(app.date_time.replace(/-/g, '/'));
            const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString() : app.date_time.split(' ')[0];
            const timeStr = !isNaN(dateObj) ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : app.date_time.split(' ')[1];

            let endTimeStr = 'N/A';
            if (app.end_time) {
                const eObj = new Date(app.end_time.replace(/-/g, '/'));
                endTimeStr = !isNaN(eObj) ? eObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : app.end_time.split(' ')[1] || 'N/A';
            }

            const card = document.createElement('div');
            card.className = 'session-card';

            let html = `
                <div class="session-info">
                    <h4>${app.appointment_type || 'Consultation'} ${app.topic && app.topic !== app.appointment_type ? `- ${app.topic}` : ''}</h4>
                    <p style="margin-bottom: 0.5rem"><strong>Date:</strong> ${dateStr} (${timeStr} - ${endTimeStr})</p>
                    <p style="margin-bottom: 0.5rem"><strong>Mode:</strong> ${app.mode}</p>
                    <p style="margin-bottom: 0.5rem"><strong>Status:</strong> ${app.booking_status}</p>
            `;

            if (isFacilitatorAuthenticated) {
                html += `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border);">
                        <strong>Admin Controls:</strong>
                        <div class="form-group" style="margin-top: 0.5rem;">
                            <label>Status</label>
                            <select id="status-${app.booking_id}" class="login-input">
                                <option value="PENDING" ${app.booking_status === 'PENDING' ? 'selected' : ''}>Pending</option>
                                <option value="CONFIRMED" ${app.booking_status === 'CONFIRMED' ? 'selected' : ''}>Confirmed</option>
                                <option value="Cancelled" ${app.booking_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Venue</label>
                            <input type="text" id="venue-${app.booking_id}" class="login-input" value="${app.venue || 'TBA'}">
                        </div>
                        <div class="form-group">
                            <label>Facilitator</label>
                            <select id="fac-${app.booking_id}" class="login-input">
                                <option value="null">TBA</option>
                                ${(allFacilitators || []).map(f => `<option value="${f.id}" ${app.facilitator_id == f.id ? 'selected' : ''}>${f.name}</option>`).join('')}
                            </select>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="saveAppointmentAdmin(${app.booking_id})" style="width: 100%; margin-top: 0.5rem;">Save Changes</button>
                    </div>
                `;
            } else {
                html += `
                    <p style="margin-bottom: 0.5rem"><strong>Venue:</strong> ${app.venue || 'TBA'}</p>
                    <p style="margin-bottom: 0.5rem"><strong>Instructor:</strong> ${app.facilitator_name || 'TBA'}</p>
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        ${app.booking_status !== 'Cancelled' ? `<button class="btn btn-outline btn-sm" onclick="cancelAppointmentUser(${app.booking_id})" style="color: var(--danger); border-color: var(--danger);">Cancel</button>` : ''}
                        ${app.appointment_type === 'Instructional Program' && app.facilitator_id && app.booking_status !== 'Cancelled' ? `<button class="btn btn-muted btn-sm" onclick="changeInstructor(${app.booking_id})">Change Instructor</button>` : ''}
                    </div>
                `;
            }

            html += `</div>`;
            card.innerHTML = html;
            grid.appendChild(card);
        });
    }

    window.saveAppointmentAdmin = async (bookingId) => {
        const st = document.getElementById(`status-${bookingId}`).value;
        const vn = document.getElementById(`venue-${bookingId}`).value;
        const fc = document.getElementById(`fac-${bookingId}`).value;

        try {
            const res = await fetch('api.php?action=update_appointment', {
                method: 'POST',
                body: JSON.stringify({ id: bookingId, status: st, venue: vn, facilitator_id: fc })
            });
            const data = await res.json();
            if (data.success) {
                loadAppointments();
            } else {
                alert('Failed to update.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    window.cancelAppointmentUser = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this appointment?')) return;
        try {
            const res = await fetch('api.php?action=cancel_appointment', {
                method: 'POST',
                body: JSON.stringify({ id: bookingId })
            });
            const data = await res.json();
            if (data.success) {
                loadAppointments();
                updateCalendar(true);
            }
        } catch (e) { }
    };

    window.changeInstructor = async (bookingId) => {
        if (!confirm('This will move the appointment back to Pending status until an Admin assigns a new instructor. Continue?')) return;
        try {
            const res = await fetch('api.php?action=change_instructor', {
                method: 'POST',
                body: JSON.stringify({ id: bookingId })
            });
            const data = await res.json();
            if (data.success) {
                loadAppointments();
            }
        } catch (e) { }
    };

    function updateTodayTimeline() {
        const timelineTrack = document.getElementById('today-timeline-track');
        const eventsContainer = document.getElementById('timeline-events-container');
        const clockDisplay = document.getElementById('timeline-clock');
        const nowIndicator = document.getElementById('timeline-now-indicator');

        if (!timelineTrack || !eventsContainer) return;

        // Start/End of timeline logic
        const now = new Date();
        const day = now.getDay();
        let startHour, startMin, endHour, endMin;

        if (day >= 1 && day <= 5) { // Mon-Fri
            startHour = 7; startMin = 30;
            endHour = 19; endMin = 0;
        } else if (day === 6) { // Sat
            startHour = 8; startMin = 0;
            endHour = 17; endMin = 0;
        } else { // Sun (or default)
            startHour = 8; startMin = 0;
            endHour = 17; endMin = 0;
        }

        const startMins = startHour * 60 + startMin;
        const endMins = endHour * 60 + endMin;
        const totalMinutes = endMins - startMins;

        // Update Axis Labels
        const axisLabels = document.querySelector('.timeline-axis');
        if (axisLabels) {
            const startStr = day >= 1 && day <= 5 ? "7:30 AM" : "8 AM";
            const midStr = day >= 1 && day <= 5 ? "1 PM" : "12 PM";
            const endStr = day >= 1 && day <= 5 ? "7 PM" : "5 PM";
            axisLabels.innerHTML = `<span class="axis-label">${startStr}</span><span class="axis-label">${midStr}</span><span class="axis-label">${endStr}</span>`;
        }

        // Generate Ticks
        const ticksContainer = document.querySelector('.timeline-ticks');
        if (ticksContainer) {
            ticksContainer.innerHTML = '';
            const hoursCount = Math.ceil(totalMinutes / 60);
            for (let i = 0; i <= hoursCount; i++) {
                const tick = document.createElement('div');
                tick.className = 'tick';
                ticksContainer.appendChild(tick);
            }
        }

        // Current time for the clock
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (clockDisplay) clockDisplay.textContent = timeStr;

        // Position "now" indicator
        const currentMins = now.getHours() * 60 + now.getMinutes();

        if (currentMins >= startMins && currentMins <= endMins) {
            const posPct = ((currentMins - startMins) / totalMinutes) * 100;
            nowIndicator.style.left = `${posPct}%`;
            nowIndicator.style.display = 'block';
        } else {
            nowIndicator.style.display = 'none';
        }

        // Filter sessions for today
        const todayStr = now.toISOString().split('T')[0];
        const todaySessions = allSessions.filter(s => 
            s.date_time.startsWith(todayStr) && s.booking_status !== 'Cancelled'
        );

        eventsContainer.innerHTML = '';
        todaySessions.forEach(s => {
            const sDate = new Date(s.date_time);
            const sMins = sDate.getHours() * 60 + sDate.getMinutes();
            
            if (sMins >= startMins && sMins <= endMins) {
                const posPct = ((sMins - startMins) / totalMinutes) * 100;
                const marker = document.createElement('div');
                marker.className = `timeline-event-marker ${s.booking_status === 'BOOKED' ? 'booked' : ''}`;
                marker.style.left = `${posPct}%`;
                
                const tooltip = document.createElement('div');
                tooltip.className = 'timeline-tooltip';
                tooltip.innerHTML = `<strong>${s.topic}</strong><br>${sDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}<br>${s.facilitator_name || 'TBA'}`;
                
                marker.appendChild(tooltip);
                eventsContainer.appendChild(marker);
            }
        });
    }

    // Refresh timeline periodically
    setInterval(updateTodayTimeline, 60000);

    // Initial load
    updateCalendar(true);
});
