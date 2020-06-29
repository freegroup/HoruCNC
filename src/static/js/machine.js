document.addEventListener('click', function (event) {

    // If the clicked element doesn't have the right selector, bail
    switch(event.target.id){
        case "x-left":
            fetch("/machine/x/-1", {method: "POST"})
            break;
        case "x-right":
            fetch("/machine/x/1", {method: "POST"})
            break;
        case "y-left":
            fetch("/machine/y/-1", {method: "POST"})
            break;
        case "y-right":
            fetch("/machine/y/1", {method: "POST"})
            break;
    }

}, false);

