🔷 Number 1:
var scroll = setInterval(function(){ window.scrollBy(0, 1000)}, 1000);

🔷 Number 2:
window.clearInterval(scroll);
console.clear();

// Grab all 'a' elements and iterate through them
let urls = $$('a'); // Use 'let' to declare the variable
urls.forEach(function(v, i, a) {
    
    if (v.id === "thumbnail" && v.href) {
        let url = v.href;
        
        // Find the badge element within the thumbnail
        let badgeElement = v.querySelector('.badge-shape-wiz__text'); // Select the badge element
        
        // Grab the badge text
        let badgeText = badgeElement ? badgeElement.innerText : 'No badge found'; // Use innerText

        // Output the result
        console.log(
            '\t' + new Date().toLocaleDateString() + 
            '\t' + url + 
            '\t' + badgeText // Add the badge text to the output
        );
    }
});
