/**
 * Standalone Node.js script to update the 'changed_by' field in the
 * status_history table with random employee IDs from the employees table.
 *
 * It ONLY targets history records where 'changed_by' is set to 'Current User'
 * or is NULL, ensuring existing valid IDs are not overwritten.
 *
 * Requirements:
 * 1. Node.js installed.
 * 2. 'better-sqlite3' package installed (npm install better-sqlite3).
 * 3. Assumes the SQLite database file is located at '../db/liteboard.db'.
 */
const Database = require('better-sqlite3');
const path = require('path');

// --- Configuration ---
// Adjust the path below if your database file is located elsewhere.
const DB_PATH = path.resolve(__dirname, '/liteboard.db');
// ---------------------

console.log(`Attempting to connect to database at: ${DB_PATH}`);

let db;

try {
    // 1. Establish database connection
    db = new Database(DB_PATH, { verbose: console.log });
    db.pragma('journal_mode = WAL');
    console.log('Database connection established.');

    // 2. Fetch all Employee IDs to use for randomization
    // We only select the 'id' (e.g., EMP-001) which is the employee code.
    const employeeIds = db.prepare("SELECT id FROM employees WHERE active = 1").all().map(row => row.id);

    if (employeeIds.length === 0) {
        throw new Error("No active employee IDs found in the database. Aborting update.");
    }
    console.log(`Found ${employeeIds.length} active employee IDs for randomization.`);

    // 3. Fetch IDs of Status History records that need randomization (i.e., contain placeholders)
    // We specifically target 'Current User' or NULL/empty values.
    const historyIdsToUpdate = db.prepare(
        `SELECT id FROM status_history 
         WHERE changed_by IN ('Current User', 'NULL', '') OR changed_by IS NULL`
    ).all().map(row => row.id);

    if (historyIdsToUpdate.length === 0) {
        console.log("No placeholder records found in status_history. Nothing to update.");
        db.close();
        return;
    }
    console.log(`Found ${historyIdsToUpdate.length} history records containing placeholders to update.`);


    // Helper function to pick a random employee ID
    const getRandomEmployeeId = () => {
        const randomIndex = Math.floor(Math.random() * employeeIds.length);
        // The script returns the actual employee ID string (e.g., 'EMP-005')
        return employeeIds[randomIndex]; 
    };

    // Prepared statement for updating a single history record
    const updateStmt = db.prepare("UPDATE status_history SET changed_by = ? WHERE id = ?");

    // 4. Execute the update within a safe transaction
    const updateAllHistory = db.transaction(() => {
        let updateCount = 0;
        for (const historyId of historyIdsToUpdate) {
            const randomEmployeeId = getRandomEmployeeId();
            // Run the update: set changed_by to a random, *real* employee ID where id matches the history record ID
            updateStmt.run(randomEmployeeId, historyId);
            updateCount++;
        }
        return updateCount;
    });

    const recordsUpdated = updateAllHistory();
    console.log('---');
    console.log(`✅ Success! Updated ${recordsUpdated} placeholder records in status_history.`);
    console.log('---');

} catch (error) {
    console.error('\n❌ CRITICAL ERROR during update script:', error.message);
} finally {
    if (db) {
        db.close();
        console.log('Database connection closed.');
    }
}