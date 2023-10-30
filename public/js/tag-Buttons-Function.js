// Define an array to store filters
var filters = [];
// Add a click event listener to the '.filters' element
document.querySelector('.filters').addEventListener('click', function(event) {
    // Get the element that triggered the click event
    var target = event.target;
    // Find the "ALL" and "Safe" buttons
    var allButton = document.querySelector('[data-filter="none"]');
    var safeButton = document.querySelector('[data-filter=":not(.R-18)"]');

    // Check if the clicked element is a button
    if (target.tagName === 'BUTTON') {
        if (target.getAttribute('data-filter') === 'none') {
            // Clicked the "ALL" button, so clear all filters
            // Clear the filters array
            filters = [];
            // Re-enable infinite scrolling if no filters are applied
            infScroll.option({
                loadOnScroll: true
            });
            // Reset button styles and data attributes for all buttons
            document.querySelectorAll('.button').forEach(function(btn) {
                allButton.classList.remove('is-checked', 'btn-outline-primary');
                allButton.classList.add('btn-primary');
                btn.classList.remove('is-checked', 'btn-primary');
                btn.classList.add('btn-outline-primary');
                btn.setAttribute('data-isPicked', 'no');
                safeButton.setAttribute('data-isPicked', 'default');
                allButton.setAttribute('data-isPicked', 'default');
            });
        } else {
            // Toggle the 'is-checked' class for the clicked button

            target.classList.toggle('is-checked');
            var isChecked = target.classList.contains('is-checked');
            var filter = target.getAttribute('data-filter');

            if (isChecked) {
                // Add filter to the list
                addFilter(filter);
                // Adjust button styles and data attributes for the selected button
                target.classList.remove('btn-outline-primary');
                target.classList.add('btn-primary');
                allButton.classList.remove('is-checked', 'btn-primary');
                allButton.classList.add('btn-outline-primary');
                target.setAttribute('data-isPicked', 'yes');
            } else {
                // Remove filter from the list
                removeFilter(filter);

                if (target.getAttribute('data-filter') === ':not(.R-18)') {
                    // Adjust styles for the "Safe" button
                    target.classList.remove('btn-primary');
                    target.classList.add('btn-outline-primary');
                } else {
                    // Adjust styles and data attribute for other buttons
                    target.classList.remove('btn-primary');
                    target.classList.add('btn-outline-primary');
                    target.setAttribute('data-isPicked', 'no');
                }
            }
        }

        // Reload items and arrange them
        iso2.reloadItems();
        iso2.arrange({
            sortBy: 'isPicked',
            sortAscending: true
        });
        iso.arrange({
            filter: filters.join(',')
        });
    }
});

////////Sorting///////////////////////////////////


document.querySelector('.sort-by-button-group').addEventListener('click', function(event) {
    if (!event.target.matches('.sorting')) {
        return;
    }

    const sortValue = event.target.getAttribute('data-sort-value');
    const sortingButtons = document.querySelectorAll('.sorting');
    if (!event.target.classList.contains('default')) {
        sortingButtons.forEach(btn => {
            if (btn !== event.target) {
                btn.textContent = btn.textContent.replace('▲', '').replace('▼', '');
            }
        });
    }
    if (event.target.classList.contains('default')) {
        sortingButtons.forEach(btn => {
            btn.textContent = btn.textContent.replace('▲', '').replace('▼', '');
        });
        sortUp(sortValue);
    } else {
        if (!event.target.textContent.includes('▲') && !event.target.textContent.includes('▼')) {
            event.target.textContent += ' ▲';
            sortUp(sortValue);
        } else if (event.target.textContent.includes('▲')) {
            event.target.textContent = event.target.textContent.replace('▲', '▼');
            sortDown(sortValue);
        } else {
            event.target.textContent = event.target.textContent.replace('▼', '▲');
            sortUp(sortValue);
        }
    }
    // Change is-checked class on buttons
    const buttonGroup = event.target.parentNode;
    buttonGroup.querySelectorAll('.is-checked').forEach(button => {
        button.classList.remove('is-checked');
    });
    event.target.classList.add('is-checked');
});

// Function to add a filter to the list
function addFilter(filter) {
    if (filters.indexOf(filter) === -1) {
        // Add the filter to the filters array
        filters.push(filter);
        // Disable infinite scrolling temporarily
        infScroll.option({
            loadOnScroll: false
        });

    }

}

function removeFilter(filter) {
    // Function to remove a filter from the list
    var index = filters.indexOf(filter);
    if (index !== -1) {
        // Remove the filter from the filters array
        filters.splice(index, 1);
        // trigger re-sorting
        if (filters.length == 0) {
            // Re-enable infinite scrolling if no filters are applied
            infScroll.option({
                loadOnScroll: true
            });
        }
    }
}
function sortUp(sortValue) {
    // Add your sorting logic here for when the arrow is up
    console.log(`Sorting by ${sortValue} in ascending order`);
    iso.arrange({
        sortBy: sortValue,
        sortAscending: true
    });
}

function sortDown(sortValue) {
    // Add your sorting logic here for when the arrow is down
    console.log(`Sorting by ${sortValue} in descending order`);
    iso.arrange({
        sortBy: sortValue,
        sortAscending: false
    });
}
////////Sorting///////////////////////////////////