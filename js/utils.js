// ==========================================
// UTILITY FUNCTIONS
// ==========================================
// Helper functions for subject lookups and data access

/**
 * Find a subject by ID across all tiers
 * @param {string} subjectId - The subject ID to find
 * @returns {Object|null} The subject object or null if not found
 */
function findSubject(subjectId) {
    for (const tierData of Object.values(subjects)) {
        const subject = tierData.subjects.find(s => s.id === subjectId);
        if (subject) return subject;
    }
    return null;
}

/**
 * Find a subject and its tier context
 * @param {string} subjectId - The subject ID to find
 * @returns {Object|null} Object with {tierName, tierData, subject, index} or null
 */
function findSubjectAndTier(subjectId) {
    for (const [tierName, tierData] of Object.entries(subjects)) {
        const index = tierData.subjects.findIndex(s => s.id === subjectId);
        if (index !== -1) {
            return { tierName, tierData, subject: tierData.subjects[index], index };
        }
    }
    return null;
}

/**
 * Find a subject by ID in a given subjects object (used during merging)
 * @param {Object} subjects - The subjects object to search
 * @param {string} id - The subject ID to find
 * @returns {Object|null} The subject object or null if not found
 */
function findSubjectById(subjects, id) {
    for (const tierData of Object.values(subjects)) {
        const subject = tierData.subjects.find(s => s.id === id);
        if (subject) return subject;
    }
    return null;
}

/**
 * Find all subjects that depend on a given subject
 * @param {string} subjectId - The subject ID to find dependents for
 * @returns {Array} Array of subjects that depend on this subject
 */
function findDependentSubjects(subjectId) {
    const dependents = [];

    for (const tierData of Object.values(subjects)) {
        for (const subject of tierData.subjects) {
            if (subject.prereq && subject.prereq.includes(subjectId)) {
                dependents.push(subject);
            } else if (subject.coreq && subject.coreq.includes(subjectId)) {
                dependents.push(subject);
            } else if (subject.soft && subject.soft.includes(subjectId)) {
                dependents.push(subject);
            }
        }
    }

    return dependents;
}

/**
 * Get all subject IDs and names across all tiers
 * @returns {Array} Array of {id, name} objects
 */
function getAllSubjectIds() {
    const subjectIds = [];
    for (const tierData of Object.values(subjects)) {
        if (tierData.subjects) {
            for (const subject of tierData.subjects) {
                subjectIds.push({
                    id: subject.id,
                    name: subject.name
                });
            }
        }
    }
    return subjectIds;
}
