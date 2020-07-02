document.addEventListener('click', function (event) {


    // If the clicked element doesn't have the right selector, bail
    if(event.target.className === "navigate"){
        document.getElementById("loader").style.display="block"
        document.location.href = event.target.dataset.url;
    }

}, false);

document.addEventListener('DOMContentLoaded', function() {
    let url = 'http://127.0.0.1:8081/GUI-is-still-open'
    fetch(url, { mode: 'no-cors'})
    setInterval(function(){ fetch(url, { mode: 'no-cors'});}, 5000)
})
