// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll for anchor links only (not external links)
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
        
        lastScrollTop = scrollTop;
    });

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards and download cards
    const animatedElements = document.querySelectorAll('.feature-card, .download-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Mobile menu toggle (if needed in future)
    function createMobileMenu() {
        const navLinks = document.querySelector('.nav-links');
        const navContainer = document.querySelector('.nav-container');
        
        if (window.innerWidth <= 768) {
            // Create mobile menu button if it doesn't exist
            if (!document.querySelector('.mobile-menu-toggle')) {
                const mobileMenuBtn = document.createElement('button');
                mobileMenuBtn.className = 'mobile-menu-toggle';
                mobileMenuBtn.innerHTML = '☰';
                mobileMenuBtn.style.cssText = `
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-primary);
                `;
                
                navContainer.appendChild(mobileMenuBtn);
                
                mobileMenuBtn.addEventListener('click', function() {
                    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
                    navLinks.style.position = 'absolute';
                    navLinks.style.top = '100%';
                    navLinks.style.left = '0';
                    navLinks.style.right = '0';
                    navLinks.style.background = 'white';
                    navLinks.style.flexDirection = 'column';
                    navLinks.style.padding = '1rem';
                    navLinks.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                });
            }
        } else {
            // Reset mobile menu styles on desktop
            const mobileMenuBtn = document.querySelector('.mobile-menu-toggle');
            if (mobileMenuBtn) {
                mobileMenuBtn.remove();
            }
            navLinks.style.display = 'flex';
            navLinks.style.position = 'static';
            navLinks.style.flexDirection = 'row';
            navLinks.style.padding = '0';
            navLinks.style.boxShadow = 'none';
        }
    }

    // Initialize mobile menu and handle resize
    createMobileMenu();
    window.addEventListener('resize', createMobileMenu);

    // Add hover effect to download cards
    const downloadCards = document.querySelectorAll('.download-card');
    downloadCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Copy installation command to clipboard
    const installCode = document.querySelector('.install-note code');
    if (installCode) {
        installCode.style.cursor = 'pointer';
        installCode.title = 'Click to copy';
        
        installCode.addEventListener('click', function() {
            navigator.clipboard.writeText(this.textContent).then(() => {
                const originalText = this.textContent;
                this.textContent = 'Copied!';
                this.style.background = '#10b981';
                this.style.color = 'white';
                
                setTimeout(() => {
                    this.textContent = originalText;
                    this.style.background = '';
                    this.style.color = '';
                }, 2000);
            });
        });
    }

    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Add CSS for ripple animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Track download clicks (for analytics if needed)
    const downloadLinks = document.querySelectorAll('.download-card .btn');
    downloadLinks.forEach(link => {
        link.addEventListener('click', function() {
            const platform = this.closest('.download-card').querySelector('h4').textContent;
            console.log(`Download initiated for: ${platform}`);
            // You can add analytics tracking here
        });
    });

    // Add loading animation for external links
    const externalLinks = document.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach(link => {
        link.addEventListener('click', function() {
            this.style.opacity = '0.7';
            setTimeout(() => {
                this.style.opacity = '1';
            }, 300);
        });
    });
});

// Performance optimization: Lazy load images if any are added later
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Modal functionality
function initModal() {
    const modal = document.getElementById('ios-guide-modal');
    const iosGuideLink = document.getElementById('ios-guide-link');
    const closeModalBtn = document.getElementById('close-modal');
    const modalOverlay = modal.querySelector('.modal-overlay');
    const iosGuideTriggers = document.querySelectorAll('.ios-guide-trigger');
    
    // Open modal functions
    function openModal(e) {
        e.preventDefault();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Close modal functions
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // Event listeners
    if (iosGuideLink) {
        iosGuideLink.addEventListener('click', openModal);
    }
    
    iosGuideTriggers.forEach(trigger => {
        trigger.addEventListener('click', openModal);
    });
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModal);
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

// Initialize modal
initModal();

// Initialize lazy loading
lazyLoadImages();
