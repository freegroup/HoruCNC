
fetch('./meta')
    .then(response => response.json())
    .then(data => console.log(JSON.stringify(data)))