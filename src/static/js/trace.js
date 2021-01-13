try {
    trace_data.forEach(function (item, index) {
        let section =
            `<div>
                <h2>${index+1}. ${item.name}</h2>
                <h3>${item.description}.</h2>
                <img src="${item.image}">
           </div> `
        document.getElementById("previewContainer").insertAdjacentHTML('beforeend', section);
    });

} catch(exc){
    console.log(exc);
}
