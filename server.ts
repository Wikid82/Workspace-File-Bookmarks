import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API endpoint for AI Customization of Extension code
  app.post('/api/customize-extension', async (req, res) => {
    try {
      const { featurePrompt, existingFiles } = req.body;
      if (!featurePrompt) {
        return res.status(400).json({ error: 'featurePrompt is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in server environment.' });
      }

      const ai = new GoogleGenAI({ apiKey });

      const filesContext = existingFiles
        ? existingFiles.map((f: any) => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n')
        : '';

      const prompt = `You are a VS Code Extension Architect.
The user wants to add/customize the following feature in their VS Code Multi-Repo Bookmark extension:
"${featurePrompt}"

Existing extension files:
${filesContext}

Provide updated extension files in JSON format.
Return ONLY valid JSON matching this structure:
{
  "updatedFiles": [
    {
      "path": "package.json" | "src/extension.ts" | "src/bookmarkTreeProvider.ts" | "src/bookmarkManager.ts" | etc.,
      "language": "json" | "typescript" | "markdown",
      "description": "Short explanation of changes",
      "content": "Full updated content of the file"
    }
  ],
  "summary": "Clear, friendly explanation of how this feature was added to the extension code"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);

      return res.json({
        success: true,
        updatedFiles: parsed.updatedFiles || [],
        summary: parsed.summary || 'Extension code updated successfully.'
      });
    } catch (err: any) {
      console.error('Error customizing extension:', err);
      return res.status(500).json({ error: err.message || 'Failed to process AI customization.' });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
