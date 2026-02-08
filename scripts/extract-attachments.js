#!/usr/bin/env node

/**
 * Extract Attachments from SQLite BLOBs
 * 
 * This script extracts file_data BLOBs from the SQLite attachments table
 * and saves them to the filesystem for upload to R2/S3.
 * 
 * Prerequisites:
 * - Node.js 18+
 * - npm install better-sqlite3
 * 
 * Usage:
 *   node extract-attachments.js
 * 
 * Output:
 *   ./attachments-export/
 *     ├── ticket-abc123/
 *     │   ├── document.pdf
 *     │   └── image.png
 *     └── manifest.json (mapping of ticket_id → files)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Configuration
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || './server/db/liteboard.db';
const OUTPUT_DIR = './attachments-export';

if (!fs.existsSync(SQLITE_DB_PATH)) {
  console.error(`❌ ERROR: SQLite database not found at ${SQLITE_DB_PATH}`);
  process.exit(1);
}

// Initialize
const sqlite = new Database(SQLITE_DB_PATH, { readonly: true });
const manifest = {
  exportDate: new Date().toISOString(),
  totalFiles: 0,
  totalSize: 0,
  tickets: {}
};

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function extractAttachments() {
  console.log('\n📦 Extracting attachments from SQLite...\n');
  
  const rows = sqlite.prepare(`
    SELECT id, ticket_id, filename, file_type, file_size, file_data, uploaded_at
    FROM attachments
    WHERE file_data IS NOT NULL
  `).all();
  
  console.log(`Found ${rows.length} attachments with file data\n`);
  
  for (const row of rows) {
    try {
      // Create ticket directory
      const ticketDir = path.join(OUTPUT_DIR, `ticket-${row.ticket_id}`);
      if (!fs.existsSync(ticketDir)) {
        fs.mkdirSync(ticketDir, { recursive: true });
      }
      
      // Sanitize filename
      const safeFilename = row.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = path.join(ticketDir, safeFilename);
      
      // Write BLOB to file
      fs.writeFileSync(filePath, row.file_data);
      
      // Update manifest
      if (!manifest.tickets[row.ticket_id]) {
        manifest.tickets[row.ticket_id] = { files: [] };
      }
      
      manifest.tickets[row.ticket_id].files.push({
        id: row.id,
        filename: row.filename,
        safeFilename: safeFilename,
        fileType: row.file_type,
        fileSize: row.file_size,
        uploadedAt: row.uploaded_at,
        localPath: filePath,
        storageKey: `tickets/${row.ticket_id}/${safeFilename}`
      });
      
      manifest.totalFiles++;
      manifest.totalSize += row.file_size || 0;
      
      console.log(`✅ Exported: ${row.filename} (${formatBytes(row.file_size)})`);
      
    } catch (error) {
      console.error(`❌ Error extracting ${row.filename}:`, error.message);
    }
  }
  
  // Save manifest
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('EXTRACTION COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Total files:  ${manifest.totalFiles}`);
  console.log(`Total size:   ${formatBytes(manifest.totalSize)}`);
  console.log(`Output dir:   ${OUTPUT_DIR}`);
  console.log(`Manifest:     ${path.join(OUTPUT_DIR, 'manifest.json')}\n`);
  
  // Generate upload script
  generateUploadScript();
  
  sqlite.close();
}

function generateUploadScript() {
  const uploadScript = `#!/usr/bin/env node

/**
 * Upload Attachments to Cloudflare R2 / AWS S3
 * 
 * This script uploads extracted attachments to object storage
 * using the storage keys from manifest.json
 * 
 * Prerequisites:
 * - npm install @aws-sdk/client-s3
 * - Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 * 
 * Usage:
 *   export R2_ENDPOINT="https://xxx.r2.cloudflarestorage.com"
 *   export R2_ACCESS_KEY_ID="your_key"
 *   export R2_SECRET_ACCESS_KEY="your_secret"
 *   node upload-to-r2.js
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const manifest = require('./manifest.json');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const BUCKET = process.env.R2_BUCKET || 'liteboard-attachments';

async function uploadFile(filePath, storageKey, contentType) {
  const fileBuffer = fs.readFileSync(filePath);
  
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    Body: fileBuffer,
    ContentType: contentType
  }));
}

async function uploadAll() {
  console.log('\\n🚀 Starting upload to R2/S3...\\n');
  
  let uploaded = 0;
  let failed = 0;
  
  for (const [ticketId, ticketData] of Object.entries(manifest.tickets)) {
    console.log(\`Uploading files for ticket \${ticketId}...\`);
    
    for (const file of ticketData.files) {
      try {
        await uploadFile(file.localPath, file.storageKey, file.fileType);
        console.log(\`  ✅ \${file.filename}\`);
        uploaded++;
      } catch (error) {
        console.error(\`  ❌ \${file.filename}: \${error.message}\`);
        failed++;
      }
    }
  }
  
  console.log('\\n═══════════════════════════════════════════════════════');
  console.log('UPLOAD COMPLETE');
  console.log('═══════════════════════════════════════════════════════\\n');
  console.log(\`Uploaded:  \${uploaded} files\`);
  console.log(\`Failed:    \${failed} files\\n\`);
}

uploadAll().catch(console.error);
`;
  
  const scriptPath = path.join(OUTPUT_DIR, 'upload-to-r2.js');
  fs.writeFileSync(scriptPath, uploadScript);
  fs.chmodSync(scriptPath, '755');
  
  console.log('📝 Generated upload script:');
  console.log(`   ${scriptPath}\n`);
  console.log('To upload files to R2/S3, run:');
  console.log(`   cd ${OUTPUT_DIR}`);
  console.log('   npm install @aws-sdk/client-s3');
  console.log('   export R2_ENDPOINT="https://xxx.r2.cloudflarestorage.com"');
  console.log('   export R2_ACCESS_KEY_ID="your_key"');
  console.log('   export R2_SECRET_ACCESS_KEY="your_secret"');
  console.log('   node upload-to-r2.js\n');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run extraction
extractAttachments().catch(error => {
  console.error('❌ Extraction failed:', error.message);
  sqlite.close();
  process.exit(1);
});
