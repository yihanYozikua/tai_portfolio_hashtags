import { preloadImages } from './utils';
import { Grid } from './grid';


// Initialize the grid
new Grid(document.querySelector('.grid--large'));

// scroll to top
window.scrollTo({
  top: 0,
  behavior: 'smooth'
});

// Preload images then remove loader (loading class) from body
preloadImages('.grid__cell-img-inner, .slide-nav__img', '.footer_container').then(() => document.body.classList.remove('loading'));