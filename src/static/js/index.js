document.addEventListener('click', function (event) {
    // If the clicked element doesn't have the right selector, bail
    if(event.target.className === "navigate"){
        document.getElementById("loader").style.display="block"
        document.location.href = event.target.dataset.url;
    }

}, false);

document.addEventListener('DOMContentLoaded', function() {
    // send an event to the backend, that the UI is still open. Keep alive ping.
    //
    let url = 'http://127.0.0.1:8081/GUI-is-still-open'
    fetch(url, { mode: 'no-cors'})
    setInterval(function(){ fetch(url, { mode: 'no-cors'});}, 5000)

    // Fetch all "pipeline" definitions from the backend and brings them into the UI list.
    //
    fetch('/pipelines')
        .then(response => response.json())
        .then(data => {
            let container = document.getElementById("pipeline-container")
            data.forEach( (pipeline, i ) => {
                if(i !== 0){
                    container.insertAdjacentHTML('beforeend', "<hr>");
                }
                let html = `<div class="pipeline">
                              <div class="name">${pipeline.name}</div>
                              <div class="description">${pipeline.description}</div>
                              <button class="navigate" data-url="/pipeline/${pipeline.basename}">&#9654;</button>
                           </div>`
                container.insertAdjacentHTML('beforeend', html);
            })

        })
})

