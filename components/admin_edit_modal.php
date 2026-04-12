<div class="modal-overlay" id="admin-appointment-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Manage Appointment</h3>
            <button class="btn-close" onclick="this.closest('.modal-overlay').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body">
            <form id="admin-app-form">
                <input type="hidden" id="admin-app-id">
                <div class="form-group">
                    <label>Status</label>
                    <select id="admin-app-status" class="form-control">
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="COMPLETED">COMPLETED</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Assigned Instructor</label>
                    <select id="admin-app-facilitator" class="form-control">
                        <option value="0">To Be Assigned</option>
                        <!-- Populated via JS -->
                    </select>
                </div>
                <div class="form-group">
                    <label>Venue / Link</label>
                    <input type="text" id="admin-app-venue" class="form-control" placeholder="Room 302 or Zoom Link">
                </div>
                <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                    <button type="button" class="btn btn-primary" style="flex: 1;" onclick="saveAdminAppointment()">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
async function editAppointment(id, status, venue, currentFacId) {
    document.getElementById('admin-app-id').value = id;
    document.getElementById('admin-app-status').value = status;
    document.getElementById('admin-app-venue').value = venue || '';
    
    // Load facilitators into dropdown
    const facSelect = document.getElementById('admin-app-facilitator');
    facSelect.innerHTML = '<option value="0">To Be Assigned</option>';
    
    try {
        const res = await fetch('api.php?action=get_facilitators');
        const data = await res.json();
        if (data.success) {
            data.facilitators.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = f.name;
                if (f.id == currentFacId) opt.selected = true;
                facSelect.appendChild(opt);
            });
        }
    } catch (e) {}
    
    document.getElementById('admin-appointment-modal').classList.add('active');
}

async function saveAdminAppointment() {
    const payload = {
        id: document.getElementById('admin-app-id').value,
        status: document.getElementById('admin-app-status').value,
        venue: document.getElementById('admin-app-venue').value,
        facilitator_id: document.getElementById('admin-app-facilitator').value
    };
    
    try {
        const res = await fetch('api.php?action=update_appointment', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if ((await res.json()).success) {
            document.getElementById('admin-appointment-modal').classList.remove('active');
            loadRequests();
        }
    } catch (e) {}
}
</script>
