try {
    function renderParams(params){
        if(!params || params.length===0)
            return ""
        let s = "<h3>Filter Parameter</h3><table>"
        params.forEach( (item, index) =>{
            s = s +`<tr><td>${item.label}</td><td>${item.value}</td></tr> `
        })
        return s+"</table>"
    }
    trace_data.forEach( (item, index) =>{
        let section =
            `<div>
                <h2>${index+1}. ${item.name}</h2>
                <h3>${item.description}.</h2>
                ${renderParams(item.parameters)}
                <img src="${item.image}">
            </div>`
        document.getElementById("previewContainer").insertAdjacentHTML('beforeend', section);
    });

} catch(exc){
    console.log(exc);
}
