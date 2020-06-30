document.addEventListener('click', function (event) {

    // If the clicked element doesn't have the right selector, bail
    switch(event.target.id){
        case "arrow-west":
            fetch("/machine/pendant/x/-1", {method: "POST"})
            break;
        case "arrow-east":
            fetch("/machine/pendant/x/1", {method: "POST"})
            break;
        case "arrow-north":
            fetch("/machine/pendant/y/1", {method: "POST"})
            break;
        case "arrow-south":
            fetch("/machine/pendant/y/-1", {method: "POST"})
            break;
        case "start-probe":
            fetch("/machine/probe/-20/10", {method: "POST"})
            break;
        case "start-carve":
            fetch("/machine/carve/start", {method: "POST"})
            break;
    }

}, false);

