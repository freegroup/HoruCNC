fetch('/meta')
    .then(response => response.json())
    .then(data => {
        let step =1
        let element = document.querySelector("#filters")
        data.filters.forEach( (filter, index) => {
            if(filter.menu) {
                let html = `<section id="section${index}">
                            <input type="radio" name="sections" id="option${index}">
                            <label for="option${index}">${icon(filter)}</label>
                            <article>
                            ${filterScreen(filter, index)}
                            </article>
                        </section>`
                element.insertAdjacentHTML('beforeend', html);
                step++;
            }
        })
        eval(data.output+"()")

        let nodes = document.querySelectorAll("input[type=range].parameter")
        nodes.forEach( (node)=>{
            node.addEventListener("input", (event)=>{
                let element = event.target
                fetch("/parameter/"+element.dataset.index, {
                    method: "POST",
                    body: element.value
                })
            })
        })
    })


function updateImage() {
    setTimeout(() => {
        let preview = document.querySelector('.tabordion input[name="sections"]:checked ~ article .update')
        if (preview) {
            let image = new Image()
            image.onload = () => {
                preview.style["background-image"] = "url("+image.src+")"
                updateImage()
            }
            image.onerror = ()=> {
                updateImage()
            }
            image.src = preview.dataset.image + "?time=" + new Date().getTime()
        }
        else{
            updateImage()
        }
    }, 300)
}
updateImage()


function icon(filter){
    if(filter.icon){
        return `<img class="with-shadow" src="${filter.icon}"/>`
    }
    return filter.name
}


function inputParameter(filter, index){
    if(filter.parameter==="slider"){
        return `<input 
                     class="parameter" 
                     id="param_${index}"  
                     data-index="${index}" 
                     type="range"
                     min="0" 
                     max="255" 
                     value="${filter.value}" 
                     step="1">`
    }
    else if(filter.parameter === "filepicker" ){
        return  `<input 
                   class="parameter" 
                   onchange="console.log(event);uploadFile(event)"
                   data-index="${index}" 
                   type="file"
                   id="param_${index}"  
                   accept="image/png">`
    }
    return ""
}


function filterScreen(filter, index){
    return `<div
           data-image="/image/${index}"  
           class="preview update"
           style="background-image:url(/image/${index})" 
           id="preview${index}" 
           ></div>
        <h4 class="description">${filter.description}</h4>
        ${inputParameter(filter, index)}`
}


function carveScreen(){
    let element = document.querySelector("#filters")
    let html=  `<section id="sectionCarve">
                <input type="radio" name="sections" id="optionCarve">
                <label for="optionCarve"><img class="with-shadow" src="/static/images/engrave.svg"/></label>
                <article id="millingWizard">
                </article>
             </section>`
    element.insertAdjacentHTML('beforeend', html)
    previewStep()
}


function downloadScreen(){
    let element = document.querySelector("#filters")
    let html=  `<section id="sectionDownload">
                <input type="radio" name="sections" id="optionDownload">
                <label id="optionDownloadButton" for="optionDownload"><img class="with-shadow" src="/static/images/download.svg"/></label>
                <article id="millingWizard">
                </article>
             </section>`
    element.insertAdjacentHTML('beforeend', html)
    downloadStep()
}


function previewStep(){
    let container = document.getElementById("millingWizard")
    let template = document.getElementById("previewScreenTemplate").innerHTML
    container.innerHTML = template

    let gcview = document.getElementById('gcview')

    let width = container.clientWidth;
    let height = container.clientHeight;
    gcview.style.width = width+"px"
    gcview.style.height = height+"px"
    // setup GCView with the div element to display the gcode in

    fetch('/gcode')
        .then(response => response.text())
        .then(data => {
            var renderer = new GCView(gcview)
            renderer.loadGC(data)
    })
}

function downloadStep(){
    let container = document.getElementById("millingWizard")
    let template = document.getElementById("downloadScreenTemplate").innerHTML
    container.innerHTML = template

    let gcview = document.getElementById('gcview')

    let width = container.clientWidth;
    let height = container.clientHeight;
    gcview.style.width = width+"px"
    gcview.style.height = height+"px"
    // setup GCView with the div element to display the gcode in

    fetch('/gcode')
        .then(response => response.text())
        .then(data => {
            var renderer = new GCView(gcview)
            renderer.loadGC(data)
        })
}

function uploadFile(event){
    let element = event.target
    let file = element.files[0]
    event.preventDefault()

    const reader = new FileReader();
    reader.addEventListener("load", function () {
        // convert image file to base64 string
        dataUri = reader.result
        base64 = dataUri.replace("data:image/png;base64,","")
        fetch("/parameter/"+element.dataset.index, {
            method: "POST",
            body: base64
        })
    }, false);

    if (file) {
        reader.readAsDataURL(file);
    }
}

function pendantStep(){
    let finalScreen = document.getElementById("pendantScreenTemplate").innerHTML
    let millingWizard = document.getElementById("millingWizard")
    millingWizard.innerHTML = finalScreen
    let sliderNorth = new PendantSlider(1, 2000, "x", false, true,  document.getElementById("slider-north"), document.getElementById("arrow-north"))
    let sliderSouth = new PendantSlider(1, 2000, "x", true,  true,  document.getElementById("slider-south"), document.getElementById("arrow-south"))
    let sliderWest  = new PendantSlider(1, 2000, "y", false, false, document.getElementById("slider-west"),  document.getElementById("arrow-west"))
    let sliderEast  = new PendantSlider(1, 2000, "y", true,  false, document.getElementById("slider-east"),  document.getElementById("arrow-east"))
}

function probeStep(){
    let finalScreen = document.getElementById("probeScreenTemplate").innerHTML
    let millingWizard = document.getElementById("millingWizard")
    millingWizard.innerHTML = finalScreen
}

function carveStep(){
    let finalScreen = document.getElementById("carveScreenTemplate").innerHTML
    let millingWizard = document.getElementById("millingWizard")
    millingWizard.innerHTML = finalScreen
}

document.addEventListener('DOMContentLoaded', function() {
    let url = 'http://127.0.0.1:8081/GUI-is-still-open'
    fetch(url, { mode: 'no-cors'})
    setInterval(function(){ fetch(url, { mode: 'no-cors'});}, 5000)


    document.addEventListener('click', function (event) {

        // If the clicked element doesn't have the right selector, bail
        switch(event.target.id){
            case "index_button":
                document.location.href = "/"
                break;
            case "preview-next":
                pendantStep()
                break;
            case "pendant-next":
                probeStep()
                break;
            case "pendant-back":
                previewStep()
                break;
            case "probe-back":
                pendantStep()
                break;
            case "probe-next":
                carveStep()
                break;
            case "carve-back":
                probeStep()
                break;
            case "optionCarve":
                previewStep()
                break;
            case "optionDownloadButton":
            case "optionDownload":
                downloadStep()
                break;
        }

    }, false);
})
