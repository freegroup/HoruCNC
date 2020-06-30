function icon(filter, index, step){
    if(filter.icon){
        return `<img src="data:image/png;base64,${filter.icon}"/><div class="step">${step}.</div>`
    }
    return filter.name
}

function slider(filter, index){
    if(filter.parameter){
        return `<input 
                     class="parameter" 
                     id="slider${index}"  
                     data-index="${index}" 
                     type="range"
                      min="0" 
                      max="255" 
                      value="${filter.value}" step="1">`
    }
    return ""
}

function previewScreen(filter, index, step){
    return `<div
           data-image="/image/${index}"  
           class="preview update"
           style="background-image:url(/image/${index})" 
           id="preview${index}" 
           ></div>
        <div class="description">${filter.description}</div>
        ${slider(filter, index)}`
}

function pendantScreen(step){
    let finalScreen = document.getElementById("pendantScreenTemplate").innerHTML

    return  `<section id="sectionFINAL">
                <input type="radio" name="sections" id="optionFINAL">
                <label for="optionFINAL"><img src="/static/images/engrave.png"/><div class="step">${step}.</div></label>
                <article id="millingWizard">
                ${finalScreen}
                </article>
             </section>`
}

function probeScreen(){
    let finalScreen = document.getElementById("probeScreenTemplate").innerHTML
    let millingWizard = document.getElementById("millingWizard")
    millingWizard.innerHTML = finalScreen
}

function carveScreen(){
    let finalScreen = document.getElementById("carveScreenTemplate").innerHTML
    let millingWizard = document.getElementById("millingWizard")
    millingWizard.innerHTML = finalScreen
}


fetch('/meta')
    .then(response => response.json())
    .then(data => {
        let step =1
        let element = document.querySelector("#filters");
        data.forEach( (filter, index) => {
            if(filter.menu) {
                let html = `<section id="section${index}">
                            <input type="radio" name="sections" id="option${index}">
                            <label for="option${index}">${icon(filter, index, step)}</label>
                            <article>
                            ${previewScreen(filter, index, step)}
                            </article>
                        </section>`
                element.insertAdjacentHTML('beforeend', html);
                step++;
            }
        })
        element.insertAdjacentHTML('beforeend', pendantScreen(step))

        function updateImage() {
            setTimeout(() => {
                let preview = document.querySelector('.tabordion input[name="sections"]:checked ~ article .update')
                if (preview) {
                    let image = new Image()
                    image.onload = () => {
                        preview.style["background-image"] = "url("+image.src+")"
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


        let nodes = document.querySelectorAll(".parameter")
        nodes.forEach( (node)=>{
            node.addEventListener("input", (event)=>{
                let element = event.target
                fetch("/parameter/"+element.dataset.index+"/"+element.value, {
                    method: "POST"
                })
            })
        })

        document.addEventListener('click', function (event) {

            // If the clicked element doesn't have the right selector, bail
            switch(event.target.id){
                case "index_button":
                    document.location.href = "/"
                    break;
                case "pendant-next":
                    probeScreen()
                    break;
                case "probe-next":
                    carveScreen()
                    break;
            }

        }, false);


    })
