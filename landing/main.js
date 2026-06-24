/**
 * ScholarFlow Landing Page Interactions
 */

(function () {
  'use strict';

  // Initialize Lucide icons
  lucide.createIcons();

  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  function handleScroll() {
    const currentScroll = window.scrollY;
    if (currentScroll > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Intersection Observer for reveal animations
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

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
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  // Showcase image switcher
  const showcasePoints = document.querySelectorAll('.showcase-point');
  const showcaseImage = document.getElementById('showcase-image');

  const showcaseImages = {
    desktop: 'assets/desktop-_.png',
    web: 'assets/dashboard-verify.png',
    mobile: 'assets/mobile-_.png',
  };

  function setActiveShowcase(target) {
    showcasePoints.forEach((point) => {
      if (point.dataset.target === target) {
        point.classList.add('active');
      } else {
        point.classList.remove('active');
      }
    });

    if (showcaseImages[target]) {
      showcaseImage.style.opacity = '0';
      showcaseImage.style.transform = 'scale(0.98)';

      setTimeout(() => {
        showcaseImage.src = showcaseImages[target];
        showcaseImage.onload = () => {
          showcaseImage.style.opacity = '1';
          showcaseImage.style.transform = 'scale(1)';
        };
      }, 250);
    }
  }

  showcasePoints.forEach((point) => {
    point.addEventListener('click', () => {
      setActiveShowcase(point.dataset.target);
    });

    point.addEventListener('mouseenter', () => {
      setActiveShowcase(point.dataset.target);
    });
  });

  // Auto-rotate showcase on mobile
  let showcaseAutoRotate;
  const targets = ['desktop', 'web', 'mobile'];
  let currentTargetIndex = 0;

  function startAutoRotate() {
    if (showcaseAutoRotate) return;
    showcaseAutoRotate = setInterval(() => {
      currentTargetIndex = (currentTargetIndex + 1) % targets.length;
      setActiveShowcase(targets[currentTargetIndex]);
    }, 5000);
  }

  function stopAutoRotate() {
    if (showcaseAutoRotate) {
      clearInterval(showcaseAutoRotate);
      showcaseAutoRotate = null;
    }
  }

  // Start auto-rotate only on touch devices or small screens
  if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024) {
    startAutoRotate();
  }

  // Pause auto-rotate on hover
  const showcaseSection = document.getElementById('showcase');
  if (showcaseSection) {
    showcaseSection.addEventListener('mouseenter', stopAutoRotate);
    showcaseSection.addEventListener('mouseleave', () => {
      if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024) {
        startAutoRotate();
      }
    });
  }

  // Smooth reveal lazy images
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  lazyImages.forEach((img) => {
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'));
    }
  });

  // 3D tilt effect for hero image (desktop only)
  const heroImageTilt = document.querySelector('.hero-image-tilt');
  const perspectiveContainer = document.querySelector('.perspective-container');

  if (heroImageTilt && perspectiveContainer && window.matchMedia('(pointer: fine)').matches) {
    perspectiveContainer.addEventListener('mousemove', (e) => {
      const rect = perspectiveContainer.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const rotateY = (x - 0.5) * 12;
      const rotateX = (0.5 - y) * 8;

      heroImageTilt.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
    });

    perspectiveContainer.addEventListener('mouseleave', () => {
      heroImageTilt.style.transform = 'rotateY(-8deg) rotateX(4deg)';
    });
  }

  // Re-initialize icons after dynamic content changes
  window.addEventListener('load', () => {
    lucide.createIcons();
  });
})();
