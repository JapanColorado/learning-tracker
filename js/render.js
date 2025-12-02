// ==========================================
// RENDERING MODULE
// ==========================================
// Functions for rendering UI components and views

// ==========================================
// CARD RENDERING HELPERS
// ==========================================

/**
 * Render dependencies section within a subject card
 * @param {Object} subject - Subject with dependencies
 * @returns {string} HTML string for dependencies
 */
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

/**
 * Render projects list within a subject card
 * @param {Array} projects - Array of project objects
 * @param {string} subjectId - ID of parent subject
 * @returns {string} HTML string for projects
 */
function renderProjectsInCard(projects, subjectId) {
    if (!projects || projects.length === 0) return '';

    return `<div class="projects-list">${projects.map((project, index) => {
        // Map old status to new progress values
        const progress = {
            'not-started': 'empty',
            'in-progress': 'partial',
            'completed': 'complete'
        }[project.status] || 'empty';

        return `
            <div class="project-mini-card ${progress}" onclick="editProject('${subjectId}', ${index}, event)">
                <span class="project-name">
                    ${project.name}
                </span>
                <div class="project-progress-checkbox ${progress}"
                     onclick="cycleProjectProgress('${subjectId}', ${index}, event)">
                </div>
            </div>
        `;
    }).join('')}</div>`;
}

// ==========================================
// SUBJECT CARD RENDERING
// ==========================================

/**
 * Render a subject card (normal catalog view)
 * @param {Object} subject - Subject object
 * @returns {string} HTML string for subject card
 */
