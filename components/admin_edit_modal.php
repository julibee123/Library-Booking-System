<div class="modal-overlay admin-modal" id="admin-appointment-modal">
    <div class="modal-content admin-modal-card admin-modal-lg">
        <div class="modal-header">
            <h3>Manage Appointment</h3>
            <button class="btn-close" onclick="this.closest('.modal-overlay').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body">
            <div id="cancellation-info" style="display: none; margin-bottom: 1rem; padding: 0.75rem; background: #fef2f2; border-left: 3px solid var(--danger); border-radius: 4px;">
                <p id="closed-status-title" style="margin: 0 0 0.5rem 0; color: var(--danger); font-weight: 600;">Appointment Cancelled</p>
                <p id="cancelled-date-info" style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #64748b;"></p>
                <p id="cancelled-by-info" style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #64748b;"></p>
                <p id="cancellation-reason-info" style="margin: 0; font-size: 0.85rem; color: #64748b;"></p>
            </div>
            <p id="admin-manage-lock-note" style="display:none; margin: 0 0 1rem 0; padding: 0.65rem 0.75rem; background: #fff7ed; border-left: 3px solid #f97316; border-radius: 4px; color: #9a3412; font-size: 0.85rem;">
                This appointment was cancelled by a student and is read-only.
            </p>
            <form id="admin-app-form">
                <input type="hidden" id="admin-app-id">
                <div class="form-group">
                    <label>Status</label>
                    <select id="admin-app-status" class="form-control">
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="DECLINED">DECLINED</option>
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
                <div class="admin-modal-footer">
                    <button type="button" class="btn btn-primary" style="flex: 1;" onclick="saveAdminAppointment()">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="modal-overlay admin-modal" id="completion-evaluation-modal">
    <div class="modal-content admin-modal-card admin-modal-sm">
        <div class="modal-header">
            <h3>Completion Message</h3>
            <button class="btn-close" id="completion-eval-close" type="button">&times;</button>
        </div>
        <div class="modal-body">
            <p style="margin: 0 0 0.85rem 0; color: #475569; font-size: 0.86rem;">
                Add the completion message for this appointment. This will be used later for evaluation/email workflows.
            </p>
            <div class="form-group">
                <label for="completion-eval-notes">Message</label>
                <textarea id="completion-eval-notes" class="form-control" rows="5" placeholder="Enter completion message for later evaluation/email use..."></textarea>
            </div>
            <div class="admin-modal-footer">
                <button class="btn btn-outline" id="completion-eval-cancel" type="button" style="flex: 1;">Cancel</button>
                <button class="btn btn-primary" id="completion-eval-confirm" type="button" style="flex: 1;">Save & Complete</button>
            </div>
        </div>
    </div>
</div>

<script>
window.adminAppointmentLocked = false;

window.promptCompletionEvaluation = function () {
    const modal = document.getElementById('completion-evaluation-modal');
    const notesEl = document.getElementById('completion-eval-notes');
    const closeBtn = document.getElementById('completion-eval-close');
    const cancelBtn = document.getElementById('completion-eval-cancel');
    const confirmBtn = document.getElementById('completion-eval-confirm');

    if (!modal || !notesEl || !closeBtn || !cancelBtn || !confirmBtn) {
        return Promise.resolve(null);
    }

    notesEl.value = '';

    return new Promise(resolve => {
        const onConfirm = () => {
            const message = notesEl.value.trim();
            if (!message) {
                notesEl.focus();
                return;
            }

            cleanup();
            resolve({ message });
        };

        const onClose = () => {
            cleanup();
            resolve(null);
        };

        const onBackdrop = (e) => {
            if (e.target === modal) onClose();
        };

        const onEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };

        function cleanup() {
            modal.classList.remove('active');
            confirmBtn.removeEventListener('click', onConfirm);
            closeBtn.removeEventListener('click', onClose);
            cancelBtn.removeEventListener('click', onClose);
            modal.removeEventListener('click', onBackdrop);
            document.removeEventListener('keydown', onEsc);
        }

        confirmBtn.addEventListener('click', onConfirm);
        closeBtn.addEventListener('click', onClose);
        cancelBtn.addEventListener('click', onClose);
        modal.addEventListener('click', onBackdrop);
        document.addEventListener('keydown', onEsc);
        modal.classList.add('active');
        notesEl.focus();
    });
};

async function editAppointment(id, status, venue, currentFacId, cancelledDateTime, cancelledBy, cancellationReason) {
    document.getElementById('admin-app-id').value = id;
    document.getElementById('admin-app-status').value = status;
    document.getElementById('admin-app-venue').value = venue || '';
    
    // Load facilitators into dropdown
    const facSelect = document.getElementById('admin-app-facilitator');
    facSelect.innerHTML = '<option value="0">To Be Assigned</option>';
    
    const normalizedStatus = String(status || '').toUpperCase();
    const cancelledByText = String(cancelledBy || '').trim();
    const cancelledByAdmin = cancelledByText !== '' && /admin/i.test(cancelledByText);
    const lockedByStudentCancellation = normalizedStatus === 'CANCELLED' && !cancelledByAdmin;
    window.adminAppointmentLocked = lockedByStudentCancellation;

    // Show/hide cancellation info
    const cancellationInfo = document.getElementById('cancellation-info');
    const isClosedStatus = normalizedStatus === 'CANCELLED' || normalizedStatus === 'DECLINED';
    if (isClosedStatus) {
        cancellationInfo.style.display = 'block';
        const closedLabel = normalizedStatus === 'DECLINED' ? 'Declined' : 'Cancelled';
        const closedStatusTitle = document.getElementById('closed-status-title');
        if (closedStatusTitle) {
            closedStatusTitle.textContent = `Appointment ${closedLabel}`;
        }

        document.getElementById('cancelled-date-info').textContent = cancelledDateTime
            ? `${closedLabel} on ${new Date(cancelledDateTime).toLocaleString()}`
            : `${closedLabel} on: N/A`;
        document.getElementById('cancelled-by-info').textContent = cancelledByText
            ? `${closedLabel} by: ${cancelledByText}`
            : `${closedLabel} by: N/A`;
        document.getElementById('cancellation-reason-info').innerHTML = cancellationReason
            ? `<strong>Reason:</strong> ${cancellationReason}`
            : '<strong>Reason:</strong> No reason provided';
    } else {
        cancellationInfo.style.display = 'none';
    }

    // Lock controls if cancelled by student.
    const lockNote = document.getElementById('admin-manage-lock-note');
    const statusEl = document.getElementById('admin-app-status');
    const venueEl = document.getElementById('admin-app-venue');
    const facEl = document.getElementById('admin-app-facilitator');
    const saveBtn = document.querySelector('#admin-app-form button[onclick="saveAdminAppointment()"]');

    statusEl.disabled = lockedByStudentCancellation;
    venueEl.disabled = lockedByStudentCancellation;
    facEl.disabled = lockedByStudentCancellation;
    if (saveBtn) {
        saveBtn.disabled = lockedByStudentCancellation;
        saveBtn.style.opacity = lockedByStudentCancellation ? '0.6' : '1';
        saveBtn.style.cursor = lockedByStudentCancellation ? 'not-allowed' : 'pointer';
    }

    if (lockNote) {
        lockNote.style.display = lockedByStudentCancellation ? 'block' : 'none';
    }
    
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
    if (window.adminAppointmentLocked) {
        return;
    }

    const status = document.getElementById('admin-app-status').value;
    let cancellationReason = null;
    let cancelledBy = null;

    const normalizedStatus = String(status).toUpperCase();

    let evaluationData = null;
    if (normalizedStatus === 'COMPLETED') {
        if (typeof window.promptCompletionEvaluation === 'function') {
            evaluationData = await window.promptCompletionEvaluation();
            if (evaluationData === null) return;
        } else {
            return;
        }
    }

    if (normalizedStatus === 'CANCELLED' || normalizedStatus === 'DECLINED') {
        if (typeof window.promptCancellationReason === 'function') {
            const isDecline = normalizedStatus === 'DECLINED';
            const input = await window.promptCancellationReason({
                title: isDecline ? 'Decline This Appointment?' : 'Cancel This Appointment?',
                message: isDecline
                    ? 'You can optionally provide a decline reason before proceeding.'
                    : 'You can optionally provide a cancellation reason before proceeding.',
                confirmText: isDecline ? 'Confirm Decline' : 'Confirm Cancellation',
                cancelText: 'Go Back',
                reasonLabel: isDecline ? 'Decline reason (optional)' : 'Cancellation reason (optional)',
                reasonPlaceholder: isDecline
                    ? 'Type a reason for declining, or leave blank to continue...'
                    : 'Type a reason for cancellation, or leave blank to continue...'
            });
            if (input === null) return;
            cancellationReason = input;
        } else {
            return;
        }
        cancelledBy = 'Admin';
    }

    const payload = {
        id: document.getElementById('admin-app-id').value,
        status: status,
        venue: document.getElementById('admin-app-venue').value,
        facilitator_id: document.getElementById('admin-app-facilitator').value,
        cancellation_reason: cancellationReason,
        cancelled_by: cancelledBy,
        evaluation_rating: null,
        evaluation_notes: evaluationData ? evaluationData.message : null
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
