import React, { useEffect, useRef } from 'react';

export const AdBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.title = "Advertisement";
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.scrolling = 'no';

    container.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; }
          </style>
        </head>
        <body>
          <script async="async" data-cfasync="false" src="https://pl28656828.effectivegatecpm.com/0a4c70278b2a73821591a01dd5adfbfa/invoke.js"></script>
          <div id="container-0a4c70278b2a73821591a01dd5adfbfa"></div>
        </body>
        </html>
      `);
      doc.close();
    }
  }, []);

  return (
    <div style={{ minHeight: '0' }} className='grid md:grid-cols-2 gap-4 md:gap-6 w-full mx-auto mt-4 md:mt-6 mb-6 font-mono'>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

// export default AdBanner;
