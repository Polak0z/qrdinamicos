'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, Palette, LayoutTemplate, Printer, ChevronLeft, ChevronRight } from 'lucide-react';

export default function QrStudio({ url, qrName, qrSlug, currentIndex, total, onNext, onPrev }) {
  const qrRef = useRef(null);
  const cardRef = useRef(null);
  const [qrCodeStyling, setQrCodeStyling] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('template'); // 'standalone' | 'template'

  // Customization Options
  const [dotType, setDotType] = useState('rounded'); // square, dots, rounded, extra-rounded
  const [qrColor, setQrColor] = useState('#000000');
  const [cornerType, setCornerType] = useState('extra-rounded'); // square, dot, extra-rounded
  const [qrText, setQrText] = useState('');

  // Initialize QR styling instance
  useEffect(() => {
    let instance = null;
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      instance = new QRCodeStyling({
        width: 250,
        height: 250,
        type: 'svg',
        data: url,
        margin: 0,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'H'
        },
        dotsOptions: {
          color: qrColor,
          type: dotType
        },
        cornersSquareOptions: {
          color: qrColor,
          type: cornerType
        },
        cornersDotOptions: {
          color: qrColor,
          type: cornerType === 'extra-rounded' ? 'dot' : 'square'
        },
        backgroundOptions: {
          color: '#ffffff',
        }
      });
      setQrCodeStyling(instance);
    }).catch(err => console.error("Error loading QR library", err));
  }, [url]);

  // Update QR options when state changes
  useEffect(() => {
    if (!qrCodeStyling) return;
    qrCodeStyling.update({
      data: url,
      dotsOptions: { color: qrColor, type: dotType },
      cornersSquareOptions: { color: qrColor, type: cornerType },
      cornersDotOptions: { 
        color: qrColor, 
        type: cornerType === 'extra-rounded' ? 'dot' : cornerType === 'dot' ? 'dot' : 'square' 
      },
    });
  }, [qrCodeStyling, url, qrColor, dotType, cornerType]);

  // Render QR inside the ref container
  useEffect(() => {
    if (!qrCodeStyling || !qrRef.current) return;
    qrRef.current.innerHTML = '';
    qrCodeStyling.append(qrRef.current);
  }, [qrCodeStyling, activeTab]);

  // Download logic
  const downloadPng = async () => {
    const { toPng } = await import('html-to-image');
    if (cardRef.current) {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = activeTab === 'template' ? `${qrSlug}-instagram-card.png` : `${qrSlug}-qr.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const downloadPdf = async (sizeMode) => {
    if (activeTab !== 'template') return;
    const { toPng } = await import('html-to-image');
    const { jsPDF } = await import('jspdf');

    const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
    
    // Letter: 8.5 x 11 in (215.9 x 279.4 mm)
    // Half Letter: 5.5 x 8.5 in (139.7 x 215.9 mm)
    // Quarter Letter: 4.25 x 5.5 in (107.95 x 139.7 mm)
    let format = [];
    if (sizeMode === 'full') {
      format = [215.9, 279.4];
    } else if (sizeMode === 'half') {
      format = [139.7, 215.9];
    } else if (sizeMode === 'quarter') {
      format = [107.95, 139.7];
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: format
    });

    // Calculate aspect ratio to avoid stretching
    const canvasWidth = cardRef.current.offsetWidth;
    const canvasHeight = cardRef.current.offsetHeight;
    const ratio = canvasWidth / canvasHeight;

    // Use 85% of the page width to give it a nice print margin
    const maxWidth = format[0] * 0.85; 
    const maxHeight = format[1] * 0.90;
    
    let imgWidth = maxWidth;
    let imgHeight = imgWidth / ratio;
    
    if (imgHeight > maxHeight) {
      imgHeight = maxHeight;
      imgWidth = imgHeight * ratio;
    }
    
    // Center the image on the PDF page
    const x = (format[0] - imgWidth) / 2;
    const y = (format[1] - imgHeight) / 2;

    pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);
    pdf.save(`${qrSlug}-${sizeMode}-print.pdf`);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-bold text-white">Estudio QR: {qrName}</h2>
             <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-1 rounded">/r/{qrSlug}</span>
          </div>
          <p className="text-slate-400 text-sm mt-1">Personaliza y exporta tu QR.</p>
        </div>
        
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
          <button 
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'template' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutTemplate className="w-4 h-4" />
            Plantilla Instagram
          </button>
          <button 
            onClick={() => setActiveTab('standalone')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'standalone' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" />
            Solo QR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Preview Area */}
        <div className="lg:col-span-7 flex items-center justify-center p-8 bg-slate-900/50 rounded-xl border border-slate-800 relative overflow-hidden min-h-[500px]">
          
          {/* Navigation Arrows */}
          {onPrev && (
            <button onClick={onPrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-white/20 text-white rounded-full transition-all z-20" title="QR Anterior">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {onNext && (
            <button onClick={onNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-white/20 text-white rounded-full transition-all z-20" title="Siguiente QR">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Position indicator */}
          <div className="absolute top-4 right-4 bg-black/40 text-slate-300 text-xs px-3 py-1.5 rounded-full z-20 border border-white/10 font-medium">
            {currentIndex + 1} / {total}
          </div>

          {activeTab === 'template' ? (
            // Instagram Card Template
            <div 
              ref={cardRef}
              className="relative rounded-[2rem] shadow-2xl flex flex-col items-center p-8 w-[320px] bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] overflow-hidden"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(253, 29, 29, 0.3)'
              }}
            >
              <div className="mb-6 mt-4">
                <img src="/instagram-logo.svg" alt="Instagram" className="w-20 h-20 text-white" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }} />
              </div>
              <h2 
                className="text-white text-4xl font-bold mb-8 tracking-wide drop-shadow-md"
                style={{ fontFamily: 'var(--font-geist-sans)' }} // En un proyecto real usaríamos una fuente tipo billabong
              >
                Instagram
              </h2>
              
              <div className="bg-white p-2.5 rounded-2xl shadow-xl mb-8 relative z-10 flex flex-col items-center">
                <div ref={qrRef} className="w-[220px] h-[220px] rounded-xl overflow-hidden [&>svg]:w-full [&>svg]:h-full" />
              </div>

              <p className="text-white text-2xl font-bold tracking-[0.2em] mb-4 drop-shadow-md">
                FOLLOW US
              </p>
            </div>
          ) : (
            // Standalone QR
            <div ref={cardRef} className={`bg-white flex flex-col items-center justify-center ${qrText ? 'p-4 pb-3 rounded-lg' : 'p-2 rounded-sm'}`}>
              <div ref={qrRef} className="w-[250px] h-[250px] [&>svg]:w-full [&>svg]:h-full" />
              {qrText && (
                <p 
                  className="mt-1 text-black font-bold text-[28px] tracking-wide uppercase text-center" 
                  style={{ fontFamily: 'sans-serif', lineHeight: '1' }}
                >
                  {qrText}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Controls Area */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="space-y-4">
            <h3 className="text-white font-medium">Personalización del QR</h3>
            
            {/* Color Picker */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Color Principal</label>
              <div className="flex gap-2">
                {['#000000', '#833ab4', '#fd1d1d', '#fcb045', '#1d4ed8', '#15803d'].map(color => (
                  <button
                    key={color}
                    onClick={() => setQrColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${qrColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Shape Selectors */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Forma de Puntos</label>
              <select 
                value={dotType} 
                onChange={(e) => setDotType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="rounded">Suave (Rounded)</option>
                <option value="dots">Círculos (Dots)</option>
                <option value="classy">Elegante (Classy)</option>
                <option value="square">Cuadrados (Square)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Forma de Esquinas</label>
              <select 
                value={cornerType} 
                onChange={(e) => setCornerType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="extra-rounded">Extra Redondas</option>
                <option value="dot">Puntos</option>
                <option value="square">Cuadradas</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Texto bajo el QR (Opcional)</label>
              <input 
                type="text"
                value={qrText} 
                onChange={(e) => setQrText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none uppercase"
                placeholder="Ej: ESCANEAME"
                maxLength={25}
              />
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Export Actions */}
          <div className="space-y-3">
            <h3 className="text-white font-medium">Exportar</h3>
            
            <button 
              onClick={downloadPng}
              className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-all font-medium border border-white/10"
            >
              <Download className="w-4 h-4" />
              Descargar Imagen (PNG)
            </button>

            {activeTab === 'template' && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button 
                  onClick={() => downloadPdf('quarter')}
                  className="flex flex-col items-center justify-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-2 py-3 rounded-xl transition-all text-xs font-medium border border-purple-500/20"
                >
                  <Printer className="w-4 h-4 mb-1" />
                  1/4 Carta
                </button>
                <button 
                  onClick={() => downloadPdf('half')}
                  className="flex flex-col items-center justify-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-2 py-3 rounded-xl transition-all text-xs font-medium border border-purple-500/20"
                >
                  <Printer className="w-4 h-4 mb-1" />
                  Media Carta
                </button>
                <button 
                  onClick={() => downloadPdf('full')}
                  className="flex flex-col items-center justify-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-2 py-3 rounded-xl transition-all text-xs font-medium border border-purple-500/20"
                >
                  <Printer className="w-4 h-4 mb-1" />
                  Carta Completa
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
