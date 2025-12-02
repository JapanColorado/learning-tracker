// ==========================================
// GLOBAL STATE
// ==========================================
// Note: Helper utilities moved to js/utils.js

let subjects = {};
let subjectProgress = {};
let currentEditingSubject = null;
let currentEditingProject = null;
let currentResourceContext = null; // 'subject' or 'project'
let tempProjectResources = []; // Temporary storage for new project resouhttps://japancolorado.github.io/polymathica/rces
let currentView = 'dashboard'; // 'dashboard' or 'catalog'
let viewMode = 'public'; // 'public' or 'owner'

// ==========================================
// DATA LAYER
// ==========================================
// Note: Data loading and saving functions moved to js/data.js



// ==========================================
// STATE MANAGEMENT
// ==========================================
// Note: Theme, view, progress, and readiness functions moved to js/state.js

// ==========================================
// RENDERING
// ==========================================
// Note: All rendering functions moved to js/render.js

// ==========================================
// MODAL MANAGEMENT - SUBJECT
// ==========================================
// Note: Filter functions moved to js/filters.js

function openSubjectDetail(subjectId, event) {
    if (event) event.stopPropagation();
    currentEditingSubject = subjectId;
    const subject = findSubject(subjectId);
    if (!subject) return;

    const isPublicMode = viewMode === 'public';

    // Set title
    document.getElementById('detailModalTitle').textContent = subject.name;

    // Summary field - display from catalog (read-only) or allow editing for custom subjects
    const summaryField = document.getElementById('subjectSummary');
    summaryField.value = subject.summary || '';

    // Summary is read-only for public mode OR for catalog subjects (non-custom)
    // Only custom subjects can have editable summaries in owner mode
    summaryField.readOnly = isPublicMode || !subject.isCustom;

    // Dependencies - render prerequisites, co-requisites, and recommendations
    const depsContent = document.getElementById('dependenciesContent');
    depsContent.innerHTML = renderDependenciesInModal(subject);

    // Goal field
    const goalField = document.getElementById('subjectGoal');
    goalField.value = subject.goal || '';
    goalField.readOnly = isPublicMode;

    // Resources list
    renderResourcesList(subject.resources || [], 'resourcesList', 'subject');

    // Projects list
    renderProjectsList(subject.projects || []);

    // Show/hide edit controls based on mode
    const addResourceBtn = document.getElementById('addSubjectResourceBtn');
    const addProjectBtn = document.getElementById('addProjectBtn');
    const saveBtn = document.getElementById('saveDetailBtn');
    const cancelBtn = document.getElementById('cancelDetailBtn');
    const deleteBtn = document.getElementById('deleteSubjectBtn');

    if (isPublicMode) {
        addResourceBtn.style.display = 'none';
        addProjectBtn.style.display = 'none';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
    } else {
        addResourceBtn.style.display = 'block';
        addProjectBtn.style.display = 'block';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';

        // Show delete button ONLY for custom subjects in owner mode
        if (subject.isCustom) {
            deleteBtn.style.display = 'inline-block';
        } else {
            deleteBtn.style.display = 'none';
        }
    }

    document.getElementById('subjectDetailModal').classList.add('active');
}

function closeSubjectDetail() {
    document.getElementById('subjectDetailModal').classList.remove('active');
    currentEditingSubject = null;
}

function saveSubjectDetail() {
    if (!currentEditingSubject) return;
    const subject = findSubject(currentEditingSubject);
    if (!subject) return;

    // Save summary (only for custom subjects)
    if (subject.isCustom) {
        const summary = document.getElementById('subjectSummary').value.trim();
        subject.summary = summary || '';
    }
    // For catalog subjects, summary is read-only and comes from catalog.json

    // Save goal
    const goal = document.getElementById('subjectGoal').value.trim();
    if (goal) {
        subject.goal = goal;
    } else {
        subject.goal = null;
    }

    saveSubjects();

    // If authenticated, sync to GitHub
    if (window.githubAuth && githubAuth.isAuthenticated()) {
        saveDataToGitHub();
    }

    closeSubjectDetail();
    render();
}

// ==========================================
// MODAL MANAGEMENT - RESOURCES
// ==========================================
// Note: renderResourcesList moved to js/render.js

