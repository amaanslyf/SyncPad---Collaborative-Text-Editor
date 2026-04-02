import html2pdf from 'html2pdf.js';
// @ts-expect-error - missing types
import htmlToDocx from 'html-to-docx';

/**
 * Service to handle document exports (PDF and Word).
 * Converts HTML from Tiptap into downloadable files.
 */
export const exportService = {
  /**
   * Exports HTML content to PDF.
   * @param html - Document's HTML content.
   * @param title - Filename title.
   */
  async exportToPdf(html: string, title: string) {
    const filename = `${title.replace(/[/\\?%*:|"<>]/g, '-') || 'Untitled'}.pdf`;

    const opt = {
      margin: [15, 15] as [number, number],
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as string[] }
    };

    // Create a temporary container for styling
    const container = document.createElement('div');
    container.innerHTML = html;
    
    // Apply print-friendly styles to the container
    container.className = 'export-pdf-container';
    Object.assign(container.style, {
      padding: '20px',
      color: '#000',
      backgroundColor: '#fff',
      fontSize: '14px',
      lineHeight: '1.6',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    // Add extra CSS to elements within container
    const h1s = container.querySelectorAll('h1');
    h1s.forEach(h => {
      h.style.fontSize = '24px';
      h.style.marginBottom = '20px';
      h.style.color = '#1a1a1a';
    });

    try {
      await html2pdf().set(opt).from(container).save();
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  },

  /**
   * Exports HTML content to Word (.docx).
   * @param html - Document's HTML content.
   * @param title - Filename title.
   */
  async exportToWord(html: string, title: string) {
    const filename = `${title.replace(/[/\\?%*:|"<>]/g, '-') || 'Untitled'}.docx`;

    try {
      // Create a full HTML document structure for better conversion
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; }
              h1 { font-size: 16pt; margin-bottom: 12pt; }
              h2 { font-size: 14pt; margin-top: 12pt; margin-bottom: 6pt; }
              p { margin-bottom: 10pt; }
              ul, ol { margin-bottom: 10pt; }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `;

      const blob = await htmlToDocx(fullHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });

      // Browser download mechanism
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Word export failed:', error);
      throw new Error('Failed to generate Word document. Please try again.');
    }
  }
};
