document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
    loadSeminars();
    loadFacilitators();
    initTabs();
});

function notify(message, type = 'success') {
    const container = document.getElementById('admin-toasts');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        ${message}
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function initTabs() {
    const links = document.querySelectorAll('.nav-link[data-tab]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.getAttribute('data-tab');
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
            const target = document.getElementById(`tab-${tab}`);
            if (target) target.style.display = 'block';
        });
    });
}

async function loadRequests() {
    const grid = document.getElementById('requests-grid');
    // Fallback if we're on the old UI table somehow
    const oldTbody = document.getElementById('requests-tbody');
    
    const container = grid || oldTbody;
    if (!container) return;
    
    container.innerHTML = '<div style="padding: 2rem; color: #64748b;">Loading requests...</div>';
    
    try {
        const res = await fetch('api.php?action=get_appointments');
        const data = await res.json();
        
        if (data.success) {
            container.innerHTML = '';
            
            if (data.appointments.length === 0) {
                container.innerHTML = '<div style="padding: 2rem; color: #64748b;">No active appointments found.</div>';
                return;
            }

            data.appointments.forEach(app => {
                if (grid) {
                    const card = document.createElement('div');
                    card.className = 'app-card';
                    
                    const d = new Date(app.date_time);
                    const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    
                    let statusColor = '#eab308'; // PENDING yellow
                    if(app.booking_status === 'CONFIRMED') statusColor = '#22c55e'; // Green
                    if(app.booking_status === 'CANCELLED') statusColor = '#ef4444'; // Red
                    
                    card.innerHTML = `
                        <div class="app-card-type">${app.appointment_type}</div>
                        <div class="app-card-status" style="color: ${statusColor};">
                            ${app.booking_status}
                            <span class="app-card-notify">Notification set for 8:30 AM</span>
                        </div>
                        <div class="app-card-desc">(${app.topic})</div>
                        
                        <div class="app-card-detail">DATE: <span>${dateStr}</span></div>
                        <div class="app-card-detail">TIME: <span>${timeStr}</span></div>
                        <div class="app-card-detail">MODE OF APPOINTMENT: <span>${app.mode}</span></div>
                        <div class="app-card-detail">VENUE/PLATFORM: <span>${app.venue}</span></div>
                        <div class="app-card-detail">FACILITATOR: <span>${app.facilitator_name || 'TBA'}</span></div>
                        <div class="app-card-detail" style="margin-top:-0.2rem; font-size: 0.75rem; font-style:italic;"><span>&lt;Position&gt;</span></div>
                        
                        <div class="app-card-detail" style="margin-top: 1rem;">NOTES: <span style="font-style: italic;">"${app.special_requests || 'No notes provided'}"</span></div>
                    `;
                    
                    const manageBtn = document.createElement('button');
                    manageBtn.className = 'btn btn-outline btn-sm';
                    manageBtn.textContent = 'Manage';
                    manageBtn.onclick = () => editAppointment(app.session_id, app.booking_status, app.venue, app.facilitator_id);
                    card.appendChild(manageBtn);
                    
                    grid.appendChild(card);
                } else {
                    // Fallback for table if grid is not found
                    const tr = document.createElement('tr');
                    const statusClass = app.booking_status === 'PENDING' ? 'pill-pending' : 'pill-confirmed';
                    tr.innerHTML = `
                        <td>
                            <div style="font-weight: 600;">${app.student_name}</div>
                            <div style="font-size: 0.75rem; color: #64748b;">Student</div>
                        </td>
                        <td>
                            <div style="font-weight: 600;">${app.appointment_type}</div>
                            <div style="font-size: 0.75rem; color: #64748b;">${app.topic}</div>
                        </td>
                        <td>${new Date(app.date_time).toLocaleString()}</td>
                        <td>${app.facilitator_name || '<em style="color:#94a3b8">To Be Assigned</em>'}</td>
                        <td><span class="status-pill ${statusClass}">${app.booking_status}</span></td>
                        <td class="action-btns"></td>
                    `;
                    
                    const btnContainer = tr.querySelector('.action-btns');
                    const manageBtn = document.createElement('button');
                    manageBtn.className = 'btn btn-outline btn-sm';
                    manageBtn.textContent = 'Manage';
                    manageBtn.onclick = () => editAppointment(app.session_id, app.booking_status, app.venue, app.facilitator_id);
                    btnContainer.appendChild(manageBtn);
                    
                    if (app.booking_status === 'PENDING') {
                        const acceptBtn = document.createElement('button');
                        acceptBtn.className = 'btn btn-primary btn-sm';
                        acceptBtn.textContent = 'Accept';
                        acceptBtn.onclick = () => quickAccept(app.session_id);
                        btnContainer.appendChild(acceptBtn);
                    }
                    
                    oldTbody.appendChild(tr);
                }
            });
        }
    } catch (e) {
        console.error(e);
    }
}