function addResource(type) {
    currentResourceContext = type;
    document.getElementById('resourceText').value = '';
    document.getElementById('resourceUrl').value = '';
    document.getElementById('resourceModal').classList.add('active');
}

function closeResourceModal() {
    document.getElementById('resourceModal').classList.remove('active');
    currentResourceContext = null;
}

function saveResource() {
    const text = document.getElementById('resourceText').value.trim();
    if (!text) {
        alert('Please enter a resource title/description');
        return;
    }

    const url = document.getElementById('resourceUrl').value.trim();
    const resource = {
        type: url ? 'link' : 'text',
        value: text
    };

    if (url) {
        resource.url = url;
    }

    if (currentResourceContext === 'subject' && currentEditingSubject) {
        const subject = findSubject(currentEditingSubject);
        if (!subject) return;
        subject.resources = subject.resources || [];
        subject.resources.push(resource);
        renderResourcesList(subject.resources, 'resourcesList', 'subject');
        saveSubjects();
    } else if (currentResourceContext === 'project' && currentEditingProject) {
        if (currentEditingProject === 'new') {
            // Adding resource to a new (unsaved) project
            tempProjectResources.push(resource);
            renderResourcesList(tempProjectResources, 'projectResourcesList', 'project');
        } else {
            // Adding resource to existing project
            const projectIndex = parseInt(currentEditingProject.split('-').pop());
            const subject = findSubject(currentEditingSubject);
            if (!subject || !subject.projects || !subject.projects[projectIndex]) return;
            const project = subject.projects[projectIndex];
            project.resources = project.resources || [];
            project.resources.push(resource);
            renderResourcesList(project.resources, 'projectResourcesList', 'project');
            saveSubjects();
        }
    }

    closeResourceModal();
}

function removeResource(index, type) {
    if (!confirm('Remove this resource?')) return;
    if (type === 'subject' && currentEditingSubject) {
        const subject = findSubject(currentEditingSubject);
        if (!subject || !subject.resources) return;
        subject.resources.splice(index, 1);
        renderResourcesList(subject.resources, 'resourcesList', 'subject');
        saveSubjects();
    } else if (type === 'project' && currentEditingProject) {
        if (currentEditingProject === 'new') {
            // Removing from temporary resources
            tempProjectResources.splice(index, 1);
            renderResourcesList(tempProjectResources, 'projectResourcesList', 'project');
        } else {
            // Removing from existing project
            const projectIndex = parseInt(currentEditingProject.split('-').pop());
            const subject = findSubject(currentEditingSubject);
            if (!subject || !subject.projects || !subject.projects[projectIndex] || !subject.projects[projectIndex].resources) return;
            subject.projects[projectIndex].resources.splice(index, 1);
            renderResourcesList(subject.projects[projectIndex].resources, 'projectResourcesList', 'project');
            saveSubjects();
        }
    }
}

// ==========================================
// MODAL MANAGEMENT - PROJECTS
// ==========================================
// Note: renderProjectsList moved to js/render.js

function addProject() {
    if (!currentEditingSubject) return;

    // Set to 'new' to indicate we're adding a new project
    currentEditingProject = 'new';

    // Clear temporary resources
    tempProjectResources = [];

    // Clear the form
    document.getElementById('projectModalTitle').textContent = 'Add New Project';
    document.getElementById('projectName').value = '';
    document.getElementById('projectGoal').value = '';
    document.getElementById('deleteProjectBtn').style.display = 'none'; // Hide delete button for new projects

    // Clear resources list
    document.getElementById('projectResourcesList').innerHTML = '<p class="empty-state">No resources yet</p>';

    // Show the modal
    document.getElementById('projectDetailModal').classList.add('active');
}

