import React, { useState, useEffect, useRef } from 'react';
import { usePDF } from '@react-pdf/renderer';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CanvasPDFViewerProps {
  document: React.ReactElement;
}

export const CanvasPDFViewer: React.FC<CanvasPDFViewerProps> = ({ document }) => {
  const [instance, updateInstance] = usePDF({ document });
  const [numPages, setNumPages] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    updateInstance(document);
  }, [document, updateInstance]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  if (instance.loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/5">
        <Loader2 className="animate-spin text-black/40" size={32} />
      </div>
    );
  }

  if (instance.error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/5">
        <p className="text-red-500">Error loading PDF</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-100 flex flex-col items-center py-8 custom-scrollbar" ref={containerRef}>
      {instance.url && (
        <Document
          file={instance.url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<Loader2 className="animate-spin text-black/40 my-8" size={32} />}
          className="flex flex-col items-center gap-4"
        >
          {Array.from(new Array(numPages), (el, index) => (
            <div key={`page_${index + 1}`} className="shadow-xl bg-white">
              <Page
                pageNumber={index + 1}
                width={width > 0 ? Math.min(width - 64, 800) : undefined}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          ))}
        </Document>
      )}
    </div>
  );
};