function renderSubjectCard(subject) {
    const progress = getSubjectProgress(subject.id);
    const readiness = calculateReadiness(subject);
    const isPublicMode = viewMode === 'public';

    let cardClasses = `subject-card ${progress}`;
    if (readiness === 'locked') cardClasses += ' locked';

    // Public mode: Show everything read-only (no edit access)
    if (isPublicMode) {
        return `
            <div class="${cardClasses}" data-id="${subject.id}" onclick="openSubjectDetail('${subject.id}', event)" style="cursor: pointer;">
                <div class="subject-card-header">
                    <span class="subject-name">${subject.name}</span>
                    <div class="progress-checkbox ${progress}" style="pointer-events: none;"></div>
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

    // Owner mode - show full details with edit access
    return `
        <div class="${cardClasses}" data-id="${subject.id}" onclick="openSubjectDetail('${subject.id}', event)" style="cursor: pointer;">
            <div class="subject-card-header">
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

/**
 * Render an expanded subject card (dashboard view)
 * @param {Object} subject - Subject object
 * @returns {string} HTML string for expanded card
 */
function renderSubjectCardExpanded(subject) {
    const progress = getSubjectProgress(subject.id);
    const readiness = calculateReadiness(subject);
    const isPublicMode = viewMode === 'public';

    let cardClasses = `subject-card expanded ${progress}`;
    if (readiness === 'locked') cardClasses += ' locked';

    let html = `<div class="${cardClasses}" data-id="${subject.id}" onclick="openSubjectDetail('${subject.id}', event)">`;

    // Header with title and checkbox
    html += `<div class="card-header">`;
    html += `<h3 class="subject-title">${subject.name}</h3>`;

    // Checkbox: clickable in owner mode, static in public mode
    if (isPublicMode) {
        html += `<div class="progress-checkbox ${progress}" style="pointer-events: none;"></div>`;
    } else {
        html += `<div class="progress-checkbox ${progress}" onclick="cycleProgress('${subject.id}', event)"></div>`;
    }
    html += `</div>`;

    // Goal (if exists)
    if (subject.goal) {
        html += `<div class="card-section">
                   <strong>Goal:</strong> ${subject.goal}
                 </div>`;
    }

    // Resources (if any, show first 3 inline)
    if (subject.resources && subject.resources.length > 0) {
        html += `<div class="card-section">`;
        html += `<strong>Resources:</strong>`;
        html += `<div class="resources-list-inline">`;
        subject.resources.slice(0, 3).forEach(resource => {
            if (resource.type === 'link') {
                html += `<a href="${resource.url}" target="_blank" rel="noopener"
                            onclick="event.stopPropagation()" class="resource-link-inline">
                           ${resource.value}
                         </a>`;
            } else {
                html += `<span class="resource-text-inline">${resource.value}</span>`;
            }
        });
        if (subject.resources.length > 3) {
            html += `<span class="more-indicator">+${subject.resources.length - 3} more</span>`;
        }
        html += `</div></div>`;
    }

    // Projects (full mini-cards with goals and resources)
    if (subject.projects && subject.projects.length > 0) {
        html += `<div class="card-section">`;
        html += `<strong>Projects:</strong>`;
        html += `<div class="projects-list-expanded">`;
        subject.projects.forEach((project, index) => {
            const projectProgress = {
                'not-started': 'empty',
                'in-progress': 'partial',
                'completed': 'complete'
            }[project.status] || 'empty';

            // In public mode, use viewProject instead of editProject
            const projectClickHandler = isPublicMode
                ? `onclick="viewProject(${index}, event)"`
                : `onclick="editProject('${subject.id}', ${index}, event)"`;

            html += `<div class="project-card-expanded ${projectProgress}" ${projectClickHandler}>`;
            html += `<div class="project-header">`;
            html += `<span class="project-name">
                       ${project.name}
                     </span>`;

            // Project checkbox: static in public mode
            if (isPublicMode) {
                html += `<div class="project-progress-checkbox ${projectProgress}" style="pointer-events: none;"></div>`;
            } else {
                html += `<div class="project-progress-checkbox ${projectProgress}"
                              onclick="cycleProjectProgress('${subject.id}', ${index}, event)">
                         </div>`;
            }
            html += `</div>`;

            if (project.goal) {
                html += `<div class="project-goal">${project.goal}</div>`;
            }

            if (project.resources && project.resources.length > 0) {
                html += `<div class="project-resources-mini">`;
                project.resources.slice(0, 2).forEach(resource => {
                    if (resource.type === 'link') {
                        html += `<a href="${resource.url}" target="_blank" rel="noopener"
                                    onclick="event.stopPropagation()" class="resource-link-mini">
                                   ${resource.value}
                                 </a>`;
                    }
                });
                if (project.resources.length > 2) {
                    html += `<span class="more-indicator">+${project.resources.length - 2}</span>`;
                }
                html += `</div>`;
            }

            html += `</div>`;
        });
        html += `</div></div>`;
    }

    html += `</div>`;
    return html;
}

/**
 * Toggle summary expansion in subject card
 * @param {Event} event - Click event
 */
function toggleSummary(event) {
    event.stopPropagation();
    const button = event.target;
    const summaryText = button.previousElementSibling;
    const card = button.closest('.subject-card');
    const subjectId = card.dataset.id;
    const subject = findSubject(subjectId);

    if (!subject || !subject.summary) return;

    const isExpanded = button.textContent === 'Read Less';

    if (isExpanded) {
        // Collapse
        const truncated = subject.summary.substring(0, 200) + '...';
        summaryText.textContent = truncated;
        button.textContent = 'Read More';
        summaryText.classList.remove('expanded');
    } else {
        // Expand
        summaryText.textContent = subject.summary;
        button.textContent = 'Read Less';
        summaryText.classList.add('expanded');
    }
}

// ==========================================
// TIER RENDERING
// ==========================================

/**
 * Render a tier with its subjects
 * @param {string} tierName - Name of the tier
 * @param {Object} tierData - Tier data with subjects array
 * @param {boolean} isCollapsed - Whether tier should be collapsed
 * @returns {string} HTML string for tier
 */
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

/**
 * Toggle tier collapse/expand
 * @param {HTMLElement} header - Tier header element
 */
function toggleTier(header) {
    header.parentElement.classList.toggle('collapsed');
}

// ==========================================
// MAIN RENDER FUNCTION
// ==========================================

/**
 * Main render function - renders entire dashboard or catalog view
 */
function render() {
    const content = document.getElementById('content');
    if (!content) return;
    let html = '';
    const isPublicMode = viewMode === 'public';

    // Public mode: Show banner at top
    if (isPublicMode) {
        html += `
            <div class="public-view-banner">
                📚 You're viewing a public learning catalog.
                <a href="https://github.com/${CONFIG.github.repoOwner}/${CONFIG.github.repoName}">Fork this tracker</a>
                to create your own personalized version!
            </div>
        `;
    }

    // Render dashboard or catalog based on currentView (works for both modes now)
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
        // Current section - expanded view with 2-column grid
        html += '<div class="dashboard-section"><h2 class="section-title">Current</h2>';
        if (currentSubjects.length) {
            html += '<div class="subjects-grid dashboard-current-grid">';
            html += currentSubjects.map(renderSubjectCardExpanded).join('');
            html += '</div>';
        } else {
            if (isPublicMode) {
                html += '<p class="empty-state">No subjects currently in progress.</p>';
            } else {
                html += '<p class="empty-state">No subjects in progress. Visit the <a href="#" onclick="switchView(\'catalog\'); return false;">Catalog</a> to get started!</p>';
            }
        }
        html += '</div>';

        // Completed section - normal grid
        html += '<div class="dashboard-section"><h2 class="section-title">Completed</h2>';
        if (completedSubjects.length) {
            html += '<div class="subjects-grid">';
            html += completedSubjects.map(renderSubjectCard).join('');
            html += '</div>';
        } else {
            html += '<p class="empty-state">No completed subjects yet.</p>';
        }
        html += '</div>';
    } else {
        html += Object.entries(subjects).map(([name, data]) => renderTier(name, data, false)).join('');
    }

    content.innerHTML = html;
    if (currentView === 'catalog' || viewMode === 'public') applyFilters();
}

// ==========================================
// MODAL RENDERING HELPERS
// ==========================================

/**
 * Render dependencies section in subject detail modal
 * @param {Object} subject - Subject with dependencies
 * @returns {string} HTML string for dependencies
 */
function renderDependenciesInModal(subject) {
    const sections = [];

    if (subject.prereq && subject.prereq.length > 0) {
        const prereqs = subject.prereq
            .map(id => findSubject(id))
            .filter(s => s)
            .map(s => `<span class="dep-tag prereq">${s.name}</span>`)
            .join('');
        sections.push(`<div class="dep-section"><strong>Prerequisites:</strong> ${prereqs}</div>`);
    }

    if (subject.coreq && subject.coreq.length > 0) {
        const coreqs = subject.coreq
            .map(id => findSubject(id))
            .filter(s => s)
            .map(s => `<span class="dep-tag coreq">${s.name}</span>`)
            .join('');
        sections.push(`<div class="dep-section"><strong>Co-requisites:</strong> ${coreqs}</div>`);
    }

    if (subject.soft && subject.soft.length > 0) {
        const softs = subject.soft
            .map(id => findSubject(id))
            .filter(s => s)
            .map(s => `<span class="dep-tag soft">${s.name}</span>`)
            .join('');
        sections.push(`<div class="dep-section"><strong>Recommended:</strong> ${softs}</div>`);
    }

    return sections.length > 0
        ? sections.join('')
        : '<p class="empty-state">No prerequisites or recommendations</p>';
}

/**
 * Render resources list in modal
 * @param {Array} resources - Array of resource objects
 * @param {string} containerId - ID of container element
 * @param {string} type - Type of resources ('subject' or 'project')
 */
function renderResourcesList(resources, containerId, type) {
    const container = document.getElementById(containerId);
    const isPublicMode = viewMode === 'public';

    if (!resources || resources.length === 0) {
        container.innerHTML = '<p class="empty-state">No resources yet</p>';
        return;
    }

    container.innerHTML = resources.map((resource, index) => {
        const displayContent = resource.type === 'link' ?
            `<a href="${resource.url}" target="_blank" rel="noopener" class="resource-link">${resource.value}</a>` :
            `<span class="resource-text">${resource.value}</span>`;

        const deleteButton = isPublicMode ? '' : `<button class="remove-btn" onclick="removeResource(${index}, '${type}')">×</button>`;

        return `
            <div class="resource-item">
                ${displayContent}
                ${deleteButton}
            </div>
        `;
    }).join('');
}

/**
 * Render projects list in subject detail modal
 * @param {Array} projects - Array of project objects
 */
function renderProjectsList(projects) {
    const container = document.getElementById('projectsList');
    const isPublicMode = viewMode === 'public';

    if (!projects || projects.length === 0) {
        container.innerHTML = '<p class="empty-state">No projects yet</p>';
        return;
    }

    container.innerHTML = projects.map((project, index) => {
        const actions = isPublicMode
            ? `<span class="project-status-badge">${project.status}</span>`
            : `
                <span class="project-status-badge">${project.status}</span>
                <button onclick="editProject(${index}, event)">Edit</button>
                <button class="remove-btn" onclick="removeProject(${index}, event)">Delete</button>
            `;

        const clickHandler = isPublicMode ? `onclick="viewProject(${index}, event)"` : ``;
        const cursorStyle = isPublicMode ? `style="cursor: pointer;"` : ``;

        return `
            <div class="project-item" ${clickHandler} ${cursorStyle}>
                <div class="project-header">
                    <span class="project-name">${project.name}</span>
                    <div class="project-actions">
                        ${actions}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
