import { ImageCell } from './imageCell';
import { calcWinsize, adjustedBoundingRect } from './utils';
import { TextReveal } from './textReveal';
import { gsap } from 'gsap';

// body element
const bodyEl = document.body;

// Calculate the viewport size
let winsize = calcWinsize();
window.addEventListener('resize', () => winsize = calcWinsize());

// if mobile
function detectMobile() {
    return ( ( window.innerWidth <= 768 ) );
}

// disable scroll event
function preventDefault(e) {
    e.preventDefault();
}

function preventDefaultForScrollKeys(e) {
    if (keys[e.keyCode]) {
        preventDefault(e);
        return false;
    }
}
// modern Chrome requires { passive: false } when adding event
var supportsPassive = false;
try {
    window.addEventListener("test", null, Object.defineProperty({}, 'passive', {
        get: function () { supportsPassive = true; } 
    }));
} catch(e) {}

var wheelOpt = supportsPassive ? { passive: false } : false;
var wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';

// call this to Disable
function disableScroll() {
    console.log('disable scroll');
    window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
    window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
    window.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
    window.addEventListener('keydown', preventDefaultForScrollKeys, false);
}
// call this to Enable
function enableScroll() {
    console.log('enable scroll');
    window.removeEventListener('DOMMouseScroll', preventDefault, false);
    window.removeEventListener(wheelEvent, preventDefault, wheelOpt); 
    window.removeEventListener('touchmove', preventDefault, wheelOpt);
    window.removeEventListener('keydown', preventDefaultForScrollKeys, false);
}


/**
 * Class representing a grid of images, where the grid can be zoomed to the clicked image cell
 */
export class Grid {
    // DOM elements
    DOM = {
        // main element (.grid)
        el: null,
        // .grid__cell-img elements
        imageCells: null,
        // content section
        content: null,
        // .back button
        backCtrl: null,
        // The mini grid shown in the content area
        miniGrid: {
            // main element
            el: null,
            // cells
            cells: null
        },
        // For show the prev & next cell
        prevCells: null,
        nextCells: null,
        backToAboutButton: null,
        sideBarContainer: null,
        footer: null,
        showGridMiniButton: null,
    };
    // ImageCell instances array
    imageCellArr = [];
    // Index of current imageCell
    currentCell = -1;
    // Checks if in view mode or if in content mode
    isGridView = true;
    // Checks for active animation
    isAnimating = false;
    // TextReveal obj to animate the texts (slide in/out)
    textReveal = null;

    /**
     * Constructor.
     * @param {Element} DOM_el - the .grid--large element
     */
    constructor(DOM_el) {
        this.DOM.el = DOM_el;
        this.DOM.imageCells = [...this.DOM.el.querySelectorAll('.grid__cell-img')];
        this.DOM.imageCells.forEach(el => this.imageCellArr.push(new ImageCell(el)));
        this.DOM.content = document.querySelector('.content');
        this.DOM.backCtrl = this.DOM.content.querySelector('.back');
        this.DOM.miniGrid.el = this.DOM.content.querySelector('.grid--mini');
        this.DOM.miniGrid.cells = [...this.DOM.miniGrid.el.querySelectorAll('.grid__cell')];
        this.DOM.prevCells = [...this.DOM.el.querySelectorAll('.slide-nav__img--prev')];
        this.DOM.nextCells = [...this.DOM.el.querySelectorAll('.slide-nav__img--next')];
        this.DOM.backToAboutButton = document.querySelector('.back_to_about')
        this.DOM.sideBarContainer = document.querySelector('.side_bar_container')
        this.DOM.footer = document.querySelector('.footer_container')
        this.DOM.showGridMiniButton = document.querySelector('.mobile_show_grid_mini');

        // Text animations
        this.textReveal = new TextReveal([...this.DOM.el.querySelectorAll('.oh')]);
        // Events
        this.initEvents();
        // Track which cells are visible
        //this.trackVisibleCells();
    }

