# Polymathica - Learning Tracker

## Project Overview

Polymathica is a web-based learning tracker application designed to help users organize and track their progress across multiple subjects, fields, and learning projects. The application provides a hierarchical structure for managing learning goals, resources, projects, and notes.

## Architecture

### File Structure

```text
learning-tracker/
├── index.html          # Main HTML structure with modals
├── app.js              # Core application logic (~750 lines)
├── styles.css          # Complete styling (dark/light theme support)
├── data/
│   ├── subjects.js     # Default subject catalog (Mathematics, Physics, etc.)
│   └── summaries.js    # Subject summaries (reserved for future use)
└── CLAUDE.md          # This file
```

### Technology Stack

- **Pure Vanilla JavaScript** - No frameworks
- **LocalStorage** - Data persistence
- **Marked.js** - Markdown rendering for notepads
- **CSS Custom Properties** - Theme support

## Data Model

### Data Structure

The application uses the following data hierarchy:

```javascript
subjects = {
  "Tier Name": {
    category: "string",
    subjects: [
      {
        id: "string",           // Unique identifier
        name: "string",         // Display name
        goal: "string",         // Optional learning goal
        prereq: ["id"],         // Required prerequisites
        coreq: ["id"],          // Co-requisites
        soft: ["id"],           // Soft dependencies
        resources: [            // Learning resources
          {
            type: "link",       // "link" or "text"
            value: "string",    // Display text
            url: "string"       // Optional URL if type=link
          }
        ],
        projects: [             // Nested projects
          {
            id: "string",
            name: "string",
            goal: "string",     // Required for projects
            resources: [],      // Same structure as subject resources
            notepad: "string",  // Markdown notes
            status: "string"    // "not-started", "in-progress", "completed"
          }
        ],
        notepad: "string"       // Markdown notes for subject
      }
    ]
  }
}
```

### Progress States

- `empty` - Not started (☐)
- `partial` - In progress (☑ with line)
- `complete` - Completed (☒ with checkmark)

### LocalStorage Keys

- `subjects` - Subject data structure
- `subjectProgress` - Map of subject IDs to progress states
- `theme` - "light" or "dark"
- `currentView` - "dashboard" or "catalog"

## Key Features

### 1. Dashboard View

- **Current Section** - Shows subjects with `partial` progress
- **Completed Section** - Shows subjects with `complete` progress
- Click subjects to open detail modal

### 2. Catalog View

- Organized by tiers (Mathematics, Physics, Chemistry, etc.)
- Collapsible tier headers
- Filter by search, status, and category
- Each subject card shows:
  - Title
  - Goal (if set)
  - Resources (with clickable links)
  - Projects (if any)
  - Progress checkbox (top right)
  - Dependencies

### 3. Subject Detail Modal

Opened by clicking on a subject card. Contains:
- **Goal** - Optional text area
- **Resources** - List with add/remove functionality
- **Projects** - List with add/edit/delete functionality
- **Notepad** - Markdown editor with live preview

### 4. Project Detail Modal

Opened when adding/editing a project. Contains:
- **Name** - Required text field
- **Goal** - Required text area
- **Resources** - Same as subject resources
- **Notepad** - Markdown editor with preview

### 5. Resource Modal

Simple modal for adding resources:
- **Title/Description** - Required
- **Link** - Optional URL
  - If provided, resource becomes clickable
  - If not, displays as plain text

### 6. Progress Tracking

- Click checkbox on subject card to cycle: empty → partial → complete
- Progress persists in localStorage
- Dashboard automatically categorizes by progress

### 7. Dependencies & Prerequisites

- `prereq` - Must complete before subject is ready
- `coreq` - Should study simultaneously
- `soft` - Helpful but not required
- Visual indicators for locked subjects

## Important Functions

### Data Management

- `loadAllData()` - Loads subjects and progress from localStorage
- `saveSubjects()` - Persists subjects to localStorage
- `saveProgress()` - Persists progress to localStorage

### Rendering

- `render()` - Main render function (dashboard or catalog view)
- `renderSubjectCard(subject)` - Renders individual subject card
- `renderTier(tierName, tierData)` - Renders tier with subjects
- `renderResourcesList(resources, containerId, type)` - Renders resource list in modals

### Modals

- `openSubjectDetail(subjectId)` - Opens subject detail modal
- `saveSubjectDetail()` - Saves changes from subject modal
- `closeSubjectDetail()` - Closes subject modal
- `addProject()` - Opens project modal in "add" mode
- `editProject(projectIndex)` - Opens project modal in "edit" mode
- `saveProjectDetail()` - Handles both add and edit for projects
- `addResource(type)` - Opens resource modal ('subject' or 'project')
- `saveResource()` - Saves resource to appropriate context

### Progress & State

- `getSubjectProgress(id)` - Returns 'empty', 'partial', or 'complete'
- `setSubjectProgress(id, progress)` - Sets progress state
- `cycleProgress(id, event)` - Cycles through progress states
- `calculateReadiness(subject)` - Determines if subject is ready/locked

### View Management

- `switchView(view)` - Switches between 'dashboard' and 'catalog'
- `applyFilters()` - Applies search and filter criteria in catalog view

## Recent Major Changes

### Refactoring from v1 to v2

1. **Removed expandable/collapsible subject cards**
   - Subject content now always visible
   - Simplified rendering logic
   - Cleaned up unused functions: `toggleSubjectExpanded`, `isSubjectExpanded`, `toggleProjectExpanded`, `isProjectExpanded`

2. **Updated UI structure**
   - Progress checkbox positioned in top right
   - No expand arrow or ID shown on cards
   - Cleaner, simpler card design

3. **Replaced prompt/alert dialogs with proper modals**
   - Resource modal for adding resources
   - Project modal used for both add and edit
   - Better UX with form validation

4. **Improved resource handling**
   - Resources have type (link/text) and optional URL
   - Links are clickable when displayed
   - Can add resources to new projects before saving (uses `tempProjectResources`)

5. **Progress states**
   - Uses: "empty", "partial", "complete"
   - Simple three-state system

6. **Theme system**
   - Fixed icon reversal: ☀️ for light mode, 🌙 for dark mode
   - Uses CSS custom properties for theming
   - Persists theme preference

## CSS Architecture

### Key Classes

- `.subject-card` - Main card container
  - `.subject-card.empty` - Not started (gray border)
  - `.subject-card.partial` - In progress (orange border)
  - `.subject-card.complete` - Completed (green border)
  - `.subject-card.locked` - Prerequisites not met (dimmed)

- `.progress-checkbox` - Styled checkbox
  - Absolute positioned (top: 15px, right: 15px)
  - Three states via pseudo-elements

- `.modal` - Modal container
  - `.modal.active` - Visible modal
  - `.modal-content` - Modal dialog box

- `.tier` - Tier container
  - `.tier.collapsed` - Hidden tier content

### Theme Variables

Defined in `:root` and `[data-theme="dark"]`:
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--text-primary`, `--text-secondary`
- `--border-color`, `--border-dark`
- Card-specific backgrounds for different states

## Known Patterns & Conventions

### Global Functions

Functions used in inline `onclick` handlers must be exposed on `window`:
```javascript
window.cycleProgress = cycleProgress;
window.openSubjectDetail = openSubjectDetail;
// etc.
```

### Modal Pattern

1. Open: Set form values, `modal.classList.add('active')`
2. Save: Validate, update data, `saveSubjects()`, close modal, re-render
3. Close: `modal.classList.remove('active')`, clear editing state

### Resource Context

- `currentResourceContext` tracks whether adding to 'subject' or 'project'
- `tempProjectResources` holds resources for new (unsaved) projects
- Cleared when project is saved or modal closed

## Testing & Debugging

### Common Issues

1. **LocalStorage conflicts** - Clear localStorage if data structure changes
2. **Modal not showing** - Check if `.active` class is added
3. **Functions not accessible** - Ensure exposed on `window` object
4. **Progress not saving** - Check `saveProgress()` is called after state change

### Debug Helpers

The codebase includes console.log statements in key functions (can be removed for production):
- `[Init]` - Initialization process
- `[Render]` - Rendering process
- `[Load]` - Data loading

## Development Guidelines

### Adding New Features

1. **New modal**: Add HTML structure in index.html, create open/close/save functions
2. **New data field**: Update data model, update save/load functions
3. **New view**: Add render logic in `render()`, add navigation
4. **New filter**: Update `applyFilters()` function

### Code Style

- Use descriptive function names
- Keep functions focused and small
- Comment complex logic
- Update this file when making architectural changes

### Data Changes

When modifying the data structure:
1. Update the data model in defaultSubjects
2. Test thoroughly with existing data
3. Consider if breaking changes require clearing localStorage
4. Update documentation (CLAUDE.md and README.md)

## Future Considerations

### Potential Improvements

1. **Export/Import** - Allow users to backup/restore data
2. **Statistics** - More detailed progress tracking and analytics
3. **Search** - More powerful search with fuzzy matching
4. **Tagging** - Add tags to subjects for better organization
5. **Progress History** - Track progress over time
6. **Multiple Catalogs** - Support different learning paths
7. **Collaboration** - Share subjects/resources with others
8. **Mobile Optimization** - Better responsive design
9. **Offline PWA** - Service worker for offline access
10. **Undo/Redo** - Action history for mistake recovery

### Architecture Improvements

1. **Modularization** - Split app.js into modules
2. **State Management** - More structured state handling
3. **Event Bus** - Decouple components with event system
4. **Testing** - Add unit and integration tests
5. **Build Process** - Minification and optimization

## Quick Start Guide

### For Continuing Development

1. **Read this file completely** - Understand the architecture
2. **Review data model** - Understanding the data structure is key
3. **Check modal patterns** - Most features use the modal pattern
4. **Test thoroughly** - Changes to data model need careful testing
5. **Update CLAUDE.md** - Document significant changes here

### Common Tasks

**Add a new field to subjects:**
```javascript
// 1. Update default subject structure in data/subjects.js
// 2. Update renderSubjectCard() to display it
// 3. Update openSubjectDetail() to populate modal
// 4. Update saveSubjectDetail() to save it
```

**Add a new modal:**
```javascript
// 1. Add HTML in index.html
// 2. Create openXModal() function
// 3. Create closeXModal() function
// 4. Create saveXModal() function
// 5. Add event listeners in DOMContentLoaded
// 6. Add click-outside-to-close handler
```

**Add a new view:**
```javascript
// 1. Add navigation button in index.html
// 2. Add case in switchView() function
// 3. Add render logic in render() function
// 4. Add any view-specific functions
// 5. Update saveView() and loadView()
```

## Contact & Support

This is a personal learning tracker project. For questions or contributions, refer to the GitHub repository (if applicable) or contact the project maintainer.

---

**Last Updated**: 2025-11-29
**Total Lines of Code**: ~1750 (HTML + JS + CSS)
