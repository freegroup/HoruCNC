document.addEventListener('click', function (event) {

    // If the clicked element doesn't have the right selector, bail
    switch(event.target.id){
        case "arrow-west":
            fetch("/machine/pendant/X/-1", {method: "POST"})
            break;
        case "arrow-east":
            fetch("/machine/pendant/X/1", {method: "POST"})
            break;
        case "arrow-north":
            fetch("/machine/pendant/Y/1", {method: "POST"})
            break;
        case "arrow-south":
            fetch("/machine/pendant/Y/-1", {method: "POST"})
            break;
        case "probe-up":
            fetch("/machine/pendant/Z/1", {method: "POST"})
            break;
        case "probe-down":
            fetch("/machine/pendant/Z/-0.5", {method: "POST"})
            break;
        case "probe-start":
            fetch("/machine/probe/-20/10", {method: "POST"})
            break;
        case "carve-start":
            fetch("/machine/carve/start", {method: "POST"})
            break;
    }

}, false);

