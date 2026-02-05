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
    iframe.style.width = '728px';
    iframe.style.height = '90px';
    iframe.style.overflow = 'hidden';
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
          <script type="text/javascript">
            atOptions = {
              'key': 'df144fdd9c8a2aac845b7fa82d1f75ed',
              'format': 'iframe',
              'height': 90,
              'width': 728,
              'params': {}
            };
          </script>
          <script type="text/javascript" src="https://www.highperformanceformat.com/df144fdd9c8a2aac845b7fa82d1f75ed/invoke.js"></script>
        </body>
        </html>
      `);
      doc.close();
    }
  }, []);

  return (
    <div className="flex justify-center items-center my-6 w-full overflow-hidden">
        <div ref={containerRef} className="w-[728px] h-[90px]" />
    </div>
  );
};

export default AdBanner;