function editProject(subjectId, projectIndex, event) {
    if (event) event.stopPropagation();

    currentEditingSubject = subjectId;
    currentEditingProject = `${subjectId}-${projectIndex}`;

    const subject = findSubject(subjectId);
    if (!subject || !subject.projects || !subject.projects[projectIndex]) return;

    const project = subject.projects[projectIndex];
    const isPublicMode = viewMode === 'public';

    // Populate modal
    document.getElementById('projectModalTitle').textContent = 'Edit Project';
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectGoal').value = project.goal;
    document.getElementById('projectName').readOnly = isPublicMode;
    document.getElementById('projectGoal').readOnly = isPublicMode;

    renderResourcesList(project.resources || [], 'projectResourcesList', 'project');

    // Show/hide controls
    const addResourceBtn = document.getElementById('addProjectResourceBtn');
    const saveBtn = document.getElementById('saveProjectBtn');
    const cancelBtn = document.getElementById('cancelProjectBtn');
    const deleteBtn = document.getElementById('deleteProjectBtn');

    if (isPublicMode) {
        addResourceBtn.style.display = 'none';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
    } else {
        addResourceBtn.style.display = 'block';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
    }

    document.getElementById('projectDetailModal').classList.add('active');
}

function viewProject(projectIndex, event) {
    if (event) event.stopPropagation();
    if (!currentEditingSubject) return;
    currentEditingProject = `${currentEditingSubject}-${projectIndex}`;
    const subject = findSubject(currentEditingSubject);
    if (!subject || !subject.projects || !subject.projects[projectIndex]) return;
    const project = subject.projects[projectIndex];

    document.getElementById('projectModalTitle').textContent = project.name;
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectGoal').value = project.goal;

    // Make fields read-only (public mode)
    document.getElementById('projectName').readOnly = true;
    document.getElementById('projectGoal').readOnly = true;

    renderResourcesList(project.resources || [], 'projectResourcesList', 'project');

    // Hide all edit controls (public mode)
    document.getElementById('addProjectResourceBtn').style.display = 'none';
    document.getElementById('saveProjectBtn').style.display = 'none';
    document.getElementById('cancelProjectBtn').style.display = 'none';
    document.getElementById('deleteProjectBtn').style.display = 'none';

    document.getElementById('projectDetailModal').classList.add('active');
}

function removeProject(projectIndex, event) {
    if (event) event.stopPropagation();
    if (!currentEditingSubject) return;
    if (!confirm('Delete this project? This cannot be undone.')) return;
    const subject = findSubject(currentEditingSubject);
    if (!subject || !subject.projects) return;
    subject.projects.splice(projectIndex, 1);
    renderProjectsList(subject.projects);
    saveSubjects();
    render();
}

function deleteCustomSubject() {
    if (!currentEditingSubject) return;

    const subject = findSubject(currentEditingSubject);
    if (!subject) return;

    // Safety check: only allow deleting custom subjects
    if (!subject.isCustom) {
        alert('Cannot delete catalog subjects. Only custom subjects can be deleted.');
        return;
    }

    // Check for dependencies
    const dependencies = findDependentSubjects(currentEditingSubject);
    if (dependencies.length > 0) {
        const depNames = dependencies.map(s => s.name).join(', ');
        if (!confirm(`Warning: The following subjects list this as a prerequisite or dependency:\n\n${depNames}\n\nDeleting this subject may affect these subjects. Continue anyway?`)) {
            return;
        }
    }

    // Final confirmation
    if (!confirm(`Are you sure you want to delete "${subject.name}"?\n\nThis will permanently remove:\n- All progress data\n- Goals and resources\n- All projects\n\nThis action cannot be undone.`)) {
        return;
    }

    // Find and remove from subjects structure
    const tierInfo = findSubjectAndTier(currentEditingSubject);
    if (tierInfo) {
        tierInfo.tierData.subjects.splice(tierInfo.index, 1);

        // If tier is now empty and was custom, remove the tier too
        if (tierInfo.tierData.subjects.length === 0 &&
            (tierInfo.tierData.category === 'custom' || tierInfo.tierData.order >= 999)) {
            delete subjects[tierInfo.tierName];
        }
    }

    // Remove progress data
    delete subjectProgress[currentEditingSubject];

    // Save changes
    saveSubjects();
    saveProgress();

    // If authenticated, sync to GitHub
    if (window.githubAuth && githubAuth.isAuthenticated()) {
        saveDataToGitHub();
    }

    // Close modal and re-render
    closeSubjectDetail();
    render();

    alert(`"${subject.name}" has been deleted.`);
}

// ==========================================
// MODAL MANAGEMENT - PROJECT DETAIL
// ==========================================

