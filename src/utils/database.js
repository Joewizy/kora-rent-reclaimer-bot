const fs = require('fs');
const path = require('path');
const logger = require('./logger').default || require('./logger');

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    logger.error(`Failed to read JSON file ${filePath}:`, err);
    throw err;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    logger.error(`Failed to write JSON file ${filePath}:`, err);
    throw err;
  }
}

module.exports = { readJSON, writeJSON };