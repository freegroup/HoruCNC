document.addEventListener('click', function (event) {

    // If the clicked element doesn't have the right selector, bail
    switch(event.target.id){
        case "arrow-west":
            fetch("/machine/x/-1", {method: "POST"})
            break;
        case "arrow-east":
            fetch("/machine/x/1", {method: "POST"})
            break;
        case "arrow-north":
            fetch("/machine/y/1", {method: "POST"})
            break;
        case "arrow-south":
            fetch("/machine/y/-1", {method: "POST"})
            break;
    }

}, false);