function closeProjectDetail() {
    document.getElementById('projectDetailModal').classList.remove('active');
    currentEditingProject = null;
}

function saveProjectDetail() {
    if (!currentEditingProject) return;

    const name = document.getElementById('projectName').value.trim();
    const goal = document.getElementById('projectGoal').value.trim();

    if (!name) { alert('Project name is required'); return; }
    if (!goal) { alert('Project goal is required'); return; }

    const subject = findSubject(currentEditingSubject);
    if (!subject) return;

    if (currentEditingProject === 'new') {
        // Adding a new project
        const project = {
            id: `${currentEditingSubject}-project-${Date.now()}`,
            name: name,
            goal: goal,
            resources: [...tempProjectResources], // Include any resources added before saving
            status: 'not-started'
        };
        subject.projects = subject.projects || [];
        subject.projects.push(project);
        tempProjectResources = []; // Clear temporary resources
    } else {
        // Editing existing project
        const projectIndex = parseInt(currentEditingProject.split('-').pop());
        if (!subject.projects || !subject.projects[projectIndex]) return;
        const project = subject.projects[projectIndex];
        project.name = name;
        project.goal = goal;
    }

    saveSubjects();
    closeProjectDetail();
    renderProjectsList(subject.projects);
    render();
}

function deleteCurrentProject() {
    if (!currentEditingProject) return;
    if (!confirm('Delete this project? This cannot be undone.')) return;
    const projectIndex = parseInt(currentEditingProject.split('-').pop());
    const subject = findSubject(currentEditingSubject);
    if (!subject || !subject.projects) return;
    subject.projects.splice(projectIndex, 1);
    saveSubjects();
    closeProjectDetail();
    renderProjectsList(subject.projects);
    render();
}

// ==========================================
// Authentication & Sync UI
// ==========================================

async function updateViewMode() {
    if (window.githubAuth && await githubAuth.isOwner()) {
        viewMode = CONFIG.app.viewModes.OWNER;
    } else {
        viewMode = CONFIG.app.viewModes.PUBLIC;
    }
    updateSettingsButtonVisibility();
    render();
}

// ==========================================
// MODAL MANAGEMENT - AUTHENTICATION
// ==========================================

function updateAuthButton() {
    const authButton = document.getElementById('authButton');

    if (window.githubAuth && githubAuth.isAuthenticated()) {
        // Hide the auth button when signed in
        authButton.style.display = 'none';
    } else {
        // Show the auth button when not signed in
        authButton.style.display = 'block';
        authButton.textContent = 'Sign In';
        authButton.classList.remove('signed-in');
        authButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openAuthModal();
        };
    }
}

function handleSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
        githubAuth.logout();
    }
}

function updateSettingsButtonVisibility() {
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.style.display = viewMode === 'public' ? 'none' : 'block';
    }
}

function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
    document.getElementById('githubToken').value = '';
    document.getElementById('githubToken').focus();
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

async function saveToken() {
    const token = document.getElementById('githubToken').value.trim();

    if (!token) {
        alert('Please enter a token');
        return;
    }

    if (!window.githubAuth) {
        alert('GitHub auth system not initialized');
        return;
    }

    // Set the token
    githubAuth.setToken(token);

    // Validate it
    const isValid = await githubAuth.validateToken();
    if (!isValid) {
        alert('Invalid token. Please check and try again.');
        githubAuth.clearAuthData();
        return;
    }

    // Check if user is owner
    const isOwner = await githubAuth.isOwner();
    if (!isOwner) {
        alert(`You are signed in as ${githubAuth.username}, but this tracker belongs to ${CONFIG.github.repoOwner}. You can view but not edit.`);
    }

    closeAuthModal();
    updateAuthButton();
    await updateViewMode();

    // Load data from GitHub
    const loaded = await loadDataFromGitHub();
    if (loaded) {
        render();
    }

    // Start auto-sync
    if (window.githubStorage && CONFIG.features.enableAutoSync) {
        githubStorage.startAutoSync();
    }
}

function updateSyncStatusInSettings() {
    if (!window.githubStorage) return;

    const syncIcon = document.getElementById('syncIconLarge');
    const syncMessage = document.getElementById('syncMessage');
    const syncDetails = document.getElementById('syncDetails');

    if (!syncIcon || !syncMessage || !syncDetails) return;

    const status = githubStorage.getSyncStatus();

    // Clear previous state classes
    syncIcon.className = 'sync-icon-large';

    // Update based on status
    if (status.status === 'syncing') {
        syncIcon.classList.add('syncing');
        syncMessage.textContent = 'Syncing...';
        syncMessage.className = 'sync-message syncing';
    } else if (status.status === 'error') {
        syncMessage.textContent = 'Sync Error';
        syncMessage.className = 'sync-message error';
    } else if (status.status === 'synced') {
        syncMessage.textContent = 'Synced';
        syncMessage.className = 'sync-message success';
    } else {
        syncMessage.textContent = status.message;
        syncMessage.className = 'sync-message';
    }

    // Update details
    if (githubStorage.cache.lastFetch) {
        const lastSync = new Date(githubStorage.cache.lastFetch);
        syncDetails.textContent = `Last synced: ${lastSync.toLocaleString()}`;
    } else {
        syncDetails.textContent = 'Never synced';
    }
}

async function manualSync() {
    if (!window.githubStorage || !window.githubAuth || !githubAuth.isAuthenticated()) {
        alert('Please sign in first');
        return;
    }

    try {
        // Update UI to show syncing
        updateSyncStatusInSettings();

        await saveDataToGitHub();

        // Update UI after sync
        updateSyncStatusInSettings();
        alert('Sync complete!');
    } catch (error) {
        updateSyncStatusInSettings();
        alert('Sync failed: ' + error.message);
    }
}

// ==========================================
// MODAL MANAGEMENT - SETTINGS
// ==========================================

function openSettingsModal() {
    if (viewMode === 'public') {
        console.warn('[Settings] Settings not available in public mode');
        return;
    }

    const isAuthenticated = window.githubAuth && githubAuth.isAuthenticated();

    // Show/hide account section based on authentication
    const accountSection = document.getElementById('accountSection');
    if (accountSection) {
        accountSection.style.display = isAuthenticated ? 'block' : 'none';

        // Update username display if authenticated
        if (isAuthenticated) {
            const usernameElement = document.getElementById('accountUsername');
            if (usernameElement) {
                usernameElement.textContent = githubAuth.username || 'Unknown';
            }
        }
    }

    // Show/hide sync section based on authentication
    const syncSection = document.getElementById('syncStatusSection');
    if (syncSection) {
        syncSection.style.display = isAuthenticated ? 'block' : 'none';
    }

    // Update sync status display if authenticated
    if (isAuthenticated) {
        updateSyncStatusInSettings();
    }

    document.getElementById('settingsModal').classList.add('active');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
}

function exportData() {
    // Build complete export data (schema 3.0)
    const exportData = {
        schema: '3.0',
        exportDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        progress: subjectProgress,
        overlays: {},
        customSubjects: {},
        customTiers: {},
        theme: document.documentElement.getAttribute('data-theme') || 'light'
    };

    // Extract all subject customizations and custom subjects
    for (const [tierName, tierData] of Object.entries(subjects)) {
        for (const subject of tierData.subjects) {
            if (subject.isCustom) {
                // This is a custom subject - export full definition
                exportData.customSubjects[subject.id] = {
                    name: subject.name,
                    tier: tierName,
                    prereq: subject.prereq || [],
                    coreq: subject.coreq || [],
                    soft: subject.soft || [],
                    summary: subject.summary || '',
                    goal: subject.goal || null,
                    resources: subject.resources || [],
                    projects: subject.projects || []
                };

                // Track custom tiers
                if (tierData.order >= 999 || tierData.category === 'custom') {
                    exportData.customTiers[tierName] = {
                        category: tierData.category || 'custom',
                        order: tierData.order || 999
                    };
                }
            } else {
                // This is a catalog subject - export only customizations (overlay)
                const overlay = {};
                if (subject.goal) overlay.goal = subject.goal;
                if (subject.resources && subject.resources.length > 0) overlay.resources = subject.resources;
                if (subject.projects && subject.projects.length > 0) overlay.projects = subject.projects;

                if (Object.keys(overlay).length > 0) {
                    exportData.overlays[subject.id] = overlay;
                }
            }
        }
    }

    // Clean up empty objects
    if (Object.keys(exportData.overlays).length === 0) delete exportData.overlays;
    if (Object.keys(exportData.customSubjects).length === 0) delete exportData.customSubjects;
    if (Object.keys(exportData.customTiers).length === 0) delete exportData.customTiers;

    // Create and download JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `polymathica-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('Data exported successfully!');
}

