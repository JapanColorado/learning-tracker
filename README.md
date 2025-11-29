# Polymathica

Polymathica is a lightweight, purely client-side learning tracker for organizing and tracking progress across multiple subjects, fields, and learning projects. No build tools, no dependencies, no server required—just open `index.html` in your browser.

## Features

### Core Functionality

- **Dashboard View**: Automatically shows subjects currently in progress and completed subjects
- **Catalog View**: Browse all subjects organized by tier (Mathematics, Physics, Chemistry, etc.)
  - Search by name
  - Filter by status and category
  - Collapsible tier sections
- **Subject Management**:
  - Optional learning goals
  - Resources with clickable links
  - Nested projects with independent tracking
  - Markdown notepad with live preview
- **Project Management**:
  - Each subject can have multiple projects
  - Required goal for each project
  - Independent resource lists
  - Markdown notepad with preview
- **Dependency System**:
  - Prerequisites (must complete first)
  - Corequisites (study together)
  - Soft dependencies (helpful background)
  - Visual locked state for unavailable subjects
- **Theme Support**: Light and dark mode with persistent preference
- **Local Storage**: All data saved automatically in browser

### What's Not Included

- Cloud sync or external storage
- Adding/removing subjects from catalog (catalog is predefined)
- User accounts or sharing
- Mobile app (browser-based only)

## Getting Started

### Quick Start

Simply open the file in your browser:

```bash
# Linux
xdg-open index.html

# macOS
open index.html

# Windows
start index.html
```

### First Use

1. Browse the **Catalog** to see all available subjects
2. Click on a subject card to open its detail modal
3. Add a learning goal, resources, or projects
4. Click the checkbox (☐) to mark progress
5. Switch to **Dashboard** to see your active learning

## Project Structure

```
learning-tracker/
├── index.html          # Main application (modals, structure)
├── app.js              # Core logic (~750 lines)
├── styles.css          # Complete styling (light/dark themes)
├── data/
│   ├── subjects.js     # Default subject catalog
│   └── summaries.js    # Subject summaries (for future use)
├── CLAUDE.md          # Detailed technical documentation
└── README.md          # This file
```

## Usage Guide

### Adding Resources

1. Click on a subject to open its detail modal
2. Click **"+ Add Resource"**
3. Enter:
   - **Title/Description** (required) - e.g., "Introduction to Linear Algebra"
   - **Link** (optional) - e.g., "https://..."
4. Click **"Add Resource"**
5. Resources with links become clickable

### Adding Projects

1. Open a subject's detail modal
2. Click **"+ Add Project"**
3. Fill in:
   - **Name** (required)
   - **Goal** (required) - what you want to accomplish
   - **Resources** (optional)
   - **Notepad** (optional) - supports Markdown
4. Click **"Save"**
5. Projects appear in the subject card and can be edited independently

### Tracking Progress

Click the checkbox in the top-right corner of any subject card:
- First click: ☐ → ☑ (empty to partial)
- Second click: ☑ → ☒ (partial to complete)
- Third click: ☒ → ☐ (complete to empty)

Progress automatically syncs to Dashboard view.

### Using Markdown

Subject and project notepads support Markdown:
- **Bold**: `**text**`
- *Italic*: `*text*`
- Lists: `- item` or `1. item`
- Links: `[text](url)`
- Code: `` `code` `` or ` ```language `
- Headers: `# H1`, `## H2`, etc.

Use the **Preview** tab to see rendered output.

## Data Management

### Storage Location

All data is stored in your browser's `localStorage`:
- `subjects` - Subject data including goals, resources, projects
- `subjectProgress` - Progress state for each subject
- `theme` - "light" or "dark"
- `currentView` - "dashboard" or "catalog"

### Resetting Data

To reset everything to defaults, open browser DevTools Console and run:

```javascript
localStorage.removeItem('subjects');
localStorage.removeItem('subjectProgress');
localStorage.removeItem('theme');
localStorage.removeItem('currentView');
location.reload();
```

Or simply clear all site data in your browser settings.

### Backing Up Data

To backup your data:

1. Open DevTools Console (F12)
2. Run: `console.log(JSON.stringify(localStorage))`
3. Copy the output and save to a file

To restore:

1. Parse the JSON and set each key back to localStorage
2. Reload the page

## Development

### Technical Details

- **Pure Vanilla JavaScript** - No frameworks or build tools
- **Single Page Application** - All rendering client-side
- **Marked.js** - Loaded via CDN for Markdown rendering
- **CSS Custom Properties** - For theme support

### Documentation

See **[CLAUDE.md](CLAUDE.md)** for comprehensive technical documentation:
- Complete architecture overview
- Data model specifications
- Function reference
- Development guidelines
- Migration history
- Future improvement ideas

### Contributing

This is a personal project, but contributions are welcome! Please:
1. Read CLAUDE.md first to understand the architecture
2. Test thoroughly with existing data
3. Update documentation for significant changes

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires:
- LocalStorage support
- ES6+ JavaScript support
- CSS Custom Properties support

## Troubleshooting

**Nothing loads / blank screen:**
- Check browser console for errors
- Try resetting data (see above)
- Ensure JavaScript is enabled

**Progress not saving:**
- Check that localStorage is enabled
- Verify site data isn't being cleared automatically
- Check browser storage quota

**Modal won't open:**
- Check console for JavaScript errors
- Try hard refresh (Ctrl+Shift+R)

**Theme not switching:**
- Clear site data and try again
- Check if browser blocks localStorage

## License

Personal use intended. Feel free to adapt and modify as needed.
