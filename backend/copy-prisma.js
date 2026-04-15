const fs = require('fs');
const path = require('path');

const srcFolder = path.join(__dirname, 'src', 'generated', 'prisma');
const destFolder = path.join(__dirname, 'dist', 'src', 'generated', 'prisma');

if (!fs.existsSync(destFolder)) {
  fs.mkdirSync(destFolder, { recursive: true });
}

if (fs.existsSync(srcFolder)) {
  const items = fs.readdirSync(srcFolder);
  for (const item of items) {
    const srcPath = path.join(srcFolder, item);
    const destPath = path.join(destFolder, item);

    // Skip tmp files
    if (item.includes('.tmp')) {
      continue;
    }

    try {
      if (fs.statSync(srcPath).isDirectory()) {
         try { fs.cpSync(srcPath, destPath, { recursive: true }); } catch (e) {
             // cpSync requires node 16.7.0+
             fs.mkdirSync(destPath, { recursive: true });
             const subItems = fs.readdirSync(srcPath);
             for(let sub of subItems) {
                 fs.copyFileSync(path.join(srcPath, sub), path.join(destPath, sub));
             }
         }
      } else {
         // for query_engine-windows.dll.node, only copy if it doesn't exist to avoid lock issues on windows
         if (item === 'query_engine-windows.dll.node') {
            if (!fs.existsSync(destPath)) {
               try { fs.copyFileSync(srcPath, destPath); } catch (e) { console.warn(`Could not copy ${item}`); }
            }
         } else {
            try { fs.copyFileSync(srcPath, destPath); } catch (e) { console.warn(`Could not copy ${item}`); }
         }
      }
    } catch (e) {
      console.warn(`Error processing ${item}: ${e.message}`);
    }
  }
} else {
  console.log(`Source folder ${srcFolder} does not exist.`);
}