function importData() {
    const fileInput = document.getElementById('importFileInput');
    fileInput.click();
}

async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Validate data structure
            if (!importedData.schema && !importedData.version) {
                alert('Invalid data file format: missing schema/version');
                return;
            }

            if (!importedData.progress) {
                alert('Invalid data file format: missing progress data');
                return;
            }

            // Validate schema version
            const schema = importedData.schema || importedData.version;
            if (schema !== '3.0') {
                if (!confirm(`Warning: Data file has schema version ${schema}, but current version is 3.0. Import may not work correctly. Continue anyway?`)) {
                    return;
                }
            }

            if (!confirm('This will replace all your current data. Are you sure?')) {
                return;
            }

            // Load catalog
            const catalog = await loadCatalog();

            // Import progress
            subjectProgress = importedData.progress || {};
            saveProgress();

            // Rebuild subjects from catalog + imported user data
            subjects = mergeCatalogWithUserData(catalog, importedData);
            saveSubjects();

            // Import theme
            if (importedData.theme) {
                document.documentElement.setAttribute('data-theme', importedData.theme);
                updateThemeButton(importedData.theme);
                saveTheme(importedData.theme);
            }

            // Re-render
            render();
            closeSettingsModal();
            alert('Data imported successfully!');

            // If authenticated, sync to GitHub
            if (window.githubAuth && githubAuth.isAuthenticated()) {
                saveDataToGitHub();
            }
        } catch (error) {
            alert('Failed to import data: ' + error.message);
        }
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = '';
}

async function resetAllData() {
    const confirmInput = document.getElementById('resetConfirmInput').value;

    if (confirmInput !== 'Polymathica') {
        alert('Please type "Polymathica" to confirm the reset.');
        return;
    }

    if (!confirm('Are you absolutely sure? This will permanently delete ALL your data including progress, goals, resources, and projects. This action CANNOT be undone.')) {
        return;
    }

    // Reset all data to defaults (load fresh catalog with no user data)
    const catalog = await loadCatalog();
    subjects = mergeCatalogWithUserData(catalog, null);
    subjectProgress = {};

    // Save to localStorage
    saveSubjects();
    saveProgress();

    // Clear the confirmation input
    document.getElementById('resetConfirmInput').value = '';

    // If authenticated, sync the reset to GitHub
    if (window.githubAuth && githubAuth.isAuthenticated()) {
        await saveDataToGitHub();
    }

    // Re-render
    render();
    closeSettingsModal();

    alert('All data has been reset successfully.');
}

// ==========================================
// MODAL MANAGEMENT - CREATE SUBJECT
// ==========================================
// Note: getAllSubjectIds() and setupAutocomplete() moved to js/filters.js and js/utils.js

function openCreateSubjectModal() {
    document.getElementById('createSubjectModal').classList.add('active');

    // Populate category dropdown with existing tiers
    const categorySelect = document.getElementById('newSubjectCategory');
    categorySelect.innerHTML = '<option value="">Select a category...</option>';

    // Add existing tiers (excluding "Custom Subjects")
    for (const tierName of Object.keys(subjects)) {
        if (tierName !== 'Custom Subjects') {
            const option = document.createElement('option');
            option.value = tierName;
            option.textContent = tierName;
            categorySelect.appendChild(option);
        }
    }

    // Setup autocomplete for dependency fields
    setupAutocomplete('newSubjectPrereq', 'prereqSuggestions');
    setupAutocomplete('newSubjectCoreq', 'coreqSuggestions');
    setupAutocomplete('newSubjectSoft', 'softSuggestions');

    // Reset form
    document.getElementById('newSubjectName').value = '';
    document.getElementById('newSubjectCategory').value = '';
    document.getElementById('newSubjectPrereq').value = '';
    document.getElementById('newSubjectCoreq').value = '';
    document.getElementById('newSubjectSoft').value = '';
    document.getElementById('newSubjectSummary').value = '';
    document.getElementById('newSubjectGoal').value = '';
    document.getElementById('newSubjectName').focus();
}

function closeCreateSubjectModal() {
    document.getElementById('createSubjectModal').classList.remove('active');
}

function saveNewSubject() {
    const name = document.getElementById('newSubjectName').value.trim();
    const category = document.getElementById('newSubjectCategory').value;
    const prereqStr = document.getElementById('newSubjectPrereq').value.trim();
    const coreqStr = document.getElementById('newSubjectCoreq').value.trim();
    const softStr = document.getElementById('newSubjectSoft').value.trim();
    const summary = document.getElementById('newSubjectSummary').value.trim();
    const goal = document.getElementById('newSubjectGoal').value.trim();

    // Validation
    if (!name) {
        alert('Please enter a subject name');
        return;
    }

    if (!category) {
        alert('Please select a category');
        return;
    }

    // Generate a unique ID from the name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check if subject with this ID already exists
    for (const tierData of Object.values(subjects)) {
        if (tierData.subjects && tierData.subjects.some(s => s.id === id)) {
            alert('A subject with this name already exists. Please choose a different name.');
            return;
        }
    }

    // Parse prerequisites, co-requisites, and soft dependencies
    const prereq = prereqStr ? prereqStr.split(',').map(s => s.trim()).filter(s => s) : [];
    const coreq = coreqStr ? coreqStr.split(',').map(s => s.trim()).filter(s => s) : [];
    const soft = softStr ? softStr.split(',').map(s => s.trim()).filter(s => s) : [];

    // Create the new subject
    const newSubject = {
        id: id,
        name: name,
        prereq: prereq,
        coreq: coreq,
        soft: soft,
        summary: summary || '',
        goal: goal || null,
        resources: [],
        projects: [],
        isCustom: true  // Mark as custom subject
    };

    // Get the category's existing data or use default
    const categoryData = subjects[category] || { category: 'custom', subjects: [] };

    // Ensure the category exists
    if (!subjects[category]) {
        subjects[category] = {
            category: categoryData.category,
            subjects: []
        };
    }

    // Add the subject to the category
    subjects[category].subjects.push(newSubject);

    // Initialize progress as empty
    subjectProgress[id] = 'empty';

    // Save
    saveSubjects();
    saveProgress();

    // If authenticated, sync to GitHub
    if (window.githubAuth && githubAuth.isAuthenticated()) {
        saveDataToGitHub();
    }

    // Re-render
    render();
    closeCreateSubjectModal();

    alert(`Subject "${name}" created successfully!`);
}

// ==========================================
// GLOBAL EXPORTS & INITIALIZATION
// ==========================================

