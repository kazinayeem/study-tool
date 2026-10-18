/**
 * Minimal pure-TypeScript standard PDF 1.4 generator
 * Creates valid multi-page searchable PDFs without external binary dependencies.
 */
export function createSamplePdf(title: string, pages: Array<{ heading: string; lines: string[] }>): Buffer {
  const objects: string[] = [];
  
  function addObject(content: string): number {
    objects.push(content);
    return objects.length; // 1-based index
  }

  // Object 1: Catalog (will fill later)
  // We'll prepare object definitions
  const pageObjectIds: number[] = [];
  
  // Font object will be added
  const fontObjId = 3 + pages.length * 2; // Approximate, let's build deterministically
  
  // Build pages
  // Obj 1: Catalog
  // Obj 2: Pages
  // Then for each page: Page object + Content stream object
  // Then Font object
  
  const totalPages = pages.length;
  // page objects will be 3, 5, 7... and streams 4, 6, 8...
  // Font object at 3 + totalPages * 2
  const fontId = 3 + totalPages * 2;
  
  const pageRefs: string[] = [];
  for (let i = 0; i < totalPages; i++) {
    const pageObjNum = 3 + i * 2;
    pageRefs.push(`${pageObjNum} 0 R`);
  }

  const catalogObj = `<< /Type /Catalog /Pages 2 0 R >>`;
  const pagesObj = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${totalPages} >>`;
  
  const pageEntries: Array<{ pageObj: string; streamObj: string }> = [];
  
  for (let i = 0; i < totalPages; i++) {
    const streamObjNum = 4 + i * 2;
    const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${streamObjNum} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
    
    // Construct stream content
    let streamText = `BT\n/F1 18 Tf\n50 730 Td\n(${escapePdfText(pages[i].heading)}) Tj\n`;
    streamText += `/F1 11 Tf\n0 -30 Td\n`;
    
    for (const line of pages[i].lines) {
      streamText += `(${escapePdfText(line)}) Tj\n0 -20 Td\n`;
    }
    streamText += `ET\n`;

    const streamObj = `<< /Length ${Buffer.byteLength(streamText, 'utf8')} >>\nstream\n${streamText}endstream`;
    pageEntries.push({ pageObj, streamObj });
  }

  const fontObj = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  const allObjs: string[] = [
    catalogObj,
    pagesObj,
  ];

  for (const p of pageEntries) {
    allObjs.push(p.pageObj);
    allObjs.push(p.streamObj);
  }
  allObjs.push(fontObj);

  let pdf = `%PDF-1.4\n%âãÏÓ\n`;
  const offsets: number[] = [];

  for (let i = 0; i < allObjs.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${i + 1} 0 obj\n${allObjs[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${allObjs.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${allObjs.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}
