try {
    let gcview = document.getElementById('gcview');
    // setup GCView with the div element to display the gcode in
    let renderer = new GCView(gcview);
    renderer.loadGC(gcode_data);
} catch(exc){
    console.log(exc);
}
