import React, { useEffect } from 'react';

// Preload components on route hover/focus for better user experience
const RoutePreloader = () => {
  useEffect(() => {
    // Preload critical test management components when user is likely to navigate to them
    const preloadComponents = () => {
      // Preload on dashboard load (common navigation paths)
      if (window.location.pathname === '/dashboard') {
        // Preload CreateTest component (most commonly used)
        import('../pages/CreateTest').catch(() => {});
        // Preload Reports component (second most common)
        setTimeout(() => {
          import('../pages/Reports').catch(() => {});
        }, 1000);
      }
    };

    // Add event listeners for link hover to preload components
    const addPreloadListeners = () => {
      const links = document.querySelectorAll('a[href^="/create-test"], a[href^="/reports"], a[href^="/evaluators"]');
      
      links.forEach(link => {
        link.addEventListener('mouseenter', () => {
          const href = link.getAttribute('href');
          if (href?.includes('/create-test') || href?.includes('/edit-test')) {
            import('../pages/CreateTest').catch(() => {});
          } else if (href?.includes('/reports')) {
            import('../pages/Reports').catch(() => {});
          } else if (href?.includes('/evaluators')) {
            import('../pages/EvaluatorManagement').catch(() => {});
          }
        }, { once: true });
      });
    };

    preloadComponents();
    
    // Re-run when DOM changes (for dynamically added links)
    const observer = new MutationObserver(addPreloadListeners);
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Initial setup
    addPreloadListeners();

    return () => {
      observer.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything
};

export default RoutePreloader;