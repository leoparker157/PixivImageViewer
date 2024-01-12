

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
            var sanitizeddecodedFilename=decodedFilename.replace(/[\s:\/+(,)&●!！\-]/g, '-');
            var pixivLink = 'https://www.pixiv.net/en/artworks/' + illustId;
            var tagsString = tags.map(tag => tag.translated_name || tag.name).join(',');
            
            imageElement.innerHTML = 
            `<div class="image-container data-imageId="${illustId}""> 
                <div id="carousel-${sanitizeddecodedFilename}" class="carousel slide">
                  <div class="carousel-inner">
                    ${val.filename.map((page, index) => `
                      <div class="carousel-item ${index === 0 ? 'active' : ''}" >
                        <img class="d-block w-100 card-img ${isBookmarked ? 'bookmarked' : ''}" src="${downloadsPath}/${page}"alt="${page}">
                      </div>`).join('')}
                  </div>
                  <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${sanitizeddecodedFilename}" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Previous</span>
                  </button>
                  <button class="carousel-control-next" type="button" data-bs-target="#carousel-${sanitizeddecodedFilename}" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Next</span>
                  </button>
                </div>
              <div class="overlay">
                <h2 class=" card-title">name: ${decodedFilename}</h2>
                <a href="/user/${user.id}">
                  <h2 class="card-title">User: ${user.name}</h2>
                </a>
                <h2 class=" card-title createdate">Create Date: ${createDate}</h2>
                <h2 class=" card-title">tags: ${tagsString}</h2>
                <h2 class=" card-title numberbookmarked">bookmarks: ${totalBookmarks}</h2>
                <h2 class=" card-title totalview">total view: ${totalView}</h2>
                <h2 class=" card-title totalpage">total pages: ${pageCount}</h2>
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
                    <i class="fa fa-arrow-circle-o-right" aria-hidden="true"></i>
                    More
                  </a>
                </div>
              </div>
            </div>
            <div class="navigation">
              <svg type="button" xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-chevron-compact-left" viewBox="0 0 16 16" data-bs-target="#carousel-${sanitizeddecodedFilename}" data-page-count="${pageCount}" data-bs-slide="prev">
                <path fill-rule="evenodd" d="M9.224 1.553a.5.5 0 0 1 .223.67L6.56 8l2.888 5.776a.5.5 0 1 1-.894.448l-3-6a.5.5 0 0 1 0-.448l3-6a.5.5 0 0 1 .67-.223z"/>
              </svg>
              <span class="pagination h4 fw-bold">1/${pageCount}</span>
              <svg type="button" xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-chevron-compact-right" viewBox="0 0 16 16" data-bs-target="#carousel-${sanitizeddecodedFilename}" data-page-count="${pageCount}" data-bs-slide="next">
                <path fill-rule="evenodd" d="M6.776 1.553a.5.5 0 0 1 .671.223l3 6a.5.5 0 0 1 0 .448l-3 6a.5.5 0 1 1-.894-.448L9.44 8 6.553 2.224a.5.5 0 0 1 .223-.671z"/>
              </svg>
            </div>`;
            grid.appendChild(imageElement);
            imagesLoaded(imageElement).on('always', function() {
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
    // Keep counter per carousel
const carouselPages = {};

document.addEventListener('click', e => {

  const navigation = e.target.closest('.navigation');

  if(navigation) {

    // Get carousel identifier
    const carouselId = navigation.querySelector('[data-bs-target]').getAttribute('data-bs-target');

    let currentPage = 1;

    if(carouselPages[carouselId]) {
      currentPage = carouselPages[carouselId];
    }

    const pageCountElem = navigation.querySelector('[data-page-count]');
    const pageCount = parseInt(pageCountElem.getAttribute('data-page-count'));

    if(e.target.matches('.bi-chevron-compact-left')) {

      if(currentPage > 1) {
        currentPage--;
      } else {
        currentPage = pageCount;
      }

    } else if(e.target.matches('.bi-chevron-compact-right')) {

      if(currentPage < pageCount) {
        currentPage++;
      } else {
        currentPage = 1;
      }

    }

    const pageCounterElem = navigation.querySelector('.pagination');
    pageCounterElem.textContent = `${currentPage}/${pageCount}`;

    // Save for next click
    carouselPages[carouselId] = currentPage;

  }

});

    
    
    
    
}
