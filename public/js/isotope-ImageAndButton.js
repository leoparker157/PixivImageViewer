const grid = document.querySelector('.grid');
let iso = new Isotope(grid, {
    itemSelector: '.grid-item',
    percentPosition: true,
    masonry: {
        columnWidth: 100,
        horizontalOrder: true
    },
    getSortData: {
        numberbookmarked: function(element) {
            // Extract the numeric part from the "bookmarks:X" string and parse it as an integer
            const text = element.querySelector('.numberbookmarked').textContent;
            const numericPart = text.replace('bookmarks:', '');
            return parseInt(numericPart, 10);
        },
        totalview: function(element) {
            // Extract the numeric part from the "bookmarks:X" string and parse it as an integer
            const text = element.querySelector('.totalview').textContent;
            const numericPart = text.replace('total view:', '');
            return parseInt(numericPart, 10);
        },
        createdate: function(element) {
            // Extract the date from the "Create Date: YYYY-MM-DD" string
            const text = element.querySelector('.createdate').textContent;
            const datePart = text.replace('Create Date:', '');
            const [year, month, day] = datePart.split('-');
            return Date.parse(`${month}/${day}/${year}`)
        }
    }
});
const tagbutton = document.querySelector('#filter-nav');
let iso2 = new Isotope(tagbutton, {
    itemSelector: '.tagbutton',
    percentPosition: true,
    masonry: {
        columnWidth: 10,
        horizontalOrder: true
    },
    getSortData: {
        isPicked: function(itemElem) { // use a function for 'isPicked'
            var sortValue = itemElem.getAttribute('data-isPicked');
            switch (sortValue) {
                case 'default':
                    return 1;
                case 'yes':
                    return 2;
                case 'no':
                    return 3;
                default:
                    return 4;
            }
        }
    }
});
