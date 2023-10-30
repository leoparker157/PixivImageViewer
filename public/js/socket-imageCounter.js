function imageCounter(ImageType) {
    const h1Element = document.querySelector('.Imagecouting');
    let total = 0;
    let currentnum = 0;
    socket.on(`${ImageType}-total`, totalnum => {
        totalcurrent = totalnum;
    });
    socket.on(`${ImageType}-current`, currentnum1 => {
        currentnum1++;
        total++
        h1Element.textContent = "loading " + currentnum1 + "/" + totalcurrent;
        if (currentnum1 == totalcurrent) {
            h1Element.textContent = "total image: " + total;
        }    });

}
