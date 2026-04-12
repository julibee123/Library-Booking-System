<?php
session_start();
// For now, allow entry, but in a real app, check for role
$_SESSION['user_role'] = 'admin'; 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Library Admin Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
    <style>
        body { background: #f8fafc; margin: 0; padding: 0; }
        .admin-layout { display: flex; flex-direction: column; min-height: 100vh; }
        
        /* Top Navigation Header */
        .admin-header {
            background: #ffffff;
            border-bottom: 2px solid #e2e8f0;
            padding: 1.5rem 2.5rem 0 2.5rem;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .admin-brand {
            font-size: 1.4rem;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .admin-brand span {
            color: #0f172a;
        }
        
        .admin-nav {
            display: flex;
            gap: 2rem;
            overflow-x: auto;
        }
        
        .nav-link {
            padding: 0.8rem 0.5rem;
            color: #64748b;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.95rem;
            border-bottom: 3px solid transparent;
            transition: all 0.2s;
            white-space: nowrap;
        }
        
        .nav-link:hover { color: #1e293b; }
        .nav-link.active { color: #6366f1; border-bottom: 3px solid #6366f1; }
        
        /* Main Workspace */
        .admin-main { flex: 1; padding: 2.5rem; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; }
        .admin-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.03); margin-bottom: 2.5rem; }
        .admin-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .admin-table th { text-align: left; padding: 1.25rem 1rem; border-bottom: 2px solid #f1f5f9; color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; }
        .admin-table td { padding: 1.25rem 1rem; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 0.9rem; }
        .admin-table tr:last-child td { border-bottom: none; }
        .admin-table tr:hover td { background: #f8fafc; }
        .action-btns { display: flex; gap: 0.75rem; align-items: center; }
        
        #admin-toasts {
            position: fixed;
            top: 2rem;
            right: 2rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            z-index: 9999;
        }
        .toast {
            background: #0f172a;
            color: #fff;
            padding: 1rem 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            animation: toastIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            display: flex;
            align-items: center;
            gap: 1rem;
            font-weight: 600;
        }
        @keyframes toastIn { from { transform: translateX(100%) scale(0.5); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
    </style>
</head>
<body>
    <div id="admin-toasts"></div>
    <div class="admin-layout">
        
        <header class="admin-header">
            <div class="admin-brand">
                ADMIN DASHBOARD
            </div>
            <nav class="admin-nav">
                <a href="index.php" class="nav-link">Staff Dashboard</a>
                <a href="#" class="nav-link active" data-tab="requests">All Appointments</a>
                <a href="#" class="nav-link" data-tab="seminars">Seminars & Events</a>
                <a href="#" class="nav-link" data-tab="facilitators">All Facilitators</a>
            </nav>
        </header>

        <main class="admin-main">
            <!-- Tab: Pending Requests -->
            <div id="tab-requests" class="admin-tab-content">
                <div class="filter-bar">
                    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; flex: 1;">
                        <div class="filter-group">
                            <label>Sort by<br>Requestor:</label>
                            <select class="filter-select" id="filter-requestor">
                                <option value="all">All</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Sort by<br>College:</label>
                            <select class="filter-select" id="filter-college">
                                <option value="all">All</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Sort by<br>Facilitator:</label>
                            <select class="filter-select" id="filter-facilitator">
                                <option value="all">All</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Sort by<br>Status:</label>
                            <select class="filter-select" id="filter-status">
                                <option value="PENDING">PENDING</option>
                                <option value="CONFIRMED">CONFIRMED</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="all">All</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn-export">Export Logs</button>
                </div>

                <div id="requests-grid" class="app-grid">
                    <!-- JS populated cards -->
                </div>
            </div>

            <!-- Tab: Seminars Management -->
            <div id="tab-seminars" class="admin-tab-content" style="display: none;">
                <div class="admin-card">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
                        <h3>Institutional Seminars</h3>
                        <button class="btn btn-primary btn-sm" onclick="openSeminarModal()">+ Add New Seminar</button>
                    </div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Event Title</th>
                                <th>Speaker</th>
                                <th>Schedule</th>
                                <th>Venue</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="seminars-tbody">
                            <!-- JS populated -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Tab: Facilitators Management -->
            <div id="tab-facilitators" class="admin-tab-content" style="display: none;">
                <div class="admin-card">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
                        <h3>Faculty Directory</h3>
                        <button class="btn btn-primary btn-sm" onclick="openFacilitatorModal()">+ Add New Instructor</button>
                    </div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Department / Topics</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="facilitators-tbody">
                            <!-- JS populated -->
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>

    <!-- Edit Appointment/Instructor Modal -->
    <?php include 'components/admin_edit_modal.php'; ?>
    
    <!-- Seminar Modal -->
    <?php include 'components/seminar_modal.php'; ?>

    <!-- Facilitator Modal -->
    <?php include 'components/admin_facilitator_modal.php'; ?>

    <script src="js/admin.js"></script>
</body>
</html>