    /**
     * Track which cells are visible (inside the viewport)
     * by adding/removing the 'in-view' class when scrolling.
     * This will be used to animate only the ones that are visible.
     */
    trackVisibleCells() {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.intersectionRatio > 0) {
                    entry.target.classList.add('in-view');
                } 
                else {
                    entry.target.classList.remove('in-view');
                }
            });
        });
        this.DOM.imageCells.forEach(img => observer.observe(img));
    }

    /**
     * Init/Bind events.
     */
    initEvents() {
        // for every imageCell
        for (const [position,imageCell] of this.imageCellArr.entries()) {

            // Open the imageCell and reveal its content
            imageCell.DOM.el.addEventListener('click', () => {
                if ( !this.isGridView || this.isAnimating ) {
                    return false;
                }
                this.isAnimating = true;
                this.isGridView = false;

                // Update the mini grid current cell
                if ( this.currentCell !== -1 ) {
                    this.DOM.miniGrid.cells[this.currentCell].classList.remove('grid__cell--current');
                }

                // Update currentCell
                this.currentCell = position;
                this.DOM.miniGrid.cells[this.currentCell].classList.add('grid__cell--current');

                this.showContent(imageCell);
            });

            // Hover on the image cell will scale down the outer element and scale up the inner element.
            imageCell.DOM.el.addEventListener('mouseenter', () => {
                if ( !this.isGridView ) {
                    return false;
                }
                gsap.killTweensOf([imageCell.DOM.el, imageCell.DOM.inner]);
                gsap.timeline({
                    defaults: {duration: 1.2, ease: 'expo'}
                })
                .to(imageCell.DOM.el, {scale: 0.99}, 0)
                .to(imageCell.DOM.inner, {scale: 1.08}, 0);
            });

            // Hovering out will reverse the scale values.
            imageCell.DOM.el.addEventListener('mouseleave', () => {
                if ( !this.isGridView ) {
                    return false;
                }
                gsap.killTweensOf([imageCell.DOM.el, imageCell.DOM.inner]);
                gsap.timeline({
                    defaults: {duration: 1.2, ease: 'expo'}
                })
                .to([imageCell.DOM.el, imageCell.DOM.inner], {scale: 1}, 0);
            });

        }

        // Close the imageCell and reveal the grid
        this.DOM.backCtrl.addEventListener('click', () => {
            if ( this.isAnimating ) {
                return false;
            }
            this.isAnimating = true;
            this.isGridView = true;

            this.closeContent();
        });

        this.DOM.miniGrid.cells.forEach((cell, position) => {
            cell.addEventListener('click', () => {
                if ( this.isAnimating || this.currentCell === position ) {
                    return false;
                }
                this.isAnimating = true;
                this.changeContent(position);
            });
        });

        this.DOM.prevCells.forEach((cell, position) => {
            cell.addEventListener('click', () => {
                console.log('click');
                if ( this.isAnimating || this.currentCell === position ) {
                    return false;
                }
                this.isAnimating = true;
                this.changeContent(position);
            });
        });

        // Recalculate current image transform
        window.addEventListener('resize', () => {
            if ( this.isGridView ) {
                return false;
            }

            // Calculate the transform to apply to the image cell
            const imageTransform = this.calcTransformImage();
            gsap.set(this.imageCellArr[this.currentCell].DOM.el, {
                scale: imageTransform.scale,
                x: imageTransform.x,
                y: imageTransform.y
            });
        });
    }

    /**
     * Scale up the image and reveal its content.
     * @param {ImageCell} imageCell - the imageCell element.
     */
    showContent(imageCell) {
        disableScroll();
        var isMobile = detectMobile();
        // Calculate the transform to apply to the image cell
        const imageTransform = this.calcTransformImage();
        // All the others (that are inside the viewport)
        //this.otherImageCells = this.DOM.imageCells.filter(el => el != imageCell.DOM.el && el.classList.contains('in-view'));
        this.otherImageCells = this.DOM.imageCells.filter(el => el != imageCell.DOM.el);
        this.backToAboutButton = this.DOM.backToAboutButton;
        this.sideBarContainer = this.DOM.sideBarContainer;
        this.footer = this.DOM.footer;
        this.showGridMiniButton = this.DOM.showGridMiniButton;
        var isMobile = detectMobile();
        var setSideBar = 0;
        if (!isMobile){ 
            setSideBar = 1; 
        }
        else { 
            setSideBar = 0; 
        }
        

        gsap.killTweensOf([imageCell.DOM.el, imageCell.DOM.inner, this.otherImageCells]);
        gsap.timeline({
            defaults: {
                duration: 1.2, 
                ease: 'expo.inOut'
            },
            // overflow hidden
            onStart: () => {
                bodyEl.classList.add('oh');
            },
            onComplete: () => {
                this.isAnimating = false;
            }
        })
        .addLabel('start', 0)
        .add(() => {
            // Hide grid texts
            this.textReveal.out();
        }, 'start')
        .set(this.DOM.el, {
            pointerEvents: 'none'
        }, 'start')
        .set(imageCell.DOM.el, {
            zIndex: 100
        }, 'start')
        .set([imageCell.DOM.el, imageCell.DOM.inner, this.otherImageCells], {
            willChange: 'transform, opacity'
        }, 'start')
        .to(imageCell.DOM.el, {
            scale: imageTransform.scale,
            x: imageTransform.x,
            y: imageTransform.y,
            onComplete: () => gsap.set(imageCell.DOM.el, {willChange: ''})
        }, 'start')
        .to(imageCell.DOM.inner, {
            scale: 1,
            onComplete: () => gsap.set(imageCell.DOM.inner, {willChange: ''})
        }, 'start')
        .to([imageCell.contentItem.DOM.nav.prev, imageCell.contentItem.DOM.nav.next], {
            y: 0
        }, 'start')
        .to(this.otherImageCells, {
            opacity: 0,
            scale: 0.8,
            onComplete: () => gsap.set(this.otherImageCells, {willChange: ''}),
            stagger: {
                grid: 'auto',
                amount: 0.17,
                from: this.currentCell
            }
        }, 'start')
        .addLabel('showContent', 'start+=0.45')
        .to(this.DOM.backCtrl, {
            ease: 'expo',
            startAt: {x: '50%'},
            x: '0%',
            opacity: 1
        }, 'showContent')
        .set(this.backToAboutButton, {
            opacity: 0,
            transition: 'all .3s ease-in-out'
        }, 'showContent')
        .set(this.sideBarContainer, {
            opacity: setSideBar,
            transition: 'all .3s ease-in-out'
        }, 'showContent')
        .set(this.footer, {
            opacity: 0,
            transition: 'all .3s ease-in-out'
        }, 'showContent')
        .set(this.showGridMiniButton, {
            visibility: 'visible',
            transition: 'all .3s ease-in-out'
        }, 'showContent')
        .add(() => {
            if(!isMobile){
                this.DOM.miniGrid.el.style.opacity = 1;
            }else{
                this.DOM.miniGrid.el.style.opacity = 0;
            }
        }, 'showContent')
        .set(this.DOM.miniGrid.cells, {
            opacity: 0
        }, 'showContent')
        .to(this.DOM.miniGrid.cells, {
            duration: 1, 
            ease: 'expo',
            opacity: 1,
            startAt: {scale: 0.8},
            scale: 1,
            stagger: {
                grid: 'auto',
                amount: 0.3,
                from: this.currentCell
            }
        }, 'showContent+=0.2')
        .add(() => {
            imageCell.contentItem.textReveal.in();
            imageCell.contentItem.textLinesReveal.in();
            this.DOM.content.classList.add('content--open');
        }, 'showContent')
        .add(() => imageCell.contentItem.DOM.el.classList.add('content__item--current'), 'showContent+=0.02')
        ;
    }

    /**
     * Scale down the image and reveal the grid again.
     */
    closeContent() {
        enableScroll();
        // Current imageCell
        const imageCell = this.imageCellArr[this.currentCell];
        this.otherImageCells = this.DOM.imageCells.filter(el => el != imageCell.DOM.el);
        
        gsap.timeline({
            defaults: {
                duration: 1, 
                ease: 'expo.inOut'
            },
            // overflow hidden
            onStart: () => bodyEl.classList.remove('oh'),
            onComplete: () => {
                this.isAnimating = false;
            }
        })
        .addLabel('start', 0)
        .to(this.DOM.backCtrl, {
            x: '50%',
            opacity: 0
        }, 'start')
        .to(this.backToAboutButton, {
            opacity: 1,
            transition: 'all .3s ease-in-out'
        }, 'start')
        .set(this.sideBarContainer, {
            opacity: 1,
            transition: 'all .3s ease-in-out'
        }, 'start')
        .set(this.footer, {
            opacity: 1,
            transitionDelay: '.5s',
            transition: 'all .3s ease-in-out'
        }, 'start')
        .set(this.showGridMiniButton, {
            visibility: 'hidden',
            transition: 'all .3s ease-in-out'
        }, 'start')
        .to(this.DOM.miniGrid.cells, {
            duration: 0.5, 
            ease: 'expo.in',
            opacity: 0,
            scale: 0.8,
            stagger: {
                grid: 'auto',
                amount: 0.1,
                from: -this.currentCell
            },
            onComplete: () => {
                gsap.set(this.DOM.miniGrid.el, {
                    opacity: 0
                })
            }
        }, 'start')

        .add(() => {
            imageCell.contentItem.textReveal.out();
            imageCell.contentItem.textLinesReveal.out();
            this.DOM.content.classList.remove('content--open');
        }, 'start')
        .add(() => imageCell.contentItem.DOM.el.classList.remove('content__item--current'))
        .addLabel('showGrid', 0)
        .set([imageCell.DOM.el, this.otherImageCells], {
            willChange: 'transform, opacity'
        }, 'showGrid')
        .to(imageCell.DOM.el, {
            scale: 1,
            x: 0,
            y: 0,
            onComplete: () => gsap.set(imageCell.DOM.el, {willChange: '', zIndex: 1})
        }, 'showGrid')
        .to(imageCell.contentItem.DOM.nav.prev, {
            y: '-100%'
        }, 'showGrid')
        .to(imageCell.contentItem.DOM.nav.next, {
            y: '100%'
        }, 'showGrid')
        .to(this.otherImageCells, {
            opacity: 1,
            scale: 1,
            onComplete: () => {
                gsap.set(this.otherImageCells, {willChange: ''});
                gsap.set(this.DOM.el, { pointerEvents: 'auto' });
            },
            stagger: {
                grid: 'auto',
                amount: 0.17,
                from: -this.currentCell
            }
        }, 'showGrid')
        .add(() => {
            // Show grid texts
            this.textReveal.in();
        }, 'showGrid+=0.3')
    }
    /**
     * 
     */
    changeContent(position) {
        disableScroll();
        // Current imageCell
        const imageCell = this.imageCellArr[this.currentCell];
        // Upcoming imageCell
        const upcomingImageCell = this.imageCellArr[position];
        
        this.DOM.miniGrid.cells[this.currentCell].classList.remove('grid__cell--current');
        this.currentCell = position;
        this.DOM.miniGrid.cells[this.currentCell].classList.add('grid__cell--current');
        console.log(upcomingImageCell.DOM.el.parentNode);

        // Calculate the transform to apply to the image cell
        const imageTransform = this.calcTransformImage();
        
        gsap.timeline({
            defaults: {
                duration: 1, 
                ease: 'expo.inOut'
            },
            onComplete: () => {
                this.isAnimating = false;
            }
        })
        .addLabel('start', 0)
        .add(imageCell.contentItem.textReveal.out(), 'start')
        .add(imageCell.contentItem.textLinesReveal.out(), 'start')
        .add(() => {
            imageCell.contentItem.DOM.el.classList.remove('content__item--current');
        })
        .add(() => {
            upcomingImageCell.DOM.el.parentNode.classList.add("aos-animate");
        })
        .set([imageCell.DOM.el, upcomingImageCell.DOM.el], {
            willChange: 'transform, opacity'
        }, 'start')
        .to(imageCell.DOM.el, {
            opacity: 0,
            scale: 0.8,
            x: 0,
            y: 0,
            onComplete: () => gsap.set(imageCell.DOM.el, {willChange: '', zIndex: 1})
        }, 'start')
        .to(imageCell.contentItem.DOM.nav.prev, {
            y: '-100%'
        }, 'start')
        .to(imageCell.contentItem.DOM.nav.next, {
            y: '100%'
        }, 'start')
        
        .addLabel('showContent', '>-=0.4')
        .set(upcomingImageCell.DOM.el, {
            zIndex: 100
        }, 'start')
        .to(upcomingImageCell.DOM.el, {
            scale: imageTransform.scale,
            x: imageTransform.x,
            y: imageTransform.y,
            opacity: 1,
            onComplete: () => gsap.set(upcomingImageCell.DOM.el, {willChange: ''})
        }, 'start')
        .to([upcomingImageCell.contentItem.DOM.nav.prev, upcomingImageCell.contentItem.DOM.nav.next], {
            ease: 'expo',
            y: 0
        }, 'showContent')
        .add(() => {
            upcomingImageCell.contentItem.textReveal.in();
            upcomingImageCell.contentItem.textLinesReveal.in();
        }, 'showContent')
        .add(() => {
            upcomingImageCell.contentItem.DOM.el.classList.add('content__item--current');
        }, 'showContent+=0.02');
    }
    /**
     * Calculates the scale and translation values to apply to the image cell when we click on it. 
     * Also used to recalculate those values on resize.
     * @return {JSON} the translation and scale values
     */
    calcTransformImage() {
        const cellrect = adjustedBoundingRect(this.imageCellArr[this.currentCell].DOM.el);
        var isMobile = detectMobile();
        if(isMobile){
            return {
                scale: winsize.width * 0.8 / cellrect.width,
                x: winsize.width * 0.5 - (cellrect.left + cellrect.width/2),
                y: winsize.height * 0.30 - (cellrect.top + cellrect.height/2)
            };
        }
        else{
            return {
                scale: winsize.width * 0.54 / cellrect.width,
                x: winsize.width * 0.65 - (cellrect.left + cellrect.width/2),
                y: winsize.height * 0.50 - (cellrect.top + cellrect.height/2)
            };
        }
        
    }
}