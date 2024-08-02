const fs = require('fs');
const path = require('path');

const languagesDir = path.resolve(__dirname, '../src/languages');
const outputFilePath = path.resolve(__dirname, '../src/utils/languageImports.ts');
const languageListPath = path.resolve(__dirname, 'languageList.json');

const currentFiles = fs.readdirSync(languagesDir).filter((file) => file.endsWith('.json'));
let previousFiles = [];

if (fs.existsSync(languageListPath)) {
  previousFiles = JSON.parse(fs.readFileSync(languageListPath, 'utf8'));
}

const filesToRemove = previousFiles.filter((file) => !currentFiles.includes(file));
const filesToAdd = currentFiles.filter((file) => !previousFiles.includes(file));

// Update the languageList.json with the current list of files
fs.writeFileSync(languageListPath, JSON.stringify(currentFiles, null, 2));

// Generate imports for the current files
const imports = currentFiles
  .map((file) => {
    const key = path.basename(file, path.extname(file));
    return `import * as ${key} from '../languages/${file}';`;
  })
  .join('\n');

const languageObjectEntries = currentFiles
  .map((file) => {
    const key = path.basename(file, path.extname(file));
    return `  ${key}: ${key},`;
  })
  .join('\n');

const languageOptions = currentFiles
  .map((file) => {
    const key = path.basename(file, path.extname(file));
    return `  { key: '${key}', name: ${key}.name },`;
  })
  .join('\n');

const content = `${imports}

const languages: any = {
${languageObjectEntries}
};

export const languageOptions = [
${languageOptions}
];

export { languages };
`;

fs.writeFileSync(outputFilePath, content);

console.log('Language imports generated successfully.');

// Log files that were removed
if (filesToRemove.length > 0) {
  console.log('Removed files:', filesToRemove);
}
