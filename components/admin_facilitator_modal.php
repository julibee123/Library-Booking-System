<div class="modal-overlay" id="admin-facilitator-modal">
    <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
            <h3 id="fac-modal-title">Register New Faculty Instructor</h3>
            <button class="btn-close" onclick="this.closest('.modal-overlay').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body">
            <form id="admin-fac-form" onsubmit="handleFacilitatorSubmit(event)">
                <input type="hidden" id="fac-id" value="">
                <div class="form-group">
                    <label>Instructor Name</label>
                    <input type="text" id="fac-name" class="form-control" placeholder="e.g. Dr. Alan Turing" required>
                </div>
                <div class="form-group">
                    <label>Assign Departments / Specializations</label>
                    <div id="fac-topics-check" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                        <!-- JS Populated -->
                    </div>
                </div>
                <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                    <button type="submit" id="fac-submit-btn" class="btn btn-primary" style="flex: 1;">Save Faculty Profile</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', async () => {
    await refreshTopicChecklist();
});

async function refreshTopicChecklist() {
    const topicsCheck = document.getElementById('fac-topics-check');
    if (!topicsCheck) return;
    topicsCheck.innerHTML = '';
    
    try {
        const res = await fetch('api.php?action=get_topics');
        const data = await res.json();
        if (data.success) {
            data.topics.forEach(t => {
                const label = document.createElement('label');
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.gap = '0.5rem';
                label.style.fontSize = '0.85rem';
                label.innerHTML = `<input type="checkbox" name="topic" value="${t.id}"> ${t.name}`;
                topicsCheck.appendChild(label);
            });
        }
    } catch (e) {}
}

async function handleFacilitatorSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('fac-id').value;
    const checked = Array.from(document.querySelectorAll('input[name="topic"]:checked')).map(i => i.value);
    const payload = {
        name: document.getElementById('fac-name').value,
        topic_ids: checked
    };

    if (id) payload.id = id;
    
    const action = id ? 'update_facilitator' : 'add_facilitator';
    
    try {
        const res = await fetch(`api.php?action=${action}`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if ((await res.json()).success) {
            document.getElementById('admin-facilitator-modal').classList.remove('active');
            if (typeof loadFacilitators === 'function') loadFacilitators();
            e.target.reset();
            document.getElementById('fac-id').value = '';
        }
    } catch (e) {}
}

function openFacEdit(id, name, topicIdsPiped) {
    document.getElementById('fac-modal-title').textContent = 'Update Faculty Profile';
    document.getElementById('fac-submit-btn').textContent = 'Confirm Updates';
    document.getElementById('fac-id').value = id;
    document.getElementById('fac-name').value = name;
    
    const ids = (topicIdsPiped || '').split(',').map(v => v.trim());
    document.querySelectorAll('input[name="topic"]').forEach(input => {
        input.checked = ids.includes(input.value);
    });
    
    document.getElementById('admin-facilitator-modal').classList.add('active');
}
</script>
