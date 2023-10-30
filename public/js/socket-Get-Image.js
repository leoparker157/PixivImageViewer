

async function  SocketGetImage(ImageType,ChangeTtitle) {
     socket.on(`${ImageType}-imagefulldata`, data => {
        if(infScroll && data.files <1)
        {
            return infScroll.loadNextPage();
            
        }
        const addedTags = [];
        const countTag = {};
        const shouldAddTitle = ChangeTtitle;
        if (shouldAddTitle=="ranking") {
            const queryValue = extractQueryParameterFromURL("mode").replace(/_/g, ' ');
            var title = document.querySelector('.title');
            title.textContent = "Ranking for " + queryValue;
        }
        else if (shouldAddTitle=="search") {
            const queryValue = extractQueryParameterFromURL("query");
            var title = document.querySelector('.title');
            title.textContent="Gallery of "+queryValue;
        }
        const fileslist = data.files;
        const downloadsPath = data.downloadsPath;
        const nav = document.querySelector('#filter-nav');
        fileslist.forEach(val => {
            var decodedSrc = `${downloadsPath}/${(val.filename)}`;
            var decodedFilename = val.title;
            var illustId = val.id;
            const imageUrls = val.image_urls;
            const caption = val.caption;
            const restrict = val.restrict;
            const user = val.user;
            const tags = val.tags;
            var imageElement = document.createElement('div');
    
            imageElement.className = 'card card-pin grid-item';
            // Create an array to keep track of added tags
            tags.forEach(tag => {
    
                var tagName = (tag.translated_name || tag.name).replace(/[\s:\/+(,)&\-]/g, '-');
                if (!isNaN(tagName.charAt(0))) {
                    ///checks if the first character of tagName is a number
                    tagName = 'class-' + tagName;
                }
                imageElement.classList.add(tagName);
                if (!addedTags.includes(tag.translated_name || tag.name)) {
                    addedTags.push(tag.translated_name || tag.name); // Add the tag to the array
                    //let tagLi = document.createElement('li'); // Create a <li> element
                    let tagButton = document.createElement('button'); // Create a <button> element
                    tagButton.className = 'button tagbutton btn btn-outline-primary'; // Remove 'nav-item' class
                    tagButton.setAttribute('data-filter', 'tags'); // Set data-filter-group attribute
                    tagButton.setAttribute('data-filter', '.' + (tagName));
                    tagButton.setAttribute('type', 'button');
                    tagButton.setAttribute('data-isPicked', 'no');
                    tagButton.textContent = (tag.translated_name || tag.name);
                    //tagLi.appendChild(tagButton); // Append the button to the <li>
                    nav.appendChild(tagButton); // Append the <li> to the <ul>
                    iso2.appended(tagButton);
                    imagesLoaded(tagButton).on('progress', function() {
                        iso2.layout();
    
                    });
                }
            });
    
            const tools = val.tools;
            const createDateFull = val.create_date;
            var createDate = (new Date(createDateFull)).toISOString().substring(0, 10);
            const pageCount = val.page_count;
            const width = val.width;
            const height = val.height;
            const sanityLevel = val.sanity_level;
            const xRestrict = val.x_restrict;
            const series = val.series;
            const metaSinglePage = val.meta_single_page;
            const metaPages = val.meta_pages;
            const totalView = val.total_view;
            const totalBookmarks = val.total_bookmarks;
            const isBookmarked = val.is_bookmarked;
            const visible = val.visible;
            const isMuted = val.is_muted;
            const illustAiType = val.illust_ai_type;
            const illustBookStyle = val.illust_book_style;
            var pixivLink = 'https://www.pixiv.net/en/artworks/' + illustId;
            var tagsString = tags.map(tag => tag.translated_name || tag.name).join(',');
            imageElement.innerHTML = 
              `<img class="card-img ${isBookmarked ? 'bookmarked' : ''}" src="${decodedSrc}" alt="${decodedFilename}" />
              <div class="overlay">
                  <h2 class=" card-title">name: ${decodedFilename}</h2>
                  <a href="/user/${user.id}">
                    <h2 class="card-title">User: ${user.name}</h2>
                  </a>
                  <h2 class=" card-title createdate">Create Date: ${createDate}</h2>
                  <h2 class=" card-title">tags: ${tagsString}</h2>
                  <h2 class=" card-title numberbookmarked">bookmarks: ${totalBookmarks}</h2>
                  <h2 class=" card-title totalview">total view: ${totalView}</h2>
                  <a href="/related?illustId=${illustId}">
                    <h2 class="card-title">Related Illusts</h2>
                  </a>
                  <div class="more">
                      <a href="#" class="heart">
                          ${
                          isBookmarked
                              ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="red" class="bi bi-heart-fill" viewBox="0 0 16 16">
                                  <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
                              </svg>`
                              : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-heart" viewBox="0 0 16 16">
                                  <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
                              </svg>`
                          }
                      </a>
                      <a href="${pixivLink}" target="_blank">
                          <i class="fa fa-arrow-circle-o-right" aria-hidden="true"></ i>
                          More
                      </a>
                  </div>
              </div>`;
            grid.appendChild(imageElement);
            imagesLoaded(imageElement).on('progress', function() {
                iso.appended(imageElement);
                iso.layout();
            });
        });
        
    });
    document.addEventListener('click', async function(e) {
    
        const heartElement = e.target.closest(".heart");
        if (heartElement) {
            e.preventDefault();
            const imgElement = heartElement.closest('.card').querySelector('img');
            const isBookmarked = imgElement.classList.contains('bookmarked');
            const moreLink = heartElement.nextElementSibling;
            const userIdMatch = moreLink.href.match(/\/(\d+)$/);
            if (userIdMatch) {
                const userId = userIdMatch[1];
                if (!isBookmarked) {
                  axios
                    .post("/addillustbookmark", {
                      illustId: userId,
                    })
                    .then((response) => {
                      imgElement.classList.add('bookmarked');
                      if (response.data.success) {
                        heartElement.innerHTML = `<svg id="heart" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="red" class="bi bi-heart-fill" viewBox="0 0 16 16">
                              <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
                          </svg>`;
                        
                      }
                    })
                    .catch((error) => {
                      console.error(error);
                    });
                } else {
                  axios
                    .post("/deleteillustbookmark", {
                      illustId: userId,
                    })
                    .then((response) => {
                      imgElement.classList.remove('bookmarked'); 
                      if (response.data.success) {
                        heartElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-heart" viewBox="0 0 16 16">
                                                      <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
                                                    </svg>`;
                      }
                    })
                    .catch((error) => {
                      console.error(error);
                    });
                }
            }
        }
    });
}
