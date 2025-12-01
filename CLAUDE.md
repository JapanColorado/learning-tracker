# Polymathica - Learning Tracker

## Project Overview

Polymathica is a web-based learning tracker application designed to help users organize and track their progress across multiple subjects, fields, and learning projects. The application is hosted on GitHub Pages and provides both public read-only viewing and authenticated owner editing, with cross-device sync via GitHub.

## Architecture

### File Structure

```text
learning-tracker/
├── index.html          # Main HTML structure with modals
├── app.js              # Core application logic (~1900 lines)
├── styles.css          # Complete styling (dark/light theme support)
├── auth.js             # GitHub authentication handler (Personal Access Tokens)
├── storage.js          # GitHub API storage adapter for data sync
├── config.js           # Public configuration (repo owner, OAuth client ID)
├── callback.html       # OAuth callback page (guides PAT setup)
├── data/
│   ├── catalog.json    # Subject catalog with integrated summaries (schema 3.0)
│   └── user-data.json  # User's personal data (synced via GitHub)
├── CLAUDE.md           # This file
├── README.md           # User-facing documentation
└── TODO.md             # Feature wishlist and done items
```

### Technology Stack

- **Pure Vanilla JavaScript** - No frameworks
- **GitHub Pages** - Static site hosting
- **GitHub API** - Data storage and synchronization
- **Personal Access Tokens** - Authentication (simpler than full OAuth for static sites)
- **LocalStorage** - Offline cache and fallback
- **CSS Custom Properties** - Theme support

### Deployment

- **Hosting**: GitHub Pages at `https://username.github.io/learning-tracker/`
- **Data Storage**: GitHub repository file `data/user-data.json`
- **Public Access**: Anyone can view read-only version
- **Owner Access**: Repository owner can edit after authentication

## Data Model

### Subject Catalog Structure (Schema 3.0)

The subject catalog is defined in `data/catalog.json` with integrated summaries:

```javascript
{
  "schema": "3.0",
  "catalogVersion": "2025-12-01",
  "lastUpdated": "2025-12-01T03:31:17.873Z",
  "metadata": {
    "totalSubjects": 118,
    "totalTiers": 14
  },
  "tiers": {
    "Mathematics": {
      "category": "mathematics",
      "order": 1,                 // Display order
      "subjects": {
        "calc1": {                // Subject ID (keyed, not array)
          "name": "Calculus 1 (Limits, Derivatives, Basic Integration)",
          "prereq": [],           // Required prerequisites
          "coreq": [],            // Co-requisites
          "soft": [],             // Soft dependencies
          "summary": "# Calculus 1\n\nFoundation of calculus..."
        },
        "calc2": {
          "name": "Calculus 2 (Integration Techniques, Series, Sequences)",
          "prereq": ["calc1"],
          "coreq": [],
          "soft": [],
          "summary": "# Calculus 2\n\nAdvanced integration..."
        }
        // ... more subjects keyed by ID
      }
    }
    // ... more tiers
  }
}
```

**Key Changes from v2.0:**

- **Keyed Structure**: Subjects stored as objects with ID keys instead of arrays (O(1) vs O(n) lookup)
- **Integrated Summaries**: Summaries merged directly into subject definitions
- **Schema Versioning**: Explicit schema version for future-proof data handling
- **Tier Ordering**: Explicit `order` field for tier display sequence

### User Data Structure (Schema 3.0)

User-specific data is stored in `data/user-data.json` and synced via GitHub:

```javascript
{
  "schema": "3.0",
  "lastModified": "2025-12-01T03:31:17.873Z",
  "progress": {
    "calc1": "complete",
    "calc2": "partial",
    "ml": "empty"
  },
  "overlays": {
    // Customizations for catalog subjects (non-custom)
    "calc2": {
      "goal": "Master integration techniques for physics applications",
      "resources": [
        {
          "type": "link",
          "value": "MIT OpenCourseWare - Calculus 2",
          "url": "https://..."
        }
      ],
      "projects": [
        {
          "id": "proj-123",
          "name": "Physics Problem Set",
          "goal": "Apply integration to solve physics problems",
          "resources": [],
          "status": "in-progress"
        }
      ]
    }
  },
  "customSubjects": {
    // User-created subjects (full definitions)
    "my-custom-topic": {
      "name": "Advanced Machine Learning",
      "tier": "Computer Science",
      "prereq": ["ml", "linalg"],
      "coreq": [],
      "soft": ["prob"],
      "summary": "My custom summary...",
      "goal": "Build production ML systems",
      "resources": [...],
      "projects": [...]
    }
  },
  "customTiers": {
    // User-created tiers
    "Personal Projects": {
      "category": "custom",
      "order": 999
    }
  },
  "theme": "dark"
}
```

**Key Changes from v2.0:**

- **`overlays`**: Stores customizations (goal, resources, projects) for catalog subjects
- **`customSubjects`**: Stores full definitions of user-created subjects with `isCustom` flag
- **`customTiers`**: Stores user-created tier definitions
- **Clean Separation**: Catalog subjects (immutable) vs user overlays (mutable)
- **Summary Handling**: Catalog summaries are read-only; custom subjects can have editable summaries

**Note**: Notepad functionality was removed for privacy reasons. User data is public in the repository.

### Progress States

- `empty` - Not started (☐)
- `partial` - In progress (☑)
- `complete` - Completed (☒)

### LocalStorage Keys

- `subjects` - Local copy of merged subject data
- `subjectProgress` - Map of subject IDs to progress states
- `theme` - "light" or "dark"
- `currentView` - "dashboard" or "catalog"
- `github_token` - Stored authentication token
- `github_username` - Authenticated user's GitHub username
- `github_user_data` - Cached copy of user data for offline access

## Authentication & Sync System

### Authentication Flow

The app uses **Personal Access Tokens** instead of full OAuth for simplicity:

1. User clicks "Sign In" button
2. Modal prompts for GitHub Personal Access Token
3. App validates token via GitHub API (`/user` endpoint)
4. Checks if authenticated user is repository owner
5. Stores token in localStorage

**Why Personal Access Tokens?**
- Full OAuth requires a server to exchange codes for tokens
- PATs work perfectly for static sites
- Users can easily create and manage tokens in GitHub settings

### View Modes

The app operates in two distinct modes:

#### Public Mode (`viewMode === 'public'`)
- **Trigger**: No authentication or non-owner authentication
- **Data Source**: `https://username.github.io/learning-tracker/data/user-data.json`
- **Features**:
  - Read-only view of all subjects, progress, goals, resources, projects
  - Can click into subjects and projects to view details
  - All edit controls hidden (buttons, inputs disabled)
  - Shows public view banner with fork link
  - Progress checkboxes disabled
  - Dashboard and Catalog views available

#### Owner Mode (`viewMode === 'owner'`)
- **Trigger**: Authenticated as repository owner
- **Data Source**: GitHub API with read/write access
- **Features**:
  - Full edit access to all data
  - Can modify goals, add/remove resources, create/edit/delete projects
  - Progress tracking with clickable checkboxes
  - Auto-sync every 5 minutes (configurable)
  - Manual sync via sync status indicator
  - Dashboard and Catalog views with full functionality

### Data Synchronization

**Loading Data (Public Mode)**:
```javascript
async function loadPublicDataFromGitHub() {
  // Fetches from GitHub Pages URL with cache-busting
  const pagesUrl = `https://${repoOwner}.github.io/${repoName}/data/user-data.json?t=${Date.now()}`;
  const userData = await fetch(pagesUrl).then(r => r.json());
  // Merges with default catalog
  // Renders public read-only view
}
```

**Loading Data (Owner Mode)**:
```javascript
async function loadDataFromGitHub() {
  // Uses GitHub API with authentication
  const userData = await githubStorage.loadUserData();
  // Merges customizations with default catalog
  // Enables full edit mode
}
```

**Saving Data (Owner Mode Only)**:
```javascript
async function saveDataToGitHub() {
  // Extracts only user customizations
  const userData = {
    version: '2.0',
    lastModified: new Date().toISOString(),
    progress: subjectProgress,
    subjects: extractUserCustomizations(),
    theme: currentTheme,
    currentView: currentView
  };

  // Saves to GitHub via API (creates commit)
  await githubStorage.saveUserData(userData);

  // Also caches in localStorage
}
```

**Auto-Sync**:
- Runs every 5 minutes when authenticated
- Only syncs if there are unsaved changes
- Sync on page unload (beforeunload event)
- Manual sync available via sync status click

### GitHub API Storage Adapter

**Key Methods** (`storage.js`):

- `loadUserData()` - Loads from GitHub, falls back to localStorage
- `saveUserData(data)` - Commits changes to GitHub, updates cache
- `sync()` - Pulls latest, merges local changes, pushes if needed
- `startAutoSync()` - Begins 5-minute interval sync
- `getSyncStatus()` - Returns sync state (offline/dirty/synced)

**Conflict Resolution**: Currently uses last-write-wins based on `lastModified` timestamp.

## Key Features

### 1. Dashboard View (Owner & Public)

- **Current Section** - Shows subjects with `partial` progress
- **Completed Section** - Shows subjects with `complete` progress
- Click subjects to open detail modal (read-only in public mode)

### 2. Catalog View (Owner & Public)

- Organized by tiers (Mathematics, Physics, Chemistry, etc.)
- Collapsible tier headers
- Filter by search, status, and category
- Each subject card shows:
  - Title
  - Goal (if set by owner)
  - Resources (with clickable links)
  - Projects (if any)
  - Progress checkbox (disabled in public mode)
  - Dependencies

### 3. Subject Detail Modal

**Owner Mode**:
- **Goal** - Editable text area
- **Resources** - List with add/remove functionality
- **Projects** - List with add/edit/delete functionality
- **Save/Cancel** buttons visible

**Public Mode**:
- **Goal** - Read-only display
- **Resources** - View-only list (no delete buttons)
- **Projects** - Clickable to view (no edit/delete buttons)
- **All edit controls hidden**

### 4. Project Detail Modal

**Owner Mode**:
- **Name** - Editable text field
- **Goal** - Editable text area (required)
- **Resources** - List with add/remove functionality
- **Save/Cancel/Delete** buttons visible

**Public Mode**:
- **Name** - Read-only display
- **Goal** - Read-only display
- **Resources** - View-only list
- **All edit controls hidden**

### 5. Resource Modal (Owner Mode Only)

- **Title/Description** - Required
- **Link** - Optional URL
  - If provided, resource becomes clickable
  - If not, displays as plain text

### 6. Progress Tracking (Owner Mode Only)

- Click checkbox on subject card to cycle: empty → partial → complete
- Progress syncs to GitHub automatically
- Dashboard automatically categorizes by progress

### 7. Dependencies & Prerequisites

- `prereq` - Must complete before subject is ready
- `coreq` - Should study simultaneously
- `soft` - Helpful but not required
- Visual indicators for locked subjects (dimmed if prerequisites not met)

## Important Functions

### Authentication & Sync (`auth.js`, `storage.js`, `app.js`)

#### Authentication
- `GitHubAuth.setToken(token)` - Sets and validates Personal Access Token
- `GitHubAuth.validateToken()` - Verifies token with GitHub API
- `GitHubAuth.isOwner()` - Checks if user is repository owner
- `GitHubAuth.logout()` - Clears auth data and reloads

#### Data Loading
- `loadPublicDataFromGitHub()` - Loads public data for read-only view
- `loadDataFromGitHub()` - Loads data via GitHub API (owner mode)
- `loadAllData()` - Legacy localStorage loading

#### Data Saving
- `saveDataToGitHub()` - Commits changes to GitHub (owner only)
- `saveSubjects()` - Saves to localStorage cache
- `saveProgress()` - Saves progress to localStorage cache

#### Sync Management
- `GitHubStorage.sync()` - Manual sync trigger
- `GitHubStorage.startAutoSync()` - Begins 5-minute interval
- `GitHubStorage.getSyncStatus()` - Returns sync state
- `updateSyncStatus()` - Updates UI sync indicator

### View Mode Management

- `updateViewMode()` - Determines and sets view mode (public/owner)
- `updateAuthButton()` - Updates sign-in button state
- `openAuthModal()` - Shows token input modal
- `saveToken()` - Validates and saves authentication token

### Data Management

- `findSubject(subjectId)` - Locates subject in catalog
- `findSubjectAndTier(subjectId)` - Returns subject with tier context

### Rendering

- `render()` - Main render function (dashboard or catalog view)
- `renderSubjectCard(subject)` - Renders card with mode awareness
  - Shows edit controls only in owner mode
  - Makes cards clickable in public mode
- `renderTier(tierName, tierData)` - Renders tier with subjects
- `renderResourcesList(resources, containerId, type)` - Mode-aware resource rendering
- `renderProjectsList(projects)` - Mode-aware project rendering

### Modals

#### Subject Detail
- `openSubjectDetail(subjectId, event)` - Opens modal with mode awareness
  - Owner mode: All controls enabled
  - Public mode: Read-only, no edit buttons
- `saveSubjectDetail()` - Saves changes (owner only)
- `closeSubjectDetail()` - Closes modal

#### Project Detail
- `addProject()` - Creates new project (owner only)
- `editProject(projectIndex, event)` - Opens project in edit mode (owner only)
- `viewProject(projectIndex, event)` - Opens project in read-only mode (public)
- `saveProjectDetail()` - Saves project changes (owner only)
- `deleteCurrentProject()` - Deletes project (owner only)

#### Resource Management
- `addResource(type)` - Opens resource modal (owner only)
- `saveResource()` - Saves resource to subject or project
- `removeResource(index, type)` - Removes resource (owner only)

### Progress & State

- `getSubjectProgress(id)` - Returns progress state
- `setSubjectProgress(id, progress)` - Sets progress and syncs
- `cycleProgress(id, event)` - Cycles through states (owner only)
- `calculateReadiness(subject)` - Determines if subject is ready/locked

### View Management

- `switchView(view)` - Switches between 'dashboard' and 'catalog'
- `applyFilters()` - Applies search and filter criteria in catalog view

## Recent Major Changes

### v3.0 - Unified Data Architecture (2025-12-01)

1. **Unified Catalog File**
   - Merged `data/subjects.js` + `data/summaries.js` → `data/catalog.json`
   - Integrated summaries directly into subject definitions
   - Single source of truth for catalog data

2. **Keyed Subject Structure**
   - Changed from array-based to object-keyed subjects
   - O(1) subject lookup instead of O(n) iteration
   - Subjects stored as `{ "subjectId": {...} }` instead of `[{id: "subjectId", ...}]`

3. **Schema-Based Data Model**
   - Explicit schema versioning (`"schema": "3.0"`)
   - Future-proof data format with validation
   - Graceful handling of version mismatches

4. **Overlay Pattern for Customizations**
   - Catalog subjects (immutable) separated from user customizations (mutable)
   - `overlays` field stores goal/resources/projects for catalog subjects
   - `customSubjects` field stores full definitions of user-created subjects
   - `customTiers` field supports user-defined tier categories

5. **Custom Subject Management**
   - User-created subjects marked with `isCustom: true` flag
   - Editable summaries for custom subjects only
   - Catalog summaries are read-only and display integrated content

6. **Improved Data Loading**
   - New `loadCatalog()` function loads catalog.json
   - New `mergeCatalogWithUserData()` merges catalog with user overlays
   - Cleaner separation of concerns in data layer

7. **Updated Export/Import**
   - Export includes schema v3.0 format
   - Import validates schema version and provides warnings
   - Backwards compatibility warnings for older formats

### v2.0 - GitHub Integration & Public Viewing

1. **GitHub Pages Hosting**
   - Migrated from local-only to GitHub Pages
   - Public URL: `https://username.github.io/learning-tracker/`

2. **Authentication System**
   - Implemented Personal Access Token authentication
   - Owner verification via GitHub API
   - Token stored in localStorage

3. **Data Storage Migration**
   - Moved from localStorage-only to GitHub API storage
   - User data stored in `data/user-data.json`
   - Automatic cross-device sync
   - LocalStorage as offline cache/fallback

4. **View Mode System**
   - Public mode: Read-only viewing for anyone
   - Owner mode: Full edit access for repository owner
   - Mode-aware rendering throughout app

5. **Read-Only Modal Support**
   - Public viewers can click into subjects/projects
   - All forms disabled, edit buttons hidden
   - Preserves viewing experience without edit access

6. **Removed Notepad Functionality**
   - Notepads removed entirely for privacy
   - User data is public in repository
   - Prevents accidental exposure of private notes

7. **Auto-Sync System**
   - 5-minute interval sync when authenticated
   - Sync on page unload
   - Manual sync via status indicator
   - Sync status display (synced/dirty/offline)

8. **Cache-Busting for Public Data**
   - Uses timestamp query parameter
   - Fetches from GitHub Pages URL (not raw CDN)
   - Ensures fresh data loads for public viewers

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
  - `pointer-events: none` in public mode

- `.modal` - Modal container
  - `.modal.active` - Visible modal
  - `.modal-content` - Modal dialog box

- `.tier` - Tier container
  - `.tier.collapsed` - Hidden tier content

- `.auth-controls` - Authentication UI
  - `.auth-button` - Sign in/out button
  - `.sync-status` - Sync indicator (hidden when not authenticated)

- `.public-view-banner` - Banner shown in public mode

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
window.editProject = editProject;
window.viewProject = viewProject;  // New for public mode
window.removeProject = removeProject;
window.removeResource = removeResource;
window.switchView = switchView;
window.toggleTier = toggleTier;
```

### Modal Pattern

1. **Open**: Set form values, configure for mode, `modal.classList.add('active')`
2. **Save**: Validate, update data, sync to GitHub (if owner), close modal, re-render
3. **Close**: `modal.classList.remove('active')`, clear editing state

### View Mode Checks

Throughout the codebase:
```javascript
const isPublicMode = viewMode === 'public';
if (isPublicMode) {
  // Disable edit controls
  // Make read-only
} else {
  // Enable full functionality
}
```

### Resource Context

- `currentResourceContext` tracks whether adding to 'subject' or 'project'
- `tempProjectResources` holds resources for new (unsaved) projects
- Cleared when project is saved or modal closed

## Configuration

### config.js

```javascript
const CONFIG = {
  github: {
    clientId: 'Ov23limAHgxWKUF6JeG8',  // OAuth Client ID (not used currently)
    repoOwner: 'JapanColorado',         // Repository owner
    repoName: 'learning-tracker',       // Repository name
    branch: 'main'                      // Branch name
  },
  app: {
    autoSyncInterval: 5 * 60 * 1000,   // 5 minutes
    syncOnUnload: true,                 // Sync when leaving page
    dataPath: 'data/user-data.json',   // Path to user data file
    viewModes: {
      PUBLIC: 'public',
      OWNER: 'owner'
    }
  },
  features: {
    enableAutoSync: true                // Enable 5-minute auto-sync
  }
};
```

## Testing & Debugging

### Common Issues

1. **Public view shows stale data**
   - GitHub Pages CDN may cache files
   - Hard refresh (Ctrl+Shift+R)
   - Wait 1-2 minutes for GitHub Pages to update

2. **Token authentication fails**
   - Verify token has 'repo' scope
   - Check token hasn't expired
   - Clear localStorage and try again

3. **Sync not working**
   - Check console for errors
   - Verify authentication
   - Check GitHub API rate limits (5000/hour when authenticated)

4. **Modal not showing**
   - Check if `.active` class is added
   - Verify modal HTML exists

5. **Functions not accessible**
   - Ensure exposed on `window` object
   - Check browser console for errors

### Debug Helpers

Console.log statements throughout:
- `[Init]` - Initialization process
- `[App]` - Application logic
- `[Storage]` - GitHub storage operations
- Response status logs for debugging fetch issues

## Development Guidelines

### Adding New Features

1. **New modal**:
   - Add HTML structure in index.html
   - Create open/close/save functions
   - Add mode awareness (public vs owner)
   - Update global window exports if needed

2. **New data field**:
   - Update user-data.json structure
   - Update save/load functions
   - Update UI rendering
   - Test with existing data

3. **New view**:
   - Add render logic in `render()`
   - Add navigation
   - Ensure works in both modes

4. **New filter**:
   - Update `applyFilters()` function
   - Add UI controls

### Code Style

- Use descriptive function names
- Keep functions focused and small
- Comment mode-specific logic clearly
- Update this file when making architectural changes

### Data Changes

When modifying the data structure:
1. Update the data model in `data/user-data.json`
2. Update save/load functions
3. Test with existing data
4. Consider migration path for existing users
5. Update documentation (CLAUDE.md and README.md)

## Security Considerations

### Token Storage
- Stored in localStorage (cleared on logout)
- Never committed to repository
- Token only validates on client side
- Consider token expiration handling

### Data Privacy
- User data file is public in repository
- Do not store sensitive information
- Notepads removed to prevent accidental exposure
- Consider private repository for sensitive tracking

### API Rate Limits
- Unauthenticated: 60 requests/hour
- Authenticated: 5000 requests/hour
- Auto-sync respects limits (5-minute interval)
- Manual sync available

## Future Considerations

### Potential Improvements

1. **Export/Import** - Backup/restore functionality
2. **Conflict Resolution** - Better merge strategies
3. **Offline PWA** - Service worker for offline access
4. **Mobile Optimization** - Better responsive design
5. **Statistics** - Detailed progress analytics
6. **Search** - Fuzzy matching and advanced search
7. **Private Projects** - Toggle project visibility
8. **Multiple Catalogs** - Support different learning paths
9. **Collaboration** - Share subjects/resources
10. **Undo/Redo** - Action history

### Architecture Improvements

1. **Modularization** - Split app.js into ES modules
2. **State Management** - Centralized state handling
3. **Testing** - Unit and integration tests
4. **Build Process** - Minification and optimization
5. **TypeScript** - Type safety

## Quick Start Guide

### For Repository Owner

1. **Initial Setup**:
   - Fork or use this repository
   - Enable GitHub Pages (Settings → Pages → Deploy from `main`)
   - Update `config.js` with your username

2. **Create Personal Access Token**:
   - GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token
   - Select `repo` scope
   - Copy token (you won't see it again!)

3. **First Login**:
   - Visit your GitHub Pages URL
   - Click "Sign In"
   - Paste your token
   - Start tracking!

4. **Cross-Device Usage**:
   - Sign in on any device with your token
   - Data syncs automatically
   - Changes propagate within minutes

### For Forking Users

See README.md for complete fork/clone instructions.

### For Public Viewers

- Visit the GitHub Pages URL
- Browse the read-only catalog
- Click into subjects/projects to view details
- Fork the repository to create your own tracker

## Contact & Support

This is a personal learning tracker project. For questions, issues, or contributions:
- GitHub Issues: https://github.com/JapanColorado/learning-tracker/issues
- Fork and modify for your own use
- Share improvements via pull requests

---

**Last Updated**: 2025-12-01
**Version**: 3.0 (Unified Data Architecture)
**Total Lines of Code**: ~2500 (HTML + JS + CSS)
