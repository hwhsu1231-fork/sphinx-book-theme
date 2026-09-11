// Import CSS variables
// ref: https://css-tricks.com/getting-javascript-to-talk-to-css-and-sass/
import "../styles/index.scss";

/**
 * A helper function to load scripts when the DOM is loaded.
 * This waits for everything to be on the page first before running, since
 * some functionality doesn't behave properly until everything is ready.
 */
var sbRunWhenDOMLoaded = (cb) => {
  if (document.readyState != "loading") {
    cb();
  } else if (document.addEventListener) {
    document.addEventListener("DOMContentLoaded", cb);
  } else {
    document.attachEvent("onreadystatechange", function () {
      if (document.readyState == "complete") cb();
    });
  }
};

/**
 * Toggle full-screen with button
 *
 * There are some browser-specific hacks in here:
 * - Safari requires a `webkit` prefix, so this uses conditionals to check for that
 *   ref: https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
 */
var toggleFullScreen = () => {
  var isInFullScreen =
    (document.fullscreenElement && document.fullscreenElement !== null) ||
    (document.webkitFullscreenElement &&
      document.webkitFullscreenElement !== null);
  let docElm = document.documentElement;
  if (!isInFullScreen) {
    console.log("[SBT]: Entering full screen");
    if (docElm.requestFullscreen) {
      docElm.requestFullscreen();
    } else if (docElm.webkitRequestFullscreen) {
      docElm.webkitRequestFullscreen();
    }
  } else {
    console.log("[SBT]: Exiting full screen");
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
};

/**
 * Manage scrolling behavior. This is primarily two things:
 *
 * 1. Hide the Table of Contents any time sidebar content is on the screen.
 *
 * This will be triggered any time a sidebar item enters or exits the screen.
 * It adds/removes items from an array if they have entered the screen, and
 * removes them when they exit the screen. It hides the TOC if anything is
 * on-screen.
 *
 * ref: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
 *
 * 2. Add a `scrolled` class to <body> to trigger CSS changes.
 */
var initTocHide = () => {
  var onScreenItems = [];
  let hideTocCallback = (entries, observer) => {
    // Check whether any sidebar item is displayed
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // If an element just came on screen, add it our list
        onScreenItems.push(entry.target);
      } else {
        // Otherwise, if it's in our list then remove it
        for (let ii = 0; ii < onScreenItems.length; ii++) {
          if (onScreenItems[ii] === entry.target) {
            onScreenItems.splice(ii, 1);
            break;
          }
        }
      }
    });

    // Hide the TOC if any margin content is displayed on the screen
    if (onScreenItems.length > 0) {
      document.querySelector("div.bd-sidebar-secondary").classList.add("hide");
    } else {
      document
        .querySelector("div.bd-sidebar-secondary")
        .classList.remove("hide");
    }
  };
  let manageScrolledClassOnBody = (entries, observer) => {
    // The pixel is at the top, so if we're < 0 that it means we've scrolled
    if (entries[0].boundingClientRect.y < 0) {
      document.body.classList.add("scrolled");
    } else {
      document.body.classList.remove("scrolled");
    }
  };

  // Set up the intersection observer to watch all margin content
  let options = {
    // Trigger callback when the top of a margin item is 1/3 up the screen
    rootMargin: "0px 0px -33% 0px",
  };
  let tocObserver = new IntersectionObserver(hideTocCallback, options);
  // TODO: deprecate popout after v0.5.0
  const selectorClasses = [
    "marginnote",
    "sidenote",
    "margin",
    "margin-caption",
    "full-width",
    "sidebar",
    "popout",
  ];
  let marginSelector = [];
  selectorClasses.forEach((ii) => {
    // Use three permutations of each class name because `tag_` and `_` used to be supported
    marginSelector.push(
      ...[
        `.${ii}`,
        `.tag_${ii}`,
        `.${ii.replace("-", "_")}`,
        `.tag_${ii.replace("-", "_")}`,
      ],
    );
  });
  document.querySelectorAll(marginSelector.join(", ")).forEach((ii) => {
    tocObserver.observe(ii);
  });

  // Set up the observer to check if we've scrolled from top of page
  let scrollObserver = new IntersectionObserver(manageScrolledClassOnBody);
  scrollObserver.observe(document.querySelector(".sbt-scroll-pixel-helper"));
};

/**
 * Activate Thebe with a custom button click.
 */
var initThebeSBT = () => {
  var title = document.querySelector("section h1");
  var sibling = title.nextElementSibling;
  // If the next element after the title isn't a thebe button, add one now.
  // That way it is initiatlized when thebe is first-clicked and isn't re-added after.
  if (!sibling.classList.contains("thebe-launch-button")) {
    title.insertAdjacentHTML(
      "afterend",
      "<button class='thebe-launch-button'></button>",
    );
  }
  // This function is provided by sphinx-thebe
  initThebe();
};

