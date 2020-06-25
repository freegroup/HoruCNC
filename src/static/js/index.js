function icon(filter, index){
    if(filter.icon){
        return `<img src="data:image/png;base64,${filter.icon}">`
    }
    return filter.name
}

function slider(filter, index){
    if(filter.parameter){
        return `<input class="parameter" id="slider${index}"  data-index="${index}" type="range" min="0" max="255" value="${filter.value}" step="1">`
    }
    return ""
}


fetch('./meta')
    .then(response => response.json())
    .then(data => {
        data.forEach( (filter, index) => {
            if(filter.visible) {
                let html = `<section id="section${index}">
                            <input type="radio" name="sections" id="option${index}">
                            <label for="option${index}">${icon(filter, index)}</label>
                            <article>
                            <div
                               data-image="/image/${index}"  
                               class="preview"
                               style="background-image:url(/image/${index})" 
                               id="preview${index}" 
                               ></div>
                            <div class="description">${filter.description}</div>
                               ${slider(filter, index)}
                            </article>
                        </section>`

                let element = document.querySelector("#filters");
                element.insertAdjacentHTML('beforeend', html);
            }
        })

        function updateImage() {
            setTimeout(() => {
                let preview = document.querySelector('.tabordion input[name="sections"]:checked ~ article .preview')
                if (preview) {
                    let image = new Image()
                    image.onload = () => {
                        preview.style["background-image"] = "url("+image.src+")"
                        updateImage()
                    }
                    image.src = preview.dataset.image + "?time=" + new Date().getMilliseconds()
                }
                else{
                    updateImage()
                }
            }, 300)
        }
        updateImage()


        var nodes = document.querySelectorAll(".parameter")
        nodes.forEach( (node)=>{
            console.log(node)
            node.addEventListener("input", (event)=>{
                let element = event.target
                fetch("/parameter/"+element.dataset.index+"/"+element.value, {
                    method: "POST"
                })
            })
        })

    })