async function quickAccept(id) {
    try {
        const res = await fetch('api.php?action=update_appointment', {
            method: 'POST',
            body: JSON.stringify({ id, status: 'CONFIRMED' })
        });
        const data = await res.json();
        if (data.success) {
            notify('Appointment confirmed successfully');
            loadRequests();
        }
    } catch (e) { console.error(e); }
}

async function loadSeminars() {
    const tbody = document.getElementById('seminars-tbody');
    if (!tbody) return;
    try {
        const res = await fetch('api.php?action=get_seminars');
        const data = await res.json();
        if (data.success) {
            tbody.innerHTML = '';
            data.seminars.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.title}</strong></td>
                    <td>${s.speaker}</td>
                    <td>${new Date(s.date_time).toLocaleString()}</td>
                    <td>${s.venue}</td>
                    <td class="action-btns"></td>
                `;
                
                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-sm btn-icon';
                delBtn.style.color = 'var(--danger)';
                delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
                delBtn.onclick = () => deleteSeminar(s.id);
                tr.querySelector('.action-btns').appendChild(delBtn);
                
                tbody.appendChild(tr);
            });
        }
    } catch (e) {}
}

async function deleteSeminar(id) {
    if (!confirm('Are you sure you want to remove this seminar?')) return;
    try {
        const res = await fetch('api.php?action=delete_seminar', {
            method: 'POST',
            body: JSON.stringify({ id })
        });
        if ((await res.json()).success) {
            notify('Seminar removed');
            loadSeminars();
        }
    } catch (e) {}
}

async function loadFacilitators() {
    const tbody = document.getElementById('facilitators-tbody');
    if (!tbody) return;
    try {
        const res = await fetch('api.php?action=get_facilitators');
        const data = await res.json();
        if (data.success) {
            tbody.innerHTML = '';
            data.facilitators.forEach(f => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${f.name}</strong></td>
                    <td>${f.expertise || '<span style="opacity:0.5">N/A</span>'}</td>
                    <td class="action-btns"></td>
                `;
                
                const btnContainer = tr.querySelector('.action-btns');
                
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-outline btn-sm';
                editBtn.textContent = 'Edit Info';
                editBtn.onclick = () => openFacEdit(f.id, f.name, f.topic_ids || '');
                btnContainer.appendChild(editBtn);
                
                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-sm btn-icon';
                delBtn.style.color = 'var(--danger)';
                delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
                delBtn.onclick = () => deleteFacilitator(f.id);
                btnContainer.appendChild(delBtn);
                
                tbody.appendChild(tr);
            });
        }
    } catch (e) {}
}

async function deleteFacilitator(id) {
    if (!confirm('Warning: Deleting a facilitator will also remove their associated appointments. Proceed?')) return;
    try {
        const res = await fetch('api.php?action=delete_facilitator', {
            method: 'POST',
            body: JSON.stringify({ id })
        });
        if ((await res.json()).success) {
            notify('Instructor removed');
            loadFacilitators();
        }
    } catch (e) {}
}

function openSeminarModal() {
    const modal = document.getElementById('seminar-modal');
    if (modal) modal.classList.add('active');
}

function openFacilitatorModal() {
    const modal = document.getElementById('admin-facilitator-modal');
    if (modal) {
        document.getElementById('fac-modal-title').textContent = 'Register New Faculty Instructor';
        document.getElementById('fac-submit-btn').textContent = 'Save Faculty Profile';
        document.getElementById('fac-id').value = '';
        document.getElementById('admin-fac-form').reset();
        if (typeof refreshTopicChecklist === 'function') refreshTopicChecklist();
        modal.classList.add('active');
    }
}
