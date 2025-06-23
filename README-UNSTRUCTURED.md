# Unstructured-IO Implementation

## Overview

We've implemented **Unstructured-IO** as a self-hosted Docker service for advanced document processing. This powerful tool provides:

- ✅ **Text extraction** from PDFs, Word docs, PowerPoint, Excel
- ✅ **Table extraction** with structure recognition
- ✅ **Image detection** and OCR support
- ✅ **Layout-aware processing** (headers, sections, lists)
- ✅ **Metadata extraction** with coordinates
- ✅ **Construction document optimization**

## Quick Start

### 1. Start the Service

```bash
# Start Unstructured-IO service
./start-unstructured.sh
```

The service will be available at:

- **API**: http://localhost:8000
- **Health Check**: http://localhost:8000/healthcheck
- **API Docs**: http://localhost:8000/docs

### 2. Environment Variables

Add to your `.env` file:

```bash
# Unstructured-IO Configuration
UNSTRUCTURED_API_URL=http://localhost:8000
UNSTRUCTURED_API_KEY=your-api-key-here
```

### 3. Install Dependencies

```bash
cd packages/worker
pnpm install
```

### 4. Test the Integration

Upload a construction document through your PIP AI interface. The system will automatically:

1. **Try Unstructured-IO first** for comprehensive processing
2. **Fallback to PDF.js** if Unstructured service is unavailable
3. **Enhance text** with construction-specific analysis

## Features

### Enhanced Document Processing

The system now extracts:

- **Structured Text**: Headers, paragraphs, lists with proper hierarchy
- **Tables**: Complete table extraction with HTML formatting
- **Images**: Diagram detection with OCR capabilities
- **Layout Information**: Document structure and organization
- **Metadata**: Page numbers, coordinates, element relationships

### Construction Document Optimization

Special handling for construction documents:

- **Trade Detection**: Automatic identification of construction trades
- **Material Recognition**: Building material identification
- **Table Processing**: Schedule and specification table extraction
- **Diagram Analysis**: Blueprint and plan recognition
- **CSI Division Mapping**: MasterFormat classification

### Processing Methods

The system uses a smart fallback strategy:

1. **Unstructured-IO** (Primary): Full-featured processing
2. **PDF.js** (Fallback): Legacy PDF processing
3. **Mock Analysis** (Emergency): Placeholder content

## Architecture

### Files Created/Modified

```
├── docker-compose.unstructured.yml    # Docker service configuration
├── packages/worker/src/
│   ├── unstructured-client.ts         # Unstructured-IO client
│   └── activities.ts                  # Enhanced processing activities
├── start-unstructured.sh              # Service startup script
├── stop-unstructured.sh               # Service shutdown script
└── README-UNSTRUCTURED.md             # This documentation
```

### Integration Points

1. **Worker Activities**: Enhanced `extractTextActivity` with Unstructured-IO
2. **Document Processing**: Smart fallback from Unstructured → PDF.js → Mock
3. **Construction Analysis**: Enhanced metadata and structure recognition
4. **API Interface**: RESTful integration with health monitoring

## Usage Examples

### Basic Document Processing

```typescript
import { createUnstructuredClient } from "./unstructured-client";

const client = createUnstructuredClient();
const result = await client.processDocument("/path/to/document.pdf", {
  strategy: "hi_res",
  extractImages: true,
  extractTables: true,
  coordinates: true,
});

console.log(
  `Extracted ${result.tables.length} tables and ${result.images.length} images`
);
```

### Construction Document Analysis

The enhanced processing automatically:

- Detects construction trades and materials
- Extracts specification tables
- Identifies blueprint elements
- Generates structured metadata
- Provides CSI division mappings

### Table Extraction

```typescript
// Tables are automatically extracted with:
result.tables.forEach((table) => {
  console.log(`Page ${table.pageNumber}:`);
  console.log(table.html); // HTML table format
  console.log(table.text); // Plain text version
});
```

## Management Commands

### Start Service

```bash
./start-unstructured.sh
```

### Stop Service

```bash
./stop-unstructured.sh
```

### Check Service Status

```bash
curl http://localhost:8000/healthcheck
```

### View Logs

```bash
docker-compose -f docker-compose.unstructured.yml logs -f
```

### Restart Service

```bash
./stop-unstructured.sh && ./start-unstructured.sh
```

## Troubleshooting

### Service Won't Start

1. **Check Docker**: Ensure Docker is running
2. **Port Conflicts**: Make sure port 8000 is available
3. **Permissions**: Ensure scripts are executable (`chmod +x *.sh`)

### Processing Failures

The system automatically handles failures:

1. **Unstructured Unavailable**: Falls back to PDF.js processing
2. **PDF.js Fails**: Uses mock construction content
3. **Network Issues**: Implements retry logic with timeouts

### Performance Optimization

- **Hi-res Strategy**: Best quality for construction documents
- **Parallel Processing**: Multiple documents handled concurrently
- **Smart Caching**: Avoids reprocessing identical documents
- **Memory Management**: Automatic cleanup and garbage collection

## Supported File Types

### Fully Supported (Unstructured-IO)

- PDF, Word (docx/doc), PowerPoint (pptx/ppt)
- Excel (xlsx/xls), HTML, XML, Text, Markdown
- Images (PNG, JPG, JPEG, TIFF, BMP, HEIC) with OCR

### Legacy Support (PDF.js)

- PDF files only
- Basic text extraction
- No table or image processing

## Configuration Options

### Processing Strategies

- `fast`: Quick processing, lower quality
- `hi_res`: High quality, slower processing (recommended for construction)
- `auto`: Automatic strategy selection

### Feature Toggles

- `extractImages`: Enable image detection and OCR
- `extractTables`: Enable table structure recognition
- `coordinates`: Include element positioning data
- `includePage`: Add page break information

## Next Steps

1. **Monitor Performance**: Check processing times and success rates
2. **Optimize Settings**: Adjust strategies based on document types
3. **Extend Features**: Consider OCR improvements and specialized parsers
4. **Scale Horizontally**: Add more Unstructured-IO instances if needed

## Support

For issues or questions:

1. Check service logs: `docker-compose -f docker-compose.unstructured.yml logs`
2. Verify health: `curl http://localhost:8000/healthcheck`
3. Review worker logs for processing details
4. Test with sample documents to isolate issues

---

**Unstructured-IO is now fully integrated and ready for production use!** 🚀
