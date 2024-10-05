const fs = require('fs');
const path = require('path');

const outputFile = 'all-code.txt';
const extensions = ['.js', '.ts', '.tsx', '.css', '.env'];   // file extensions to include
const excludedDirs = ['node_modules', '.next'];              // Directories to exclude

function combineFiles(dir) {
  // Skip the directory if it's in the excluded list
  if (excludedDirs.includes(path.basename(dir))) {
    return;
  }

  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      combineFiles(fullPath);
    } else if (extensions.includes(path.extname(fullPath))) {
      // Get the relative path of the file
      const relativePath = path.relative(__dirname, fullPath);

      // Read the file content
      let data = fs.readFileSync(fullPath, 'utf8');

      // Add the path and filename as a comment in the first line
      data = `// Filename: ${relativePath}\n${data}`;

      // Add an empty line at the end of the file content
      data = `${data}\n`;

      // Append the modified data to the output file
      fs.appendFileSync(outputFile, `\n${data}`);
    }
  });
}

// Clear the output file if it exists
fs.writeFileSync(outputFile, '', 'utf8');

// Start combining from the current directory
combineFiles(__dirname);