// Make functions globally accessible for inline onclick handlers
window.cycleProgress = cycleProgress;
window.cycleProjectProgress = cycleProjectProgress;
window.openSubjectDetail = openSubjectDetail;
window.editProject = editProject;
window.viewProject = viewProject;
window.removeProject = removeProject;
window.removeResource = removeResource;
window.switchView = switchView;
window.toggleTier = toggleTier;
window.toggleSummary = toggleSummary;
window.deleteCustomSubject = deleteCustomSubject;
window.findDependentSubjects = findDependentSubjects;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Hide content during initialization to prevent flash
    const content = document.getElementById('content');
    if (content) content.style.display = 'none';

    initializeTheme();
    currentView = loadView();

    // Show content before switching view
    if (content) content.style.display = 'block';
    switchView(currentView);

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => switchView(link.dataset.view));
    });
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('closeDetailBtn').addEventListener('click', closeSubjectDetail);
    document.getElementById('cancelDetailBtn').addEventListener('click', closeSubjectDetail);
    document.getElementById('saveDetailBtn').addEventListener('click', saveSubjectDetail);
    document.getElementById('deleteSubjectBtn').addEventListener('click', deleteCustomSubject);
    document.getElementById('addSubjectResourceBtn').addEventListener('click', () => addResource('subject'));
    document.getElementById('addProjectBtn').addEventListener('click', addProject);
    document.getElementById('closeProjectBtn').addEventListener('click', closeProjectDetail);
    document.getElementById('cancelProjectBtn').addEventListener('click', closeProjectDetail);
    document.getElementById('saveProjectBtn').addEventListener('click', saveProjectDetail);
    document.getElementById('deleteProjectBtn').addEventListener('click', deleteCurrentProject);
    document.getElementById('addProjectResourceBtn').addEventListener('click', () => addResource('project'));
    document.getElementById('subjectDetailModal').addEventListener('click', (e) => { if (e.target.id === 'subjectDetailModal') closeSubjectDetail(); });
    document.getElementById('projectDetailModal').addEventListener('click', (e) => { if (e.target.id === 'projectDetailModal') closeProjectDetail(); });
    document.getElementById('closeResourceBtn').addEventListener('click', closeResourceModal);
    document.getElementById('cancelResourceBtn').addEventListener('click', closeResourceModal);
    document.getElementById('saveResourceBtn').addEventListener('click', saveResource);
    document.getElementById('resourceModal').addEventListener('click', (e) => { if (e.target.id === 'resourceModal') closeResourceModal(); });

    // Auth modal event listeners
    document.getElementById('authButton').addEventListener('click', openAuthModal);
    document.getElementById('closeAuthBtn').addEventListener('click', closeAuthModal);
    document.getElementById('cancelAuthBtn').addEventListener('click', closeAuthModal);
    document.getElementById('saveTokenBtn').addEventListener('click', saveToken);
    document.getElementById('authModal').addEventListener('click', (e) => { if (e.target.id === 'authModal') closeAuthModal(); });

    // Enter key to submit token
    document.getElementById('githubToken').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveToken();
    });

    // Settings modal event listeners
    document.getElementById('settingsButton').addEventListener('click', openSettingsModal);
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettingsModal);
    document.getElementById('closeSettingsFooterBtn').addEventListener('click', closeSettingsModal);
    document.getElementById('signOutBtn')?.addEventListener('click', handleSignOut);
    document.getElementById('manualSyncBtn')?.addEventListener('click', manualSync);
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', importData);
    document.getElementById('importFileInput').addEventListener('change', handleImportFile);
    document.getElementById('resetAllBtn').addEventListener('click', resetAllData);
    document.getElementById('settingsModal').addEventListener('click', (e) => { if (e.target.id === 'settingsModal') closeSettingsModal(); });

    // Catalog create subject button
    document.getElementById('catalogCreateSubjectBtn').addEventListener('click', openCreateSubjectModal);

    // Create subject modal event listeners
    document.getElementById('closeCreateSubjectBtn').addEventListener('click', closeCreateSubjectModal);
    document.getElementById('cancelCreateSubjectBtn').addEventListener('click', closeCreateSubjectModal);
    document.getElementById('saveNewSubjectBtn').addEventListener('click', saveNewSubject);
    document.getElementById('createSubjectModal').addEventListener('click', (e) => { if (e.target.id === 'createSubjectModal') closeCreateSubjectModal(); });

    // Initialize auth state
    if (window.githubAuth) {
        updateAuthButton();

        // If already authenticated, load from GitHub and update view mode
        if (githubAuth.isAuthenticated()) {
            (async () => {
                await updateViewMode();
                const loaded = await loadDataFromGitHub();
                if (loaded) {
                    render();
                }
                // Start auto-sync
                if (window.githubStorage && CONFIG.features.enableAutoSync) {
                    githubStorage.startAutoSync();
                }
            })();
        } else {
            // Not authenticated - load public data for read-only view
            (async () => {
                console.log('[Init] Not authenticated, loading public data...');
                viewMode = 'public';
                const loaded = await loadPublicDataFromGitHub();
                console.log('[Init] Public data loaded:', loaded);
                updateSettingsButtonVisibility();
                // Always render, even if loading failed (will show empty state)
                render();
            })();
        }
    }

    // Save to GitHub on page unload (if authenticated)
    if (CONFIG.app.syncOnUnload) {
        window.addEventListener('beforeunload', () => {
            if (window.githubAuth && githubAuth.isAuthenticated()) {
                saveDataToGitHub();
            }
        });
    }
});
