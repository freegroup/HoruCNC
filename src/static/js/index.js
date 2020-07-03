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


    fetch('/pipelines')
        .then(response => response.json())
        .then(data => {
            let container = document.getElementById("pipeline-container")
            data.forEach( (pipeline, i ) => {
                if(i !== 0){
                    container.insertAdjacentHTML('beforeend', "<hr>");
                }
                let html = `<div class="pipeline">
                           <span>${pipeline.name}</span>
                           <button class="navigate" data-url="/pipeline/${pipeline.basename}">&#9654;</button>
                           </div>`
                container.insertAdjacentHTML('beforeend', html);
            })

        })
})

