const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('from "date-fns"') && content.includes('format(')) {
    // We only want to replace if it's actually using format.
    // It's a bit tricky because format from date-fns might be destructured.
    // Let's check manually later if the script breaks anything.
    console.log(`Matching file: ${file}`);
  }
});