/**
 * Add no print class to certain DOM elements
 */

function addNoPrint() {
  var noPrintSelector = [
    ".bd-header-announcement",
    ".bd-header",
    ".bd-header-article",
    ".bd-sidebar-primary",
    ".bd-sidebar-secondary",
    ".bd-footer-article",
    ".bd-footer-content",
    ".bd-footer",
  ].join(",");
  document.querySelectorAll(noPrintSelector).forEach((ii) => {
    ii.classList.add("noprint");
  });
}

/**
 * Set up callback functions for UI click actions
 */
window.initThebeSBT = initThebeSBT;
window.toggleFullScreen = toggleFullScreen;

/**
 * Add blur behavior to buttons with tooltips
 * This prevents tooltips from persisting after clicking buttons
 */
function addBlurToButtons() {
  // List of button selectors that should blur on click to dismiss tooltips
  const buttonSelectors = [
    ".theme-switch-button",
    ".search-button",
    ".primary-toggle",
    ".secondary-toggle",
  ];

  // Add blur on click for each button type
  buttonSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((button) => {
      button.addEventListener("click", () => button.blur(), true);
    });
  });
}

/**
 * Move the contents of a wide-screen sidebar into its mobile <dialog>, the same
 * way pydata-sphinx-theme does, so that sbt's article-header toggle buttons can
 * open the mobile drawer themselves. This is needed because PST only binds its
 * `.primary-toggle` / `.secondary-toggle` handlers to the *first* matching
 * element, which is the (hidden) navbar hamburger when a navbar is rendered.
 */
function moveSidebarIntoDialog(sidebar, dialog) {
  if (dialog.open) {
    return;
  }

  // Restore focus to the toggle button when the dialog closes.
  const previouslyFocused = document.activeElement;

  // Cut and paste the sidebar contents (and its classes) into the dialog.
  Array.from(sidebar.childNodes).forEach((node) => dialog.appendChild(node));
  Array.from(sidebar.classList).forEach((cls) => {
    sidebar.classList.remove(cls);
    dialog.classList.add(cls);
  });

  dialog.showModal();

  dialog.addEventListener(
    "close",
    () => {
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
    },
    { once: true },
  );
}

/**
 * Fix sidebar toggle behavior for wide screens
 * On wide screens (>= 992px), clicking the toggle should collapse the sidebar,
 * not open it as a dialog modal. The dialog behavior is only for narrow screens.
 */
function fixSidebarToggle() {
  const primaryToggle = document.getElementById("sbt-primary-sidebar-toggle");
  const primarySidebar = document.getElementById("pst-primary-sidebar");
  const primaryDialog = document.getElementById("pst-primary-sidebar-modal");

  // Fix primary sidebar toggle
  if (primaryToggle && primarySidebar && primaryDialog) {
    // Intercept clicks on the toggle button BEFORE pydata-sphinx-theme's handler
    primaryToggle.addEventListener(
      "click",
      (event) => {
        const isWideScreen = window.matchMedia("(min-width: 992px)").matches;

        // Stop pydata-sphinx-theme's own toggle handler from also firing
        event.preventDefault();
        event.stopImmediatePropagation();

        if (isWideScreen) {
          // On wide screens, toggle sidebar visibility
          primarySidebar.classList.toggle("pst-sidebar-hidden");
        } else {
          // On narrow screens, open the mobile dialog
          moveSidebarIntoDialog(primarySidebar, primaryDialog);
        }
      },
      true,
    ); // Use capture phase to run before PST's handler
  }

  const secondaryToggle = document.getElementById("sbt-secondary-sidebar-toggle");
  const secondarySidebar = document.getElementById("pst-secondary-sidebar");
  const secondaryDialog = document.getElementById("pst-secondary-sidebar-modal");

  // Fix secondary sidebar toggle
  if (secondaryToggle && secondarySidebar && secondaryDialog) {
    // Intercept clicks on the toggle button BEFORE pydata-sphinx-theme's handler
    secondaryToggle.addEventListener(
      "click",
      (event) => {
        // Stop pydata-sphinx-theme's own toggle handler from also firing
        event.preventDefault();
        event.stopImmediatePropagation();
        // Open the mobile dialog
        moveSidebarIntoDialog(secondarySidebar, secondaryDialog);
      },
      true,
    ); // Use capture phase to run before PST's handler
  }
}

/**
 * Set up functions to load when the DOM is ready
 */
sbRunWhenDOMLoaded(initTocHide);
sbRunWhenDOMLoaded(addNoPrint);
sbRunWhenDOMLoaded(addBlurToButtons);
sbRunWhenDOMLoaded(fixSidebarToggle);
