/**
 * Checks if a file with the same ID and bookmark count exists in the downloads folder.
 * If a file with the same ID exists, checks if it has a different bookmark count.
 * If bookmark count doesn't match, renames the file.
 * If a file with the same ID and bookmark count exists, no downloading is needed.
 * If the file does not exist, logs a message.
 * @param {Object} fs - The Node.js file system module.
 * @param {Object} path - The Node.js path module.
 * @param {string} filePath - The path to the file to be downloaded.
 * @param {string} downloadsFolder - The path to the downloads folder.
 * @param {Object} illustrations - The illustrations object containing the ID and bookmark count.
 * @returns {void}
 */
async function checkAndRenamefile(fs, path, filePath, downloadsFolder, illustrations) {
  const bookmarkCount = illustrations.total_bookmarks  ; // Assuming the bookmark count is available in illustrations
  const existingFile = fs.readdirSync(downloadsFolder).find((file) => file.includes(`_id${illustrations.id}`));

  if (existingFile) {
      // If a file with the same id exists, check if it has a different bookmark count
      const existingBookmarkCountMatch = existingFile.match(/_bk(\d+)_id\d+/);
      if (existingBookmarkCountMatch) {
          const existingBookmarkCount = parseInt(existingBookmarkCountMatch[1], 10);

          if (existingBookmarkCount !== bookmarkCount) {
              // If bookmark count doesn't match, rename the file
              //console.log('existingBookmarkCount '+existingBookmarkCount+'/bookmarkCount '+bookmarkCount)
              fs.renameSync(path.join(downloadsFolder, existingFile), filePath);
              console.log(`Renamed to ${filePath}`);
          } else {
              console.log("File with the same ID and bookmark count exists, no downloading needed.");
          }
      }
  } else if (!fs.existsSync(filePath)) {
      console.log("File does not exist.");
  }
}

module.exports = checkAndRenamefile;