


var supportsCSS = !!((window.CSS && window.CSS.supports) || window.supportsCSS || false);

if (supportsCSS && CSS.supports("animation-name", "test")) {

    let textDivs = document.querySelectorAll('#intro-text span');
    let textDiv = document.querySelector('#intro-text span:nth-child(6)');

    /* add animationend event listener to the textDiv */
    textDiv.addEventListener('animationend', function () {

        let introDivs = document.querySelectorAll('div.images-intro div');
        let pageContent = document.querySelectorAll('.page-hero-content');

        textDivs.forEach(function (e) {
            e.classList.add('fadeOut');
        });

        introDivs.forEach(function (e) {
            e.classList.add('play');
            e.classList.remove('intro-zoomout');
        });
        pageContent.forEach(function (f) {
            f.classList.add('play');
        });

    });

    /* remove comment to play only one time per browser session
 
 let oncePerSession = document.querySelector('.images-intro');
 if ((sessionStorage.getItem('played') == '1')) {
    oncePerSession.style.display = 'none';
 } 
 window.sessionStorage.setItem('played', '1');
 
 */

}