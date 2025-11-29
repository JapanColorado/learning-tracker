// Helper utilities
function findSubject(subjectId) {
    for (const tierData of Object.values(subjects)) {
        const subject = tierData.subjects.find(s => s.id === subjectId);
        if (subject) return subject;
    }
    return null;
}

function findSubjectAndTier(subjectId) {
    for (const [tierName, tierData] of Object.entries(subjects)) {
        const index = tierData.subjects.findIndex(s => s.id === subjectId);
        if (index !== -1) {
            return { tierName, tierData, subject: tierData.subjects[index], index };
        }
    }
    return null;
}

// Global variables
let subjects = JSON.parse(JSON.stringify(defaultSubjects));
let subjectProgress = {};
let currentEditingSubject = null;
let currentEditingProject = null;
let currentResourceContext = null; // 'subject' or 'project'
let tempProjectResources = []; // Temporary storage for new project resources
let currentView = 'dashboard'; // 'dashboard' or 'catalog'

// Load saved data
function loadAllData() {
    // Subjects
    try {
        const savedSubjects = localStorage.getItem('subjects');
        subjects = savedSubjects ? JSON.parse(savedSubjects) : JSON.parse(JSON.stringify(defaultSubjects));
        if (!subjects || Object.keys(subjects).length === 0) {
            subjects = JSON.parse(JSON.stringify(defaultSubjects));
        }
    } catch (_) {
        subjects = JSON.parse(JSON.stringify(defaultSubjects));
    }
    // Progress
    try {
        subjectProgress = JSON.parse(localStorage.getItem('subjectProgress')) || {};
    } catch (_) {
        subjectProgress = {};
    }
}

// Save functions
function saveSubjects() {
    localStorage.setItem('subjects', JSON.stringify(subjects));
}

function saveProgress() {
    localStorage.setItem('subjectProgress', JSON.stringify(subjectProgress));
}

// Removed: saveExpandedState - no longer using expandable cards

// Theme management
function loadTheme() {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
}

function saveTheme(theme) {
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    saveTheme(newTheme);
    updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
    const button = document.getElementById('themeToggle');
    if (button) {
        button.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

function initializeTheme() {
    const theme = loadTheme();
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeButton(theme);
}

// View management
function loadView() {
    const saved = localStorage.getItem('currentView');
    return saved || 'dashboard';
}

function saveView(view) {
    localStorage.setItem('currentView', view);
}

function switchView(view) {
    currentView = view;
    saveView(view);

    // Update nav buttons
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.view === view) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Toggle view sections
    const dashboardView = document.getElementById('dashboardView');
    const catalogView = document.getElementById('catalogView');

    if (view === 'dashboard') {
        dashboardView.classList.remove('hidden');
        catalogView.classList.add('hidden');
    } else {
        dashboardView.classList.add('hidden');
        catalogView.classList.remove('hidden');
    }

    // Re-render content for the new view
    render();
}

// Subject progress functions
function getSubjectProgress(id) {
    return subjectProgress[id] || 'empty';
}

function setSubjectProgress(id, progress) {
    subjectProgress[id] = progress;
    saveProgress();
    render();
}

function cycleProgress(id, event) {
    if (event) {
        event.stopPropagation();
    }

    const current = getSubjectProgress(id);
    const next = {
        'empty': 'partial',
        'partial': 'complete',
        'complete': 'empty'
    };
    setSubjectProgress(id, next[current]);
}

// Expand/Collapse state management
// Removed: toggleSubjectExpanded, isSubjectExpanded, toggleProjectExpanded, isProjectExpanded
// No longer using expandable/collapsible subject cards - content always visible

// Calculate readiness
function calculateReadiness(subject) {
    if (!subject.prereq || subject.prereq.length === 0) {
        return 'ready';
    }

    const prereqProgresses = subject.prereq.map(id => getSubjectProgress(id));
    const allComplete = prereqProgresses.every(p => p === 'complete');
    const someComplete = prereqProgresses.some(p => p === 'complete');

    if (allComplete) {
        return 'ready';
    } else if (someComplete) {
        return 'partial';
    } else {
        return 'locked';
    }
}

// Stats calculation
function calculateStats() {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let ready = 0;
    
    Object.values(subjects).forEach(tier => {
        tier.subjects.forEach(subject => {
            total++;
            const progress = getSubjectProgress(subject.id);
            if (progress === 'complete') completed++;
            if (progress === 'partial') inProgress++;

            if (progress === 'empty') {
                const readiness = calculateReadiness(subject);
                if (readiness === 'ready') {
                    ready++;
                }
            }
        });
    });
    
    return {
        total,
        completed,
        inProgress,
        notStarted: total - completed - inProgress,
        ready,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
}

function updateStats() {
    const stats = calculateStats();
    document.getElementById('totalSubjects').textContent = stats.total;
    document.getElementById('completedCount').textContent = stats.completed;
    document.getElementById('inProgressCount').textContent = stats.inProgress;
    document.getElementById('readyCount').textContent = stats.ready;
    document.getElementById('progressFill').style.width = stats.percentage + '%';
    document.getElementById('progressFill').textContent = stats.percentage + '%';
}

function calculateTierProgress(tier) {
    let total = tier.subjects.length;
    let completed = tier.subjects.filter(s => getSubjectProgress(s.id) === 'complete').length;
    return `${completed}/${total}`;
}

// Rendering functions
function renderDependenciesInCard(subject) {
    if (!subject.prereq && !subject.soft && !subject.coreq) return '';

    let html = '<div class="dependencies">';

    if (subject.prereq && subject.prereq.length > 0) {
        const items = subject.prereq.map(id => {
            const completed = getSubjectProgress(id) === 'complete';
            return `<span class="dependency-item prereq-required ${completed ? 'completed' : ''}">${id}</span>`;
        }).join('');
        html += `
            <div class="dependency-section">
                <div class="dependency-label">Prerequisites (Required)</div>
                <div class="dependency-list">${items}</div>
            </div>`;
    }

    if (subject.soft && subject.soft.length > 0) {
        const items = subject.soft.map(id => {
            const completed = getSubjectProgress(id) === 'complete';
            return `<span class="dependency-item prereq-recommended ${completed ? 'completed' : ''}">${id}</span>`;
        }).join('');
        html += `
            <div class="dependency-section">
                <div class="dependency-label">Recommended Background</div>
                <div class="dependency-list">${items}</div>
            </div>`;
    }

    if (subject.coreq && subject.coreq.length > 0) {
        const items = subject.coreq.map(id => {
            const completed = getSubjectProgress(id) === 'complete';
            return `<span class="dependency-item coreq ${completed ? 'completed' : ''}">${id}</span>`;
        }).join('');
        html += `
            <div class="dependency-section">
                <div class="dependency-label">Corequisites</div>
                <div class="dependency-list">${items}</div>
            </div>`;
    }

    html += '</div>';
    return html;
}

function renderProjectsInCard(projects, subjectId) {
    if (!projects || projects.length === 0) return '';

    return `<div class="projects-list">${projects.map((project, index) => {
        // Map old status to new progress values
        const progress = {
            'not-started': 'empty',
            'in-progress': 'partial',
            'completed': 'complete'
        }[project.status] || 'empty';

        const progressIcon = {
            'empty': '☐',
            'partial': '☑',
            'complete': '☒'
        }[progress];

        return `
            <div class="project-mini-card ${progress}" onclick="editProject(${index}, event)">
                <span class="project-name">${project.name}</span>
                <span class="project-progress-checkbox ${progress}">${progressIcon}</span>
            </div>
        `;
    }).join('')}</div>`;
}

function renderSubjectCard(subject) {
    const progress = getSubjectProgress(subject.id);
    const readiness = calculateReadiness(subject);

    let cardClasses = `subject-card ${progress}`;
    if (readiness === 'locked') cardClasses += ' locked';

    return `
        <div class="${cardClasses}" data-id="${subject.id}">
            <div class="subject-card-header" onclick="openSubjectDetail('${subject.id}', event)">
                <span class="subject-name">${subject.name}</span>
                <div class="progress-checkbox ${progress}" onclick="cycleProgress('${subject.id}', event)"></div>
            </div>
            <div class="subject-card-content">
                ${subject.goal ? `
                    <div class="card-section">
                        <span class="card-section-label">Goal</span>
                        <div class="card-goal">${subject.goal}</div>
                    </div>
                ` : ''}

                ${subject.resources && subject.resources.length > 0 ? `
                    <div class="card-section">
                        <span class="card-section-label">Resources</span>
                        <div class="resources-list">
                            ${subject.resources.map(r => `
                                <div class="resource-item ${r.type === 'text' ? 'text-resource' : ''}">
                                    ${r.type === 'link' ?
                                        `<a href="${r.url}" target="_blank" rel="noopener">${r.value}</a>` :
                                        `<span>${r.value}</span>`
                                    }
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${subject.projects && subject.projects.length > 0 ? `
                    <div class="card-section">
                        <span class="card-section-label">Projects</span>
                        ${renderProjectsInCard(subject.projects, subject.id)}
                    </div>
                ` : ''}

                ${renderDependenciesInCard(subject)}
            </div>
        </div>
    `;
}

function renderTier(tierName, tierData, isCollapsed = false) {
    const progress = calculateTierProgress(tierData);
    const subjectsHtml = tierData.subjects.map(renderSubjectCard).join('');
    
    return `
        <div class="tier ${isCollapsed ? 'collapsed' : ''}" data-tier="${tierName}">
            <div class="tier-header" onclick="toggleTier(this)">
                <span class="tier-title">${tierName}</span>
                <div>
                    <span class="tier-progress">${progress} completed</span>
                    <span class="toggle-icon"> ▼</span>
                </div>
            </div>
            <div class="subjects-grid">
                ${subjectsHtml}
            </div>
        </div>
    `;
}

function toggleTier(header) {
    header.parentElement.classList.toggle('collapsed');
}

function render() {
    const content = document.getElementById('content');
    if (!content) return;
    let html = '';
    if (currentView === 'dashboard') {
        const currentSubjects = [];
        const completedSubjects = [];
        Object.values(subjects).forEach(tierData => {
            tierData.subjects.forEach(subject => {
                const progress = getSubjectProgress(subject.id);
                if (progress === 'partial') currentSubjects.push(subject);
                else if (progress === 'complete') completedSubjects.push(subject);
            });
        });
        html += '<div class="dashboard-section"><h2 class="section-title">Current</h2>';
        html += currentSubjects.length ? `<div class="subjects-grid">${currentSubjects.map(renderSubjectCard).join('')}</div>` : `<p class="empty-state">No subjects in progress. Visit the <a href="#" onclick="switchView('catalog'); return false;">Catalog</a> to get started!</p>`;
        html += '</div><div class="dashboard-section"><h2 class="section-title">Completed</h2>';
        html += completedSubjects.length ? `<div class="subjects-grid">${completedSubjects.map(renderSubjectCard).join('')}</div>` : `<p class="empty-state">No completed subjects yet. Keep learning!</p>`;
        html += '</div>';
    } else {
        html = Object.entries(subjects).map(([name, data]) => renderTier(name, data, false)).join('');
    }
    content.innerHTML = html;
    if (currentView === 'catalog') applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    document.querySelectorAll('.subject-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        const id = card.dataset.id;
        const progress = getSubjectProgress(id);
        const statusMatch = statusFilter === 'all' ||
            (statusFilter === 'not-started' && progress === 'empty') ||
            (statusFilter === 'in-progress' && progress === 'partial') ||
            (statusFilter === 'completed' && progress === 'complete');
        const subjectInfo = findSubjectAndTier(id);
        const category = subjectInfo ? subjectInfo.tierData.category : 'general';
        const matchesSearch = !searchTerm || text.includes(searchTerm);
        const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
        if (matchesSearch && statusMatch && matchesCategory) card.classList.remove('hidden'); else card.classList.add('hidden');
    });
    document.querySelectorAll('.tier').forEach(tier => {
        const visibleCards = tier.querySelectorAll('.subject-card:not(.hidden)');
        tier.classList.toggle('hidden', visibleCards.length === 0);
    });
}

// Subject Detail Modal
function openSubjectDetail(subjectId, event) {
    if (event) event.stopPropagation();
    currentEditingSubject = subjectId;
    const subject = findSubject(subjectId);
    if (!subject) return;
    document.getElementById('detailModalTitle').textContent = subject.name;
    document.getElementById('subjectGoal').value = subject.goal || '';
    document.getElementById('subjectNotepad').value = subject.notepad || '';
    renderResourcesList(subject.resources || [], 'resourcesList', 'subject');
    renderProjectsList(subject.projects || []);
    switchNotepadTab('edit', 'subject');
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
    const goal = document.getElementById('subjectGoal').value.trim();
    subject.goal = goal || undefined;
    subject.notepad = document.getElementById('subjectNotepad').value;
    saveSubjects();
    closeSubjectDetail();
    render();
}

// Resource Management
function renderResourcesList(resources, containerId, type) {
    const container = document.getElementById(containerId);

    if (!resources || resources.length === 0) {
        container.innerHTML = '<p class="empty-state">No resources yet</p>';
        return;
    }

    container.innerHTML = resources.map((resource, index) => {
        const displayContent = resource.type === 'link' ?
            `<a href="${resource.url}" target="_blank" rel="noopener" class="resource-link">${resource.value}</a>` :
            `<span class="resource-text">${resource.value}</span>`;

        return `
            <div class="resource-item">
                ${displayContent}
                <button class="remove-btn" onclick="removeResource(${index}, '${type}')">×</button>
            </div>
        `;
    }).join('');
}

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
            const projectIndex = parseInt(currentEditingProject.split('-')[1]);
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
            const projectIndex = parseInt(currentEditingProject.split('-')[1]);
            const subject = findSubject(currentEditingSubject);
            if (!subject || !subject.projects || !subject.projects[projectIndex] || !subject.projects[projectIndex].resources) return;
            subject.projects[projectIndex].resources.splice(index, 1);
            renderResourcesList(subject.projects[projectIndex].resources, 'projectResourcesList', 'project');
            saveSubjects();
        }
    }
}

// Project Management
function renderProjectsList(projects) {
    const container = document.getElementById('projectsList');

    if (!projects || projects.length === 0) {
        container.innerHTML = '<p class="empty-state">No projects yet</p>';
        return;
    }

    container.innerHTML = projects.map((project, index) => `
        <div class="project-item">
            <div class="project-header">
                <span class="project-name">${project.name}</span>
                <div class="project-actions">
                    <span class="project-status-badge">${project.status}</span>
                    <button onclick="editProject(${index}, event)">Edit</button>
                    <button class="remove-btn" onclick="removeProject(${index}, event)">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

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
    document.getElementById('projectNotepad').value = '';
    document.getElementById('deleteProjectBtn').style.display = 'none'; // Hide delete button for new projects

    // Clear resources list
    document.getElementById('projectResourcesList').innerHTML = '<p class="empty-state">No resources yet</p>';

    // Show the modal
    document.getElementById('projectDetailModal').classList.add('active');
}

function editProject(projectIndex, event) {
    if (event) event.stopPropagation();
    if (!currentEditingSubject) return;
    currentEditingProject = `${currentEditingSubject}-${projectIndex}`;
    const subject = findSubject(currentEditingSubject);
    if (!subject || !subject.projects || !subject.projects[projectIndex]) return;
    const project = subject.projects[projectIndex];
    document.getElementById('projectModalTitle').textContent = 'Edit Project';
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectGoal').value = project.goal;
    document.getElementById('projectNotepad').value = project.notepad || '';
    renderResourcesList(project.resources || [], 'projectResourcesList', 'project');
    switchNotepadTab('edit', 'project');
    document.getElementById('projectDetailModal').classList.add('active');
    document.getElementById('deleteProjectBtn').style.display = 'inline-block';
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

// Project Detail Modal
function closeProjectDetail() {
    document.getElementById('projectDetailModal').classList.remove('active');
    currentEditingProject = null;
}

function saveProjectDetail() {
    if (!currentEditingProject) return;

    const name = document.getElementById('projectName').value.trim();
    const goal = document.getElementById('projectGoal').value.trim();
    const notepad = document.getElementById('projectNotepad').value;

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
            notepad: notepad,
            status: 'not-started'
        };
        subject.projects = subject.projects || [];
        subject.projects.push(project);
        tempProjectResources = []; // Clear temporary resources
    } else {
        // Editing existing project
        const projectIndex = parseInt(currentEditingProject.split('-')[1]);
        if (!subject.projects || !subject.projects[projectIndex]) return;
        const project = subject.projects[projectIndex];
        project.name = name;
        project.goal = goal;
        project.notepad = notepad;
    }

    saveSubjects();
    closeProjectDetail();
    renderProjectsList(subject.projects);
    render();
}

function deleteCurrentProject() {
    if (!currentEditingProject) return;
    if (!confirm('Delete this project? This cannot be undone.')) return;
    const projectIndex = parseInt(currentEditingProject.split('-')[1]);
    const subject = findSubject(currentEditingSubject);
    if (!subject || !subject.projects) return;
    subject.projects.splice(projectIndex, 1);
    saveSubjects();
    closeProjectDetail();
    renderProjectsList(subject.projects);
    render();
}

// Notepad Tab Switching
function switchNotepadTab(tab, context) {
    const tabs = document.querySelectorAll(`.notepad-tab[data-context="${context}"]`);
    const textarea = document.getElementById(context === 'subject' ? 'subjectNotepad' : 'projectNotepad');
    const preview = document.getElementById(context === 'subject' ? 'subjectNotepadPreview' : 'projectNotepadPreview');

    tabs.forEach(t => {
        if (t.dataset.tab === tab) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });

    if (tab === 'edit') {
        textarea.style.display = 'block';
        preview.classList.remove('active');
    } else {
        textarea.style.display = 'none';
        preview.classList.add('active');
        updateNotepadPreview(context);
    }
}

function updateNotepadPreview(context) {
    const textarea = document.getElementById(context === 'subject' ? 'subjectNotepad' : 'projectNotepad');
    const preview = document.getElementById(context === 'subject' ? 'subjectNotepadPreview' : 'projectNotepadPreview');
    const markdown = textarea.value;

    if (markdown.trim()) {
        marked.setOptions({ breaks: true, gfm: true });
        preview.innerHTML = marked.parse(markdown);
    } else {
        preview.innerHTML = '<p class="empty-state">Nothing to preview. Add some markdown in the Edit tab.</p>';
    }
}

// Make functions globally accessible for inline onclick handlers
window.cycleProgress = cycleProgress;
window.openSubjectDetail = openSubjectDetail;
window.editProject = editProject;
window.removeProject = removeProject;
window.removeResource = removeResource;
window.switchView = switchView;
window.toggleTier = toggleTier;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    initializeTheme();
    currentView = loadView();
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
    document.getElementById('addSubjectResourceBtn').addEventListener('click', () => addResource('subject'));
    document.getElementById('addProjectBtn').addEventListener('click', addProject);
    document.querySelectorAll('.notepad-tab[data-context="subject"]').forEach(tab => tab.addEventListener('click', () => switchNotepadTab(tab.dataset.tab, 'subject')));
    document.getElementById('subjectNotepad').addEventListener('input', () => { if (document.getElementById('subjectNotepadPreview').classList.contains('active')) updateNotepadPreview('subject'); });
    document.getElementById('closeProjectBtn').addEventListener('click', closeProjectDetail);
    document.getElementById('cancelProjectBtn').addEventListener('click', closeProjectDetail);
    document.getElementById('saveProjectBtn').addEventListener('click', saveProjectDetail);
    document.getElementById('deleteProjectBtn').addEventListener('click', deleteCurrentProject);
    document.getElementById('addProjectResourceBtn').addEventListener('click', () => addResource('project'));
    document.querySelectorAll('.notepad-tab[data-context="project"]').forEach(tab => tab.addEventListener('click', () => switchNotepadTab(tab.dataset.tab, 'project')));
    document.getElementById('projectNotepad').addEventListener('input', () => { if (document.getElementById('projectNotepadPreview').classList.contains('active')) updateNotepadPreview('project'); });
    document.getElementById('subjectDetailModal').addEventListener('click', (e) => { if (e.target.id === 'subjectDetailModal') closeSubjectDetail(); });
    document.getElementById('projectDetailModal').addEventListener('click', (e) => { if (e.target.id === 'projectDetailModal') closeProjectDetail(); });
    document.getElementById('closeResourceBtn').addEventListener('click', closeResourceModal);
    document.getElementById('cancelResourceBtn').addEventListener('click', closeResourceModal);
    document.getElementById('saveResourceBtn').addEventListener('click', saveResource);
    document.getElementById('resourceModal').addEventListener('click', (e) => { if (e.target.id === 'resourceModal') closeResourceModal(); });
});
