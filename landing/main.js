/**
 * ScholarFlow Landing Page Interactions
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Navbar scroll effect
  const navbar = document.getElementById('navbar');

  function handleScroll() {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Mobile menu
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuOpenIcon = mobileMenuToggle?.querySelector('.menu-open-icon');
  const menuCloseIcon = mobileMenuToggle?.querySelector('.menu-close-icon');
  const mobileNavLinks = mobileMenu?.querySelectorAll('.mobile-nav-link');

  function openMobileMenu() {
    if (!mobileMenu || !mobileMenuToggle) return;
    mobileMenu.classList.remove('hidden');
    mobileMenuToggle.setAttribute('aria-expanded', 'true');
    menuOpenIcon?.classList.add('hidden');
    menuCloseIcon?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    if (!mobileMenu || !mobileMenuToggle) return;
    mobileMenu.classList.add('hidden');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
    menuOpenIcon?.classList.remove('hidden');
    menuCloseIcon?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function toggleMobileMenu() {
    const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener('click', toggleMobileMenu);

    mobileNavLinks?.forEach((link) => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenuToggle.getAttribute('aria-expanded') === 'true') {
        closeMobileMenu();
      }
    });

    document.addEventListener('click', (e) => {
      if (
        mobileMenuToggle.getAttribute('aria-expanded') === 'true' &&
        !mobileMenu.contains(e.target) &&
        !mobileMenuToggle.contains(e.target)
      ) {
        closeMobileMenu();
      }
    });
  }

  // Intersection Observer for reveal animations
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  const revealFallbackTimer = setTimeout(() => {
    revealElements.forEach((el) => el.classList.add('revealed'));
  }, 800);

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -30px 0px',
      }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add('revealed'));
    clearTimeout(revealFallbackTimer);
  }

  // Showcase image (desktop only)
  const showcaseImage = document.getElementById('showcase-image');

  if (showcaseImage) {
    const img = new Image();
    img.onload = () => {
      showcaseImage.src = 'assets/desktop-_.png';
      if (!prefersReducedMotion) {
        showcaseImage.animate(
          [{ opacity: 0.8, transform: 'scale(0.99)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: 300, easing: 'ease-out' }
        );
      }
    };
    img.src = 'assets/desktop-_.png';
  }

  // Smooth reveal lazy images
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  lazyImages.forEach((img) => {
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'));
      img.addEventListener('error', () => img.classList.add('loaded'));
    }
  });

  // Back to top button
  const backToTop = document.getElementById('back-to-top');

  function handleBackToTopVisibility() {
    if (!backToTop) return;
    if (window.scrollY > 400) {
      backToTop.classList.remove('opacity-0', 'pointer-events-none');
    } else {
      backToTop.classList.add('opacity-0', 'pointer-events-none');
    }
  }

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });

    window.addEventListener('scroll', handleBackToTopVisibility, { passive: true });
    handleBackToTopVisibility();
  }

  // Re-initialize icons after dynamic content changes
  window.addEventListener('load', () => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  });
});
