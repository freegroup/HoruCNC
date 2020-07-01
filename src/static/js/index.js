document.addEventListener('click', function (event) {


    // If the clicked element doesn't have the right selector, bail
    if(event.target.className === "navigate"){
        document.getElementById("loader").style.display="block"
        document.location.href = event.target.dataset.url;
    }

}, false);

