try {
    let gcview = document.getElementById('gcview');
    // setup GCView with the div element to display the gcode in
    fetch('assets/mokka.nc')
        .then(response => response.text())
        .then((data) => {
            let renderer = new GCView(gcview);
            renderer.loadGC(data);
        })
} catch(exc){
    console.log(exc);
}
