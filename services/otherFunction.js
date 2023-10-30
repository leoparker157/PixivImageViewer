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
      //console.log("File does not exist.");
  }
}

module.exports = checkAndRenamefile;