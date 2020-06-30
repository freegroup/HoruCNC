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

function finalSection(step){
    let finalScreen = document.getElementById("finalScreen").innerHTML

    return  `<section id="sectionFiNAL">
                <input type="radio" name="sections" id="optionFiNAL">
                <label for="optionFiNAL"><img src="/static/images/engrave.png"/><div class="step">${step}.</div></label>
                <article>
                ${finalScreen}
                </article>
             </section>`
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
        element.insertAdjacentHTML('beforeend', finalSection(step))

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

        let backButton = document.getElementById("index_button")
        backButton.onclick=  ()=>{
            document.location.href = "/"
        }

    })
