let filters = []
fetch('/meta')
    .then(response => response.json())
    .then(data => {
        filters = data.filters

        let element = document.querySelector("#filters")

        // see codepen to make this scenarion draggable
        // https://codepen.io/chriscoyier/pen/Bjamqg

        element.insertAdjacentHTML('beforeend',
            `<button class="filter"  onClick="startScreen(this)">
               <img 
                    src="/static/images/source.svg"
                    id="filterStart"
               />
             </button>`)

        // add all the filters to the pipeline
        //
        filters.forEach( (filter, index) => {
            // check if the filter should be visible in the pipeline
            if(filter.menu) {
                let html = `<button class='filter'  onClick="filterScreen(this,${index})">
                                <img src="${filter.icon}" id="filter${index}" />
                            </button>`
                element.insertAdjacentHTML('beforeend', html);
            }
        })

        // add the final carving screen to the pipeline
        //
        element.insertAdjacentHTML('beforeend',
            `<button class="filter" onClick="finalScreen(this)">
               <img src="/static/images/engrave.svg" id="filterFinal"/>
             </button>`)

        // start the initial trigger to update the preview image
        //
        updatePreviewImage()

        // select the first pane/filter in the navigation to show the first page
        //
        document.getElementById("filterStart").click()
    })


function updatePreviewImage() {
    setTimeout(() => {
        let preview = document.querySelector('.update')
        if (preview) {
            let image = new Image()
            image.onload = () => {
                preview.style["background-image"] = "url("+image.src+")"
                updatePreviewImage()
                let nodeList = document.querySelectorAll("#sectionStart ~ section")
                let nodeArray = [...nodeList]; // converts NodeList to Array
                nodeArray.forEach(node => {
                    node.classList.remove('disabled');
                });
            }
            image.onerror = ()=> {
                // no image selected or available. Either the user didn'T upload/select one or the camera isn't
                // available. Go to step-0 and force that the user selects an image or camera source
                document.getElementById("optionStart").click()
                // disable all other steps. It makes no sense to enable the filters without any selected image
                //
                let nodeList = document.querySelectorAll("#sectionStart ~ section")
                let nodeArray = [...nodeList]; // converts NodeList to Array
                nodeArray.forEach(node => {
                    node.classList.add('disabled');
                });
                updatePreviewImage()
            }
            image.src = preview.dataset.image + "?time=" + new Date().getTime()
        }
        else{
            updatePreviewImage()
        }
    }, 300)
}



function startScreen(button){
    document.querySelectorAll(".blue-button").forEach( el => {
        el.classList.remove("blue-button");
    })
    button.classList.add("blue-button");
    let element = document.querySelector("#filter-settings")
    element.innerHTML=
        `<div
               data-image="/sourceImage"  
               class="preview update"
               style="background-image:url(/sourceImage)" 
               id="previewStart" 
               >
            </div>
            <h4 class="description">Select Image</h4>
            <div class="parameter bottom-button-center">
                 <input 
                   onchange="uploadImage(event)"
                   type="file"
                    id="presetImageInput" 
                   accept="image/png">
                 <button id="presetImage">
                    <label for="presetImageInput"   />Choose Image..</label>
                 </button>
                 <button 
                   id="resetImage"
                   onclick="resetImage(event)">
                   <label>Use Camera</label>
       </div>`
}


function filterScreen(button, index){
    document.querySelectorAll(".blue-button").forEach( el => {
        el.classList.remove("blue-button");
    })
    button.classList.add("blue-button");
    function inputParameter(filter, index){
        let paramHTML = ""
        filter.parameters.forEach( (parameter, pi)=>{
            if(parameter.type==="slider"){
                paramHTML+=
                    `<div class="parameter">
                     <label for="param_${index}">${parameter.label}</label>     
                     <input 
                         id="param_${index}_${pi}"  
                         data-filter="${index}"
                         data-param="${pi}" 
                         data-index="${index}" 
                         data-name="${parameter.name}" 
                         type="range"
                         min="${parameter.min}" 
                         max="${parameter.max}" 
                         value="${parameter.value}" 
                         step="1">
                     </div>`
            }
        })
        return paramHTML
    }

    let element = document.querySelector("#filter-settings")
    let filter = filters[index]
    let html =  `<div
                   data-image="/image/${index}"  
                   class="preview update"
                   style="background-image:url(/image/${index})" 
                   id="preview${index}" 
                   ></div>
                <h4 class="description">${filter.description}</h4>
                <div class="parameters">${inputParameter(filter, index)}</div>`
    element.innerHTML = html

    let nodes = document.querySelectorAll(".parameter input[type=range]")
    nodes.forEach( (node)=>{
        node.addEventListener("input", (event)=>{
            let element = event.target
            let pi =element.dataset.param
            let fi =element.dataset.filter
            let param = filters[fi].parameters[pi]
            param.value = element.value
            fetch("/parameter/"+element.dataset.index+"/"+element.dataset.name+"/"+element.value, {
                method: "POST"
            })
        })
    })
}


function finalScreen(button){
    document.querySelectorAll(".blue-button").forEach( el => {
        el.classList.remove("blue-button");
    })
    button.classList.add("blue-button");

    let element = document.querySelector("#filter-settings")
    element.innerHTML = `<div id="finalWizard" ></div>`
    previewStep()
}


function previewStep(){
    let container = document.getElementById("finalWizard")
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
            let renderer = new GCView(gcview)
            renderer.loadGC(data)
    })
}

function downloadStep(){
    let container = document.getElementById("finalWizard")
    let template = document.getElementById("downloadScreenTemplate").innerHTML
    container.innerHTML = template

    let gcview = document.getElementById('gcview')
    gcview.style.width = container.clientWidth+"px"
    gcview.style.height = container.clientHeight+"px"
    // setup GCView with the div element to display the gcode in
    fetch('/gcode')
        .then(response => response.text())
        .then(data => {
            let renderer = new GCView(gcview)
            renderer.loadGC(data)
        })
}

function uploadImage(event){
    let element = event.target
    let file = element.files[0]
    event.preventDefault()

    const reader = new FileReader();
    reader.addEventListener("load", function () {
        // convert image file to base64 string
        let dataUri = reader.result
        let base64 = dataUri.replace("data:image/png;base64,","")
        fetch("/sourceImage", {
            method: "POST",
            body: base64
        })
    }, false);

    if (file) {
        reader.readAsDataURL(file);
    }
}


function resetImage(event){
    event.preventDefault()
    fetch("/sourceImage", {
        method: "POST",
        body: null
    })
}

function pendantStep(){
    let finalScreen = document.getElementById("pendantScreenTemplate").innerHTML
    let finalWizard = document.getElementById("finalWizard")
    finalWizard.innerHTML = finalScreen
    let sliderNorth = new PendantSlider(1, 2000, "x", false, true,  document.getElementById("slider-north"), document.getElementById("arrow-north"))
    let sliderSouth = new PendantSlider(1, 2000, "x", true,  true,  document.getElementById("slider-south"), document.getElementById("arrow-south"))
    let sliderWest  = new PendantSlider(1, 2000, "y", false, false, document.getElementById("slider-west"),  document.getElementById("arrow-west"))
    let sliderEast  = new PendantSlider(1, 2000, "y", true,  false, document.getElementById("slider-east"),  document.getElementById("arrow-east"))
}

function probeStep(){
    let finalScreen = document.getElementById("probeScreenTemplate").innerHTML
    let finalWizard = document.getElementById("finalWizard")
    finalWizard.innerHTML = finalScreen
}

function carveStep(){
    let finalScreen = document.getElementById("carveScreenTemplate").innerHTML
    let finalWizard = document.getElementById("finalWizard")
    finalWizard.innerHTML = finalScreen
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
            case "optionFinal":
                previewStep()
                break;
            case "optionDownloadButton":
            case "optionDownload":
                downloadStep()
                break;
        }

    }, false);
})
