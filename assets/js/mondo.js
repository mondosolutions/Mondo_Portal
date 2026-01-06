
//toggle button
const darkModeToggle = document.getElementById('settings-checkDm');
// local storage
let darkMode = localStorage.getItem('darkMode'); 

function changeCSS(cssFile, cssFileOld) {
    // get all links in the head (including CSS)
    let allLinks = document.head.getElementsByTagName('link');
    // find and replace the element
    for (let i = 0; i < allLinks.length; i++) {
        if(allLinks[i].getAttribute('href') == cssFileOld){
            allLinks[i].href = cssFile;
        }
    }
}


const enableDarkMode = () => {
    // 1. change to bootstrap dark
    changeCSS('assets/css/bootstrap-dark.min.css', 'assets/css/bootstrap.min.css');
    changeCSS('assets/css/app-dark.min.css', 'assets/css/app.min.css');
    // 2. update darkMode in localStorage
    localStorage.setItem('darkMode', 'enabled')
}

const disableDarkMode = () => {
    // 1. change to bootstrap default (light mode)
    changeCSS('assets/css/bootstrap.min.css', 'assets/css/bootstrap-dark.min.css'); 
    changeCSS('assets/css/app.min.css', 'assets/css/app-dark.min.css'); 
    // 2. update darkMode in localStorage
    localStorage.removeItem('darkMode');
}

if(darkMode === 'enabled'){
    enableDarkMode();
    darkModeToggle.setAttribute('checked', '');
}

darkModeToggle.addEventListener('change', () => {
    darkMode = localStorage.getItem('darkMode');
    if(darkModeToggle.checked){
        enableDarkMode();
    }
    else {
        disableDarkMode();
    }
});

