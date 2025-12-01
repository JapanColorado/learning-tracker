// ==========================================
// FILTER & SEARCH FUNCTIONS
// ==========================================
// Functions for filtering, searching, and autocomplete

/**
 * Apply search and filter criteria to subject cards
 * Filters based on search term, status, and category
 */
function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';

    document.querySelectorAll('.subject-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        const id = card.dataset.id;
        const progress = getSubjectProgress(id);

        // Status filter matching
        const statusMatch = statusFilter === 'all' ||
            (statusFilter === 'not-started' && progress === 'empty') ||
            (statusFilter === 'in-progress' && progress === 'partial') ||
            (statusFilter === 'completed' && progress === 'complete');

        // Category filter matching
        const subjectInfo = findSubjectAndTier(id);
        const category = subjectInfo ? subjectInfo.tierData.category : 'general';

        // Combine all filters
        const matchesSearch = !searchTerm || text.includes(searchTerm);
        const matchesCategory = categoryFilter === 'all' || category === categoryFilter;

        // Show/hide card based on filters
        if (matchesSearch && statusMatch && matchesCategory) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });

    // Hide empty tiers
    document.querySelectorAll('.tier').forEach(tier => {
        const visibleCards = tier.querySelectorAll('.subject-card:not(.hidden)');
        tier.classList.toggle('hidden', visibleCards.length === 0);
    });
}

/**
 * Setup autocomplete functionality for subject ID inputs
 * @param {string} inputId - ID of the input element
 * @param {string} suggestionsId - ID of the suggestions container
 */
function setupAutocomplete(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsId);
    let selectedIndex = -1;

    input.addEventListener('input', function() {
        const value = this.value;
        const lastComma = value.lastIndexOf(',');
        const currentTerm = lastComma >= 0 ? value.substring(lastComma + 1).trim() : value.trim();

        if (currentTerm.length < 1) {
            suggestionsContainer.classList.remove('active');
            return;
        }

        const allSubjects = getAllSubjectIds();
        const matches = allSubjects.filter(s =>
            s.id.toLowerCase().includes(currentTerm.toLowerCase()) ||
            s.name.toLowerCase().includes(currentTerm.toLowerCase())
        ).slice(0, 10);

        if (matches.length === 0) {
            suggestionsContainer.classList.remove('active');
            return;
        }

        suggestionsContainer.innerHTML = matches.map((subject, index) =>
            `<div class="autocomplete-suggestion" data-index="${index}" data-id="${subject.id}">
                <span class="suggestion-id">${subject.id}</span>
                <span class="suggestion-name">${subject.name}</span>
            </div>`
        ).join('');

        suggestionsContainer.classList.add('active');
        selectedIndex = -1;

        // Add click handlers
        suggestionsContainer.querySelectorAll('.autocomplete-suggestion').forEach(el => {
            el.addEventListener('click', function() {
                const selectedId = this.getAttribute('data-id');
                const lastComma = input.value.lastIndexOf(',');
                if (lastComma >= 0) {
                    input.value = input.value.substring(0, lastComma + 1) + ' ' + selectedId + ', ';
                } else {
                    input.value = selectedId + ', ';
                }
                suggestionsContainer.classList.remove('active');
                input.focus();
            });
        });
    });

    input.addEventListener('keydown', function(e) {
        const suggestions = suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
        if (!suggestionsContainer.classList.contains('active') || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
            updateSelected();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelected();
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            suggestions[selectedIndex].click();
        } else if (e.key === 'Escape') {
            suggestionsContainer.classList.remove('active');
        }

        function updateSelected() {
            suggestions.forEach((el, i) => {
                el.classList.toggle('selected', i === selectedIndex);
            });
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.classList.remove('active');
        }
    });
}
