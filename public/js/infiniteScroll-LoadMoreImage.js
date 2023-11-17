let infScroll;
let nextUrl = "";
const loaderEllips = document.querySelector('div.loader-ellips');
function initInfScroll() {
    if (infScroll) {
        infScroll.destroy();
    }
    if (loaderEllips.classList.contains('hide')) {
      loaderEllips.classList.remove('hide');
    }
    infScroll = new InfiniteScroll(grid, {
        path: function() {
            return nextUrl; // Captures current value of nextUrl
        },
        append: '.grid-item',
        //outlayer: iso,
        status: '.page-load-status',
        prefill: true,
        scrollThreshold: 400,
        
    });
}

function initSocketForInfiniteScroll(ImageType) {
    socket.on(`${ImageType}-nextUrl`, url => {
      if (url.includes('offset=null')) {
        loaderEllips.classList.add('hide');
        return;
      } else {
        nextUrl = url;
      }
      initInfScroll();
    });
}
