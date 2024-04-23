(function(){
    /* setup popup events for these class names elmeents in a loop
    moreInfo
moreInfoInner
closeReadMore 
*/

    let readMore = document.querySelectorAll('.readMore');
    let moreInfo = document.querySelectorAll('.moreInfo');
    let moreInfoInner = document.querySelectorAll('.moreInfoInner');
    let closeReadMore = document.querySelectorAll('.closeReadMore');

    for (let i = 0; i < readMore.length; i++) {
        readMore[i].addEventListener('click', function(e) {
            e.preventDefault();
            moreInfo[i].classList.add('show');
        });

        closeReadMore[i].addEventListener('click', function() {
            moreInfo[i].classList.remove('show');
        });

        /* if the click event is directly on moreInfo , close it */
        moreInfo[i].addEventListener('click', function(e) {
            if (e.target === moreInfo[i]) {
                moreInfo[i].classList.remove('show');
            }
        });
    }    

    /* on click ESC key close the popup */
    document.addEventListener('keydown', function(e) {
        if (e.keyCode === 27) {
            for (let i = 0; i < moreInfo.length; i++) {
                moreInfo[i].classList.remove('show');
            }
        }
    });

}());