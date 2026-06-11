import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Error handling middleware for JSON entity size limits
app.use((err: any, req: any, res: any, next: any) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'O arquivo é muito grande. O limite máximo permitido para upload é de 50MB.' });
  }
  if (err) {
    console.error("JSON parsing/body limit error:", err);
    return res.status(400).json({ error: 'Requisito inválido.' });
  }
  next();
});

const PORT = 3000;

// Guidelines Directory Setup (utilizing /tmp/guidelines for writeability in read-only and server environments like Cloud Run)
const GUIDELINES_DIR = path.join('/tmp', 'guidelines');
if (!fs.existsSync(GUIDELINES_DIR)) {
  fs.mkdirSync(GUIDELINES_DIR, { recursive: true });
}

function getPdfPageCountFromBuffer(buffer: Buffer): number {
  try {
    const content = buffer.toString('binary');
    const regex = /\/Count\s+(\d+)/g;
    let match;
    let maxPages = 0;
    while ((match = regex.exec(content)) !== null) {
      const count = parseInt(match[1], 10);
      if (count > maxPages) {
        maxPages = count;
      }
    }
    return maxPages;
  } catch (err) {
    console.error("Error reading PDF pages from buffer:", err);
    return 0;
  }
}

function getPdfPageCount(filePath: string): number {
  try {
    if (!fs.existsSync(filePath)) return 0;
    const buffer = fs.readFileSync(filePath);
    return getPdfPageCountFromBuffer(buffer);
  } catch (err) {
    console.error("Error reading PDF page count:", err);
    return 0;
  }
}

async function extractPdfTextWithPDFParse(buffer: Buffer): Promise<string> {
  const parser = new pdfParseModule.PDFParse(new Uint8Array(buffer));
  try {
    await parser.load();
    const result = await parser.getText();
    return result.text || '';
  } catch (err) {
    console.error("Error extracting text via PDFParse:", err);
    throw err;
  } finally {
    try {
      await parser.destroy();
    } catch (_) {}
  }
}

function retrieveGlobalRelevantChunks(
  documents: { source: string, text: string }[],
  queryText: string,
  maxTotalChars: number = 300000,
  outConsulted?: { source: string; snippet: string; score: number }[]
): string {
  if (documents.length === 0) return "Nenhum livro ou diretriz de referência disponível.";

  const chunkSize = 8000;
  const overlap = 1000;
  const allChunks: { source: string; text: string; score: number; index: number; globalIndex: number }[] = [];
  
  let globalIdx = 0;
  for (const doc of documents) {
    if (!doc.text) continue;
    const fullText = doc.text;
    let i = 0;
    let chunkIdx = 0;
    while (i < fullText.length) {
      const chunkText = fullText.substring(i, i + chunkSize);
      allChunks.push({
        source: doc.source,
        text: chunkText,
        score: 0,
        index: chunkIdx++,
        globalIndex: globalIdx++
      });
      i += chunkSize - overlap;
    }
  }

  const keywords = queryText.toLowerCase()
    .replace(/[^\w\sáéíóúçãõâêîôûàèìòù]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3);

  console.log(`[GLOBAL RAG] Matching query keywords:`, keywords);

  if (keywords.length === 0) {
    let accumulated = '';
    const budgetPerDoc = Math.floor(maxTotalChars / Math.max(1, documents.length));
    for (const doc of documents) {
      accumulated += `\n--- [Livro: ${doc.source} (Início)] ---\n${doc.text.substring(0, budgetPerDoc)}\n`;
    }
    return accumulated;
  }

  // Score each chunk matching keywords
  for (const chunk of allChunks) {
    const lower = chunk.text.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      let pos = lower.indexOf(kw);
      while (pos !== -1) {
        score += 1;
        pos = lower.indexOf(kw, pos + kw.length);
      }
    }
    chunk.score = score;
  }

  // Sort globally by score descending
  const scoredChunks = [...allChunks].sort((a, b) => b.score - a.score);

  const selectedChunks: typeof allChunks = [];
  let totalLength = 0;
  for (const chunk of scoredChunks) {
    if (chunk.score === 0 && selectedChunks.length > 5) {
      break;
    }
    if (totalLength + chunk.text.length > maxTotalChars) {
      break;
    }
    selectedChunks.push(chunk);
    totalLength += chunk.text.length;
  }

  if (outConsulted) {
    for (const chunk of selectedChunks) {
      if (chunk.score > 0) {
        outConsulted.push({
          source: chunk.source,
          snippet: chunk.text,
          score: chunk.score
        });
      }
    }
  }

  // Sort chronologically/sequentially by book order and then relative index
  selectedChunks.sort((a, b) => {
    if (a.source !== b.source) {
      return a.source.localeCompare(b.source);
    }
    return a.index - b.index;
  });

  const groupedBySource: Record<string, string[]> = {};
  for (const chunk of selectedChunks) {
    if (!groupedBySource[chunk.source]) {
      groupedBySource[chunk.source] = [];
    }
    groupedBySource[chunk.source].push(chunk.text);
  }

  let finalContext = '';
  for (const [source, texts] of Object.entries(groupedBySource)) {
    finalContext += `\n=========================================\n`;
    finalContext += `FONTE DE REFERÊNCIA: ${source}\n`;
    finalContext += `TRECHOS EXTRAÍDOS ALTAMENTE RELEVANTES SELECIONADOS POR RAG:\n`;
    finalContext += `=========================================\n`;
    finalContext += texts.join('\n... [Corte de Contexto - Trecho Omitido] ...\n');
    finalContext += `\n`;
  }

  console.log(`[GLOBAL RAG] Selected ${selectedChunks.length} chunks across ${Object.keys(groupedBySource).length} documents totaling ${totalLength} characters.`);
  return finalContext || "Nenhuma informação perfeitamente correspondente localizada.";
}

function retrieveRelevantChunks(fullText: string, queryText: string, maxChars: number = 50000): string {
  return retrieveGlobalRelevantChunks([{ source: 'Documento', text: fullText }], queryText, maxChars);
}

// Read reference files from both bundled guidelines directory and the writable /tmp upload folder
async function getAdminGuidelinesFiles(userQuery?: string, outConsulted?: any[]): Promise<any[]> {
  const parts: any[] = [];
  const dirs = [
    path.join(process.cwd(), 'guidelines'),
    GUIDELINES_DIR
  ];

  const loadedNames = new Set<string>();
  const textDocuments: { source: string; text: string }[] = [];
  const imageParts: any[] = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile() && !file.startsWith('.')) {
          const ext = path.extname(file).toLowerCase();
          const safeName = file.toLowerCase();
          if (loadedNames.has(safeName)) continue;
          
          loadedNames.add(safeName);
          const buffer = fs.readFileSync(filePath);
          
          if (ext === '.pdf') {
            // Unify all PDFs: extract text as cache to run highly optimized, rapid-response RAG searches
            const cacheDir = path.join(GUIDELINES_DIR, 'cache-txt');
            if (!fs.existsSync(cacheDir)) {
              fs.mkdirSync(cacheDir, { recursive: true });
            }
            const cachePath = path.join(cacheDir, `${file}.txt`);
            
            let textContent = '';
            if (fs.existsSync(cachePath)) {
              textContent = fs.readFileSync(cachePath, 'utf8');
              console.log(`[RAG] Loaded extracted text for PDF '${file}' from cache.`);
            } else {
              const pageCount = getPdfPageCountFromBuffer(buffer);
              console.log(`[RAG] First-time extraction started for PDF '${file}' (${pageCount} pages)...`);
              const startTime = Date.now();
              try {
                textContent = await extractPdfTextWithPDFParse(buffer);
                fs.writeFileSync(cachePath, textContent, 'utf8');
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`[RAG] Successfully extracted and cached text for '${file}' in ${elapsed}s.`);
              } catch (err) {
                console.error(`[RAG] Failed to extract text for PDF '${file}':`, err);
              }
            }
            
            if (textContent) {
              textDocuments.push({ source: file, text: textContent });
            }
            continue;
          }
          
          if (ext === '.txt') {
            const textContent = buffer.toString('utf8');
            textDocuments.push({ source: file, text: textContent });
            continue;
          }

          if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
            const data = buffer.toString('base64');
            let mimeType = 'image/jpeg';
            if (ext === '.png') mimeType = 'image/png';
            imageParts.push({
              inlineData: {
                data,
                mimeType
              }
            });
            console.log(`Loaded guideline image: ${file}`);
          }
        }
      }
    } catch (err) {
      console.error(`Error reading directory ${dir}:`, err);
    }
  }

  // Query across all textbooks & guidelines with collective RAG budget
  if (textDocuments.length > 0) {
    if (userQuery) {
      console.log(`[GLOBAL RAG] Executing unified context search across ${textDocuments.length} textbooks for query.`);
      const matchedContext = retrieveGlobalRelevantChunks(textDocuments, userQuery, 60000, outConsulted); // 60k chars absolute budget for fast performance and low token consumption
      parts.push({
        text: `CONTEÚDO ACADÊMICO RELEVANTE EXTRAÍDO DOS LIVROS E DIRETRIZES CLÍNICAS DE REFERÊNCIA:\n${matchedContext}`
      });
    } else {
      console.log(`[GLOBAL RAG] Loading default subset preview for empty query.`);
      let defaultContext = '';
      for (const doc of textDocuments) {
        defaultContext += `\n--- LIVRO: ${doc.source} ---\n${doc.text.substring(0, 15000)}\n`;
      }
      parts.push({
        text: `DIRETRIZES DE EMBASAMENTO CLÍNICO:\n${defaultContext.substring(0, 45000)}`
      });
    }
  }

  // Inject image visual attachments
  parts.push(...imageParts);

  return parts;
}

// Gemini Initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY as string,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

interface GenerateContentParams {
  model?: string;
  contents: any;
  config?: any;
}

// Robust fallback and retry wrapper to safely route queries when a specific model experiences transient high demand
async function generateContentWithFallback(params: GenerateContentParams): Promise<any> {
  const modelsToTry = [
    params.model || 'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite'
  ];
  
  const uniqueModels = Array.from(new Set(modelsToTry));
  let lastError: any = null;
  
  for (const modelName of uniqueModels) {
    try {
      console.log(`[GEMINI] Attempting generateContent with model: ${modelName}`);
      const response = await ai.models.generateContent({
        ...params,
        model: modelName
      });
      console.log(`[GEMINI] Successful generation with model: ${modelName}`);
      return response;
    } catch (err: any) {
      console.warn(`[GEMINI] Model "${modelName}" returned error/high demand:`, err.message || err);
      lastError = err;
      
      const isFatal = 
        err.message?.includes('API_KEY_INVALID') || 
        err.status === 'INVALID_ARGUMENT' || 
        err.message?.includes('invalid character') ||
        err.status === 'PERMISSION_DENIED';
        
      if (isFatal) {
        console.error(`[GEMINI] Got fatal error, skipping other fallbacks.`);
        throw err;
      }
    }
  }
  
  throw lastError;
}

// Firebase Server-Side Initialization
let db: any = null;
try {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || firebaseConfig.databaseId);
    console.log("Firebase initialized successfully on backend server.");
  }
} catch (err) {
  console.error("Failed to initialize Firebase on server:", err);
}

// Mock Clinical Knowledge Base (RAG Simulation based on premium veterinary references)
const MEDICAL_GUIDELINES = [
  {
    topic: "Bioquímica Renal em Cães [Nelson & Couto, Medicina Interna de Pequenos Animais, Capítulo 38: Insuficiência Renal, pág. 620-635]",
    content: "Valores de referência para Ureia: 15-40 mg/dL. Creatinina: 0.5-1.5 mg/dL. Elevações concomitantes de Creatinina e Ureia sugerem azotemia de origem renal se a densidade urinária estiver baixa (<1.030), necessitando de hemograma completo, urinálise e ultrassonografia abdominal para descartar nefropatia crônica ou lesão renal aguda."
  },
  {
    topic: "Enzimas Hepáticas Felinas [Nelson & Couto, Medicina Interna de Pequenos Animais, Capítulo 45: Hepatopatias Felinas, pág. 782-790]",
    content: "ALT (Alanina Aminotransferase) acima de 100 U/L em gatos indica dano hepatocelular agudo ou crônico. Diferenciar de lipidose hepática se houver icterícia acentuada e FA (Fosfatase Alcalina) desproporcionalmente alta, ou de colangite neutrofílica se houver febre concomitante."
  },
  {
    topic: "Obstrução Digestiva e Gastroenterites [Fossum, Cirurgia de Pequenos Animais, Capítulo 18: Cirurgia do Sistema Estomacal e Intestinal, pág. 340-355]",
    content: "Vômitos frequentes por mais de 48h associados a apatia e anorexia exigem triagem diagnóstica por imagem (ultrassom ou radiografia simples e contrastada) para descartar obstrução por corpo estranho ou intussuscepção. Antibioticoterapia profilática deve ser avaliada com base na integridade da barreira mucosa."
  },
  {
    topic: "Diretrizes de Manejo de Dor em Cães [WSAVA Pain Management Guidelines, Seção de Analgesia Preventiva, pág. 12-18]",
    content: "O controle ágil da dor deve combinar opioides de ação rápida (Buprenorfina ou Metadona) com anti-inflamatórios não esteroidais (AINEs como Carprofeno ou Meloxicam), desde que a função renal e a integridade gastrointestinal estejam preservadas."
  },
  {
    topic: "Tratamento de Cardiomiopatia Dilatada [ACVIM Consensus Statement on Canine Dilated Cardiomyopathy, pág. 8-14]",
    content: "O uso precoce de maleato de enalapril ou benazepril associado ao pimobendan prolonga significativamente o tempo de sobrevida em cães com cardiomiopatia dilatada em estágio pré-clínico (Estágio B2)."
  },
  {
    topic: "Hérnia Perineal em Cães [Fossum, Cirurgia de Pequenos Animais, Capítulo 19: Cirurgia do Sistema Hemolinfático e Perineal, pág. 480-492]",
    content: "A hérnia perineal resulta da falha ou fraqueza do diafragma pélvico (músculos elevador do ânus, coccígeo e obturador interno), gerando desvio ou dilatação retal (divertículo retal), tenesmo, disquezia, dor ao evacuar e fezes achatadas em formato de fita (fitiformes). Ocorre principalmente em cães machos inteiros com predisposição em raças como Shih Tzu, Boxer, Poodle e Pequenez de meia-idade a idosos. O aumento de volume perianal/perineal unilateral ou bilateral pode ser acompanhado de hiperestesia perineal de severa a moderada e pode haver encarceramento de bexiga ou próstata. O tratamento cirúrgico definitivo (rafia perineal ou transposição de músculo obturador interno) é altamente indicado."
  }
];

// Combine static guidelines with dynamic Firestore collections
async function getFullGuidelines() {
  const list = [...MEDICAL_GUIDELINES];
  if (!db) return list;
  try {
    const querySnapshot = await getDocs(collection(db, 'guidelines'));
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.title && data.content) {
        list.push({
          topic: `${data.title} [${data.source || 'Banco Customizado'}]`,
          content: data.content
        });
      }
    });
  } catch (err) {
    console.warn("Could not load dynamic guidelines from firestore:", err);
  }
  return list;
}

// Admin Endpoints for PDF Guidelines Files
const CHUNKS_DIR = path.join('/tmp', 'guidelines-chunks');
if (!fs.existsSync(CHUNKS_DIR)) {
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

app.post('/api/admin/upload-guideline-pdf-chunk', (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, name, data } = req.body;
    if (!uploadId || chunkIndex === undefined || !totalChunks || !name || !data) {
      return res.status(400).json({ error: 'Faltam dados do chunk.' });
    }
    
    const safeName = path.basename(name);
    const chunkFolder = path.join(CHUNKS_DIR, uploadId);
    if (!fs.existsSync(chunkFolder)) {
      fs.mkdirSync(chunkFolder, { recursive: true });
    }
    
    const chunkPath = path.join(chunkFolder, `chunk_${chunkIndex}`);
    fs.writeFileSync(chunkPath, data); // store base64 slice
    
    // Check if we have all chunks
    const files = fs.readdirSync(chunkFolder);
    if (files.length === totalChunks) {
      // Assemble all pieces!
      let fullBase64 = '';
      for (let i = 0; i < totalChunks; i++) {
        const piecePath = path.join(chunkFolder, `chunk_${i}`);
        if (!fs.existsSync(piecePath)) {
          // Some piece is missing, wait for it to arrive
          return res.json({ success: true, status: 'waiting', chunkIndex });
        }
        fullBase64 += fs.readFileSync(piecePath, 'utf8');
      }
      
      const filePath = path.join(GUIDELINES_DIR, safeName);
      const buffer = Buffer.from(fullBase64, 'base64');
      fs.writeFileSync(filePath, buffer);
      
      // Clean up the temp folder for chunks
      try {
        fs.rmSync(chunkFolder, { recursive: true, force: true });
      } catch (err) {
        console.warn('Failed to clean chunk folder:', err);
      }
      
      console.log(`Saved assembled guidelines PDF successfully: ${safeName} in writeable container directory`);
      return res.json({ success: true, name: safeName, status: 'completed' });
    }
    
    res.json({ success: true, status: 'waiting', chunkIndex });
  } catch (err: any) {
    console.error("Error writing guideline PDF chunk:", err);
    res.status(500).json({ error: `Erro ao salvar o pedaço do PDF no servidor: ${err.message}` });
  }
});

app.post('/api/admin/upload-guideline-pdf', (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: 'Nome e dados do arquivo são obrigatórios.' });
    }
    const safeName = path.basename(name);
    const filePath = path.join(GUIDELINES_DIR, safeName);
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved guidelines PDF successfully: ${safeName} in writeable container directory`);
    res.json({ success: true, name: safeName });
  } catch (err: any) {
    console.error("Error writing guideline PDF to writeable area:", err);
    res.status(500).json({ error: `Erro ao salvar o PDF de referência no servidor: ${err.message}` });
  }
});

app.get('/api/admin/guidelines-pdfs', (req, res) => {
  try {
    const listMap = new Map<string, { name: string, size: string, createdAt: Date, pageCount?: number | null, status?: string }>();
    const dirs = [
      path.join(process.cwd(), 'guidelines'),
      GUIDELINES_DIR
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          if (stats.isFile() && !file.startsWith('.')) {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.pdf' || ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.txt') {
              let pageCount: number | null = null;
              let status = 'Ativo';
              if (ext === '.pdf') {
                pageCount = getPdfPageCount(filePath);
                if (pageCount > 1000) {
                  status = `Ativo (Leitura RAG: ${pageCount} páginas)`;
                }
              }
              listMap.set(file, {
                name: file,
                size: (stats.size / (1024 * 1024)).toFixed(2) + 'MB',
                createdAt: stats.birthtime,
                pageCount,
                status
              });
            }
          }
        }
      } catch (err) {
        console.error(`Error reading files in directory ${dir} for PDFs list:`, err);
      }
    }
    res.json({ files: Array.from(listMap.values()) });
  } catch (err: any) {
    console.error("Error listing guidelines PDFs:", err);
    res.status(500).json({ error: 'Erro ao listar os PDFs de referência.' });
  }
});

app.delete('/api/admin/guidelines-pdfs/:name', (req, res) => {
  try {
    const safeName = path.basename(req.params.name);
    const filePath = path.join(GUIDELINES_DIR, safeName);
    const workspacePath = path.join(process.cwd(), 'guidelines', safeName);
    
    let deleted = false;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted = true;
    }
    if (fs.existsSync(workspacePath)) {
      try {
        fs.unlinkSync(workspacePath);
        deleted = true;
      } catch (e: any) {
        console.warn(`Could not delete from read-only workspace folder: ${e.message}`);
      }
    }

    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Arquivo não encontrado.' });
    }
  } catch (err: any) {
    console.error("Error deleting guidelines PDF:", err);
    res.status(500).json({ error: 'Erro ao deletar o PDF de referência.' });
  }
});

app.post('/api/generate-report', async (req, res) => {
  try {
    const { patient, anamnesis, examData, files } = req.body;

    if (!anamnesis && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'Faltam dados de anamnese ou anexos.' });
    }

    const currentGuidelines = await getFullGuidelines();
    const consultedSources: any[] = [];

    const systemInstruction = `
      Você é um Copiloto Veterinário de elite especializado em Laudos e Prontuários no padrão SOAP.
      Seu objetivo é cruzar os dados da ANAMNESE com as evidências visuais ou textuais dos EXAMES fornecidos e gerar um prontuário estruturado.
      
      IMPORTANTE: Use exatamente os delimitadores ## para separar as seções obrigatoriamente nesta ordem:
      ## S (Subjetivo): Sintetize as queixas do tutor e histórico.
      ## O (Objetivo): Analise detalhadamente os achados clínicos, exames de imagem ou laboratoriais anexados. Se houver imagens, descreva o que vê tecnicamente.
      ## A (Avaliação): Interpretação clínica. Quais são as suspeitas principais e por quê?
      ## P (Plano): Recomendações terapêuticas, exames adicionais ou monitoramento.
      ## D (Diferenciais): Liste EXATAMENTE 3 diagnósticos diferenciais prováveis ranqueados em ordem de plausibilidade (1º, 2º, 3º). Para cada diagnóstico, retorne OBRIGATORIAMENTE nesta estrutura:
         - **[Nome da Patologia] - [Porcentagem de Assertividade, ex: 85%] de Probabilidade**
         - **Revisão Sistemática (RAG) / Por que esta causa?**: Uma revisão crítica detalhada e sistemática justificando clinicamente por que essa patologia é compatível com os exames e a anamnese fornecidos.
         - **Embasamento Literário (Múltiplas Referências Cruzadas)**: Forneça OBRIGATORIAMENTE de 2 a 3 referências bibliográficas distintas, complementares e de alto impacto (cruzando livros clássicos integrados com artigos de consensos científicos ou periódicos relevantes). Cada uma deve ser EXTREMAMENTE RASTREÁVEL e completamente CLICÁVEL em formato de link Markdown, utilizando o seguinte padrão:
            - Clássico de Referência (Tratado/Livro): \`[Nome do Livro (ex: Nelson - Medicina Interna de Pequenos Animais ou Fossum - Cirurgia de Pequenos Animais), Cap. X, pág. Y](https://scholar.google.com/scholar?q=Nelson+Internal+Medicine+Small+Animals+Chapter+X+Page+Y)\`
            - Consenso Clínico ou Artigo Periódico Recente: \`[Título do Artigo/Consenso (ex: ACVIM Consensus Statement ou Journal of Veterinary Internal Medicine)](https://scholar.google.com/scholar?q=Nome+do+Artigo+Ou+Consenso)\` ou se houver DOI: \`[DOI: 10.xxxx/yyyy](https://doi.org/10.xxxx/yyyy)\`
         Sempre certifique-se de que o médico possa confrontar a suspeita tanto por uma perspectiva clínica de tratado quanto por evidências científicas recentes em links clicáveis ativos.
      ## M (Métricas): Forneça os valores encontrados para FC (Freq. Cardíaca), FR (Freq. Respiratória), Temp (Temperatura), TRC (Tempo Repreenchimento Capilar) e a ORIGEM do cliente (Indicação, Instagram, Google, Facebook ou Outros) no formato JSON simple: {"fc": "valor", "fr": "valor", "temp": "valor", "trc": "valor", "origem": "valor"}. Se não encontrar a origem na anamnese, classifique como "Outros" ou tente deduzir pelo contexto.

      Regras:
      1. Se houver imagens de Raio-X, Ultrassom ou exames de sangue, priorize a análise técnica deles.
      2. Mantenha um tom clínico rigoroso e profissional. Responda em Português Brasileiro.
      3. Seja específico sobre a espécie (Canino/Felino/Outros).
      4. Na seção M, retorne APENAS o JSON entre chaves, sem markdown code blocks.
      5. METODOLOGIA DE RACIOCÍNIO CLÍNICO E EVITAÇÃO DE VIÉS DE CONFIRMAÇÃO (MÉTODO ANTI-FECHAMENTO COGNITIVO):
         Ao ponderar sobre os diagnósticos diferenciais, evite focar futilmente apenas nas queixas primárias ou causas estatísticas mais óbvias. Você deve OBRIGATORIAMENTE realizar uma varredura mental estruturada sob três eixos fisiopatológicos complementares antes de listar os diferenciais:
         a) Eixo Funcional/Infeccioso/Inundatório: Processos inflamatórios locais, infecções agudas ou crônicas, e distúrbios de teor celular local (ex: saculites, colites, dermatites perianais).
         b) Eixo Mecânico-Estrutural ou Obstrutivo Extrínseco: Alterações geométricas do canal, fraqueza ou ruptura de diafragmas musculares de suporte (hérnias, divertículos), compressões por órgãos adjacentes (ex: próstata aumentada comprimindo o reto, massas pélvicas, linfonodomegalias) ou estenoses cirúrgicas. Atente-se a alterações físicas de escoamento (como fezes fitiformes/em fita, disfagia, retenção urinária) como fortes indicativos mecânicos que exigem diferenciais mecânicos/cirúrgicos como Hérnia Perineal ou Prostatopatias.
         c) Eixo de Correlação Epidemiológica (Idade, Sexo Inteiro, Raça): Cruze as predisposições hormonais e estruturais do paciente (ex: machos inteiros têm degeneração androgênica de diafragma pélvico e hiperplasia prostática; raças predispostas como Shih Tzu e Boxer apresentam padrões musculares e anatômicos próprios).
         Isso garante que o copiloto permaneça clinicamente assertivo e holístico para qualquer sintomatologia apresentada.

      DIRETRIZES TÉCNICAS (CONCEITOS ADICIONAIS):
      ${currentGuidelines.map(g => `- ${g.topic}: ${g.content}`).join('\n')}
    `;

    const userPrompt = `
      DADOS DO PACIENTE:
      Nome: ${patient.name}
      Espécie/Raça: ${patient.species} / ${patient.breed}
      Idade: ${patient.age}

      ANAMNESE / HISTÓRICO:
      ${anamnesis}

      SUMÁRIO DE EXAMES (TEXTO):
      ${examData}
      
      Por favor, analise as informações acima, os arquivos de diretrizes da base geral e os arquivos do usuário em anexo para compor o laudo SOAP e os diagnósticos diferenciais embasados na literatura.
    `;

    // Prepare contents for multimodal
    const parts: any[] = [{ text: userPrompt }];

    // Inject Admin General Base PDFs from /guidelines/ folder
    const adminPDFParts = await getAdminGuidelinesFiles(userPrompt, consultedSources);
    parts.push(...adminPDFParts);
    
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file.data && file.mimeType) {
          if (file.mimeType === 'application/pdf') {
            const userPdfBuffer = Buffer.from(file.data, 'base64');
            const pageCount = getPdfPageCountFromBuffer(userPdfBuffer);
            if (pageCount > 10) {
              console.log(`[RAG] Processing multi-page user-uploaded PDF '${file.name || 'documento'}' (${pageCount} pages)...`);
              try {
                const textContent = await extractPdfTextWithPDFParse(userPdfBuffer);
                const finalContext = retrieveGlobalRelevantChunks([{ source: file.name || 'Anexo do Usuário', text: textContent }], userPrompt, 45000, consultedSources); // Optimized budget for user pdfs
                parts.push({
                  text: `ARQUIVO ENVIADO PELO USUÁRIO: ${file.name || 'documento'}\nCONTEÚDO EXTRAÍDO RELEVANTE PARA O CASO:\n${finalContext}`
                });
                console.log(`[RAG] Injected matched chunks from massive user-uploaded PDF (${finalContext.length} chars)`);
                continue;
              } catch (err) {
                console.error(`[RAG] Failed to parse user PDF, falling back to standard embed:`, err);
              }
            }
          }
          parts.push({
            inlineData: {
              data: file.data,
              mimeType: file.mimeType
            }
          });
        }
      }
    }

    const response = await generateContentWithFallback({
      model: 'gemini-3.5-flash',
      contents: { parts },
      config: {
        systemInstruction
      }
    });

    const soapContent = response.text || "Falha ao gerar o conteúdo.";
    
    res.json({ 
      soapContent,
      sources: [
        ...currentGuidelines.map(g => ({ topic: g.topic, content: g.content, type: 'guideline' })),
        ...consultedSources.map(s => ({ topic: s.source, content: s.snippet, type: 'pdf', score: s.score }))
      ]
    });

  } catch (error: any) {
    console.error('Gemini Error:', error);
    
    // Check for quota exceeded error (429) or specific GenAI error status
    const isQuotaExceeded = 
      error.message?.includes('429') || 
      error.status === 'RESOURCE_EXHAUSTED' ||
      JSON.stringify(error).includes('quota');

    if (isQuotaExceeded) {
      return res.status(429).json({ 
        error: 'Limite de requisições temporário atingido (TPM/RPM do Gemini Free Tier) ou cota diária excedida. Isso ocorre quando o volume de dados consultados de uma vez é muito grande (por exemplo, ao cruzar dados de livros de referência densos) esgotando os "Tokens por Minuto" (TPM), ou quando há muitas consultas rápidas seguidas (RPM). Aguarde 1 a 2 minutos e envie novamente para restabelecer a comunicação!' 
      });
    }

    let errorMessage = error.message || '';
    try {
      if (errorMessage.startsWith('{') || errorMessage.includes('{"error"')) {
        const jsonStart = errorMessage.indexOf('{');
        const parsed = JSON.parse(errorMessage.substring(jsonStart));
        if (parsed.error && parsed.error.message) {
          errorMessage = parsed.error.message;
        }
      }
    } catch (e) {
      // Falback
    }

    const details = errorMessage ? ` Detalhes: ${errorMessage}` : ' Por favor, tente novamente em alguns instantes.';
    res.status(500).json({ error: `Erro ao processar o laudo com IA.${details}` });
  }
});

app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Nenhum dado de áudio fornecido.' });
    }

    const response = await generateContentWithFallback({
      model: 'gemini-3.5-flash',
      contents: {
        parts: [
          { text: "Você é um assistente de transcrição médica veterinária. Transcreva o áudio a seguir com precisão, mantendo termos técnicos corretos." },
          {
            inlineData: {
              data: audioData,
              mimeType: mimeType || 'audio/webm'
            }
          }
        ]
      }
    });

    res.json({ transcription: response.text });
  } catch (error) {
    console.error('Transcription Error:', error);
    res.status(500).json({ error: 'Erro ao transcrever áudio.' });
  }
});

app.post('/api/generate-prescription', async (req, res) => {
  try {
    const { soapContent, patient } = req.body;

    const systemInstruction = `
      Você é um Copiloto Veterinário especializado em farmacologia. 
      Com base no relato SOAP fornecido, sugira uma prescrição completa.
      
      IMPORTANTE:
      1. Sugira medicamentos com dosagens reais (mg/kg).
      2. Inclua via de administração, frequência e duração.
      3. Liste efeitos colaterais comuns e contraindicações.
      4. Adicione recomendações de manejo (ex: dieta, repouso).
      5. Use termos técnicos e apresente de forma profissional.
      6. Responda em Português Brasileiro.
      
      Estruture com:
      ## Medicamentos: (Lista clara)
      ## Orientações: (Instruções ao tutor)
      ## Alertas: (O que observar)
    `;

    const response = await generateContentWithFallback({
      model: 'gemini-3.5-flash',
      contents: { parts: [{ text: `Paciente: ${patient.name} (${patient.species}). Relato SOAP: ${soapContent}` }] },
      config: { systemInstruction }
    });

    res.json({ prescription: response.text });
  } catch (error) {
    console.error('Prescription Error:', error);
    res.status(500).json({ error: 'Erro ao gerar prescrição.' });
  }
});

app.post('/api/literature-review', async (req, res) => {
  try {
    const { query: searchQuery, files } = req.body;

    if (!searchQuery && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'Forneça uma busca por texto ou envie um arquivo para análise técnica.' });
    }

    const currentGuidelines = await getFullGuidelines();
    const consultedSources: any[] = [];

    const systemInstruction = `
      Você é o motor clínico avançado do Vetmind, focado exclusivamente em revisão crítica literária e auxílio ao raciocínio para cirurgiões e clínicos veterinários.
      Você analisa artigos científicos fornecidos pelo usuário (via anexos) ou realiza a busca profunda a partir de diretrizes consagradas.
      
      HIERARQUIA DE FONTES E RESOLUÇÃO DE CONFLITOS (MALHAS DE SEGURANÇA):
      1. Se o usuário anexou arquivos de exames, artigos ou tabelas nesta chamada, revise-os prioritariamente.
      2. No entanto, realize um "CROSS-CHECK" (verificação cruzada) compulsório com a literatura de referência consagrada nacional e internacional disponível de forma embutida em seu cérebro:
         - Nelson & Couto (Medicina Interna de Pequenos Animais)
         - Fossum (Cirurgia de Pequenos Animais)
         - WSAVA (Vaccination and Pain Management Guidelines)
         - ACVIM Consensuses
      3. Se as orientações inovadoras fornecidas no arquivo do usuário entrarem em choque ou divergência com as práticas já consagradas, você DEVE explicitamente destacar isso em uma seção de ALERTA. Informando e alertando o veterinário da diferença, salvaguardando a conduta clínica do profissional.
      4. ZERO ALUCINAÇÃO: Não invente, extrapole ou deduza protocolos não documentados. Se não houver consistência metodológica, aponte os limites do material.

      FORMATO DE SAÍDA OBRIGATÓRIO (Por favor, use esses exatos marcadores de seção ##):
      ## 📌 RESUMO EXECUTIVO (TL;DR)
      (A conclusão central do paper ou busca em até 3 frases diretas focadas na rotina de atendimentos)

      ## ⚙️ APLICAÇÃO PRÁTICA (O QUE MUDA?)
      (Explicação simples e explícita das posologias recomendadas, doses em mg/kg, técnicas cirúrgicas sugeridas ou abordagens diagnósticas propostas pelo estudo)

      ## ⚖️ AVALIAÇÃO DE CONFIANÇA E LIMITAÇÕES DO ESTUDO
      (Destaque a força científica da evidência. Ex: "Estudo prospectivo controlado duplo-cego com grande amostra n=150", ou "Relato retrospectivo com amostragem reduzida n=8". Aponte vieses.)

      ## 📚 CONFRONTADO COM A LITERATURA BASE (GLOBAL VS LOCAL)
      (Confronte o documento fornecido com as referências tradicionais. Se houver divergências entre o artigo e manuais consagrados, inicie com: "⚠️ DIVERGÊNCIA LITERÁRIA" e explique a quebra de padrão.)

      ## 📖 CITAÇÃO CLÍNICA EXATA
      (Informe a citação científica completa no padrão ABNT ou Vancouver para que o médico possa encontrar o artigo, livro ou diretriz original, indicando capítulo ou página aplicável se for pertinente. Você DEVE tornar essa referência bibliográfica completamente CLICÁVEL, fornecendo links no formato markdown, como:
      - Para livros: \`[Nome do Livro (ex: Fossum - Cirurgia de Pequenos Animais), Cap. X, pág. Y](https://scholar.google.com/scholar?q=Fossum+Small+Animal+Surgery+Chapter+X+Page+Y)\`
      - Para artigos ou consensos: \`[Título do Artigo ou Consenso (ex: WSAVA Vaccination Guidelines)](https://scholar.google.com/scholar?q=WSAVA+Vaccination+Guidelines)\` ou se houver DOI: \`[DOI: 10.xxxx/yyyy](https://doi.org/10.xxxx/yyyy)\`
      Crie links diretos e inteligentes automatizados no Google Scholar: "https://scholar.google.com/scholar?q=...", ou URLs DOI resolver "https://doi.org/...")

      Não retorne informações vazias ou fictícias. Use sempre jargão profissional exemplar (ex: "êmese" no lugar de "vômito", "polidipsia" no lugar de "beber muita água").
    `;

    const userPrompt = `
      SOLICITAÇÃO DO VETERINÁRIO:
      "${searchQuery || 'Analisar e revisar o artigo anexo em busca de validação clínica e prática'}"

      DADOS DO BANCO EM CONTEXTO (EVIDÊNCIAS DE BASE):
      ${currentGuidelines.map(g => `- ${g.topic}: ${g.content}`).join('\n')}
    `;

    const parts: any[] = [{ text: userPrompt }];

    // Inject Admin General Base PDFs from /guidelines/ folder
    const adminPDFParts = await getAdminGuidelinesFiles(userPrompt, consultedSources);
    parts.push(...adminPDFParts);

    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file.data && file.mimeType) {
          if (file.mimeType === 'application/pdf') {
            const userPdfBuffer = Buffer.from(file.data, 'base64');
            const pageCount = getPdfPageCountFromBuffer(userPdfBuffer);
            if (pageCount > 10) {
              console.log(`[RAG] Processing multi-page user-uploaded PDF in literature-review '${file.name || 'documento'}' (${pageCount} pages)...`);
              try {
                const textContent = await extractPdfTextWithPDFParse(userPdfBuffer);
                const finalContext = retrieveGlobalRelevantChunks([{ source: file.name || 'Anexo do Usuário', text: textContent }], userPrompt, 60000, consultedSources); // Optimized budget for literature review of user PDFs
                parts.push({
                  text: `ARQUIVO ENVIADO PELO USUÁRIO: ${file.name || 'documento'}\nCONTEÚDO EXTRAÍDO RELEVANTE PARA O CASO:\n${finalContext}`
                });
                console.log(`[RAG] Injected matched chunks from massive user-uploaded PDF in literature-review (${finalContext.length} chars)`);
                continue;
              } catch (err) {
                console.error(`[RAG] Failed to parse user PDF, falling back to standard embed:`, err);
              }
            }
          }
          parts.push({
            inlineData: {
              data: file.data,
              mimeType: file.mimeType
            }
          });
        }
      }
    }

    const response = await generateContentWithFallback({
      model: 'gemini-3.5-flash',
      contents: { parts },
      config: {
        systemInstruction
      }
    });

    res.json({ 
      review: response.text || "Falha ao gerar revisão clínica.",
      sources: consultedSources.map(s => ({ topic: s.source, content: s.snippet, type: 'pdf', score: s.score }))
    });

  } catch (error: any) {
    console.error('Literature Review Error:', error);
    
    const isQuotaExceeded = 
      error.message?.includes('429') || 
      error.status === 'RESOURCE_EXHAUSTED' ||
      JSON.stringify(error).includes('quota');

    if (isQuotaExceeded) {
      return res.status(429).json({ 
        error: 'Limite de requisições temporário atingido (TPM/RPM do Gemini Free Tier) ou cota diária excedida para sintetizar literatura. Isso ocorre quando o volume de dados consultados de uma vez é muito grande (por exemplo, ao ler livros de referência densos) esgotando os "Tokens por Minuto" (TPM), ou quando há muitas consultas rápidas seguidas (RPM). Aguarde 1 a 2 minutos e envie novamente para restabelecer a comunicação!' 
      });
    }

    let errorMessage = error.message || '';
    try {
      if (errorMessage.startsWith('{') || errorMessage.includes('{"error"')) {
        const jsonStart = errorMessage.indexOf('{');
        const parsed = JSON.parse(errorMessage.substring(jsonStart));
        if (parsed.error && parsed.error.message) {
          errorMessage = parsed.error.message;
        }
      }
    } catch (e) {
      // Fallback
    }

    const details = errorMessage ? ` Detalhes: ${errorMessage}` : ' Tente novamente mais tarde.';
    res.status(500).json({ error: `Não foi possível sintetizar a literatura clínica neste momento.${details}` });
  }
});

app.post('/api/generate-marketing-post', async (req, res) => {
  try {
    const { clinicalData, brandProfile } = req.body;

    if (!clinicalData) {
      return res.status(400).json({ error: 'Dados clínicos são necessários para a geração do post.' });
    }

    const { queixa = "", exames = "", tecnica = "", desfecho = "" } = clinicalData;
    const { brandName = "Vetmind", specialty = "Medicina Veterinária", style = "Minimalista", font = "Inter", color = "#0047AB", handle = "" } = brandProfile || {};

    let styleDescription = "";
    if (style === "Acolhedor") {
      styleDescription = "Use tom empático, caloroso, afetuoso e focado no cuidado humano. Prompts de imagem descrevem cenas iluminadas com luz suave, cores pastel quentes, ambientes veterinários convidativos e fofos.";
    } else if (style === "Executivo") {
      styleDescription = "Use tom altamente científico, sóbrio, formal e voltado à excelência cirúrgica de ponta. Prompts de imagem descrevem ambientes cirúrgicos impecáveis, alta tecnologia, tons azul/branco frios e sensação de extrema precisão.";
    } else if (style === "Minimalista") {
      styleDescription = "Use tom limpo, focado, direto e sofisticado. Prompts de imagem pedem composições em plano detalhado com iluminação neutra, fundo neutro ou desfocado, sombras suaves e muito espaço negativo intencional.";
    } else { // Moderno
      styleDescription = "Use tom inovador, vibrante, energético e tecnológico. Prompts de imagem pedem profundidade de campo muito curta, câmera de cinema, luzes volumétricas, cores contrastantes vibrantes e visual cinematográfico das cirurgias.";
    }

    const systemInstruction = `
Você é um especialista em Copywriting e Marketing de alta autoridade clínica para Medicina Veterinária. Seu papel é transformar prontuários, pós-operatórios e dados clínicos brutos em conteúdos didáticos, éticos e envolvendo para redes sociais (Instagram e LinkedIn) e correspondência científica profissional (Carta ao Colega).

Deverá respeitar rigorosamente as resoluções éticas de publicidade veterinária (CFMV: sem promessas absurdas, sem sensacionalismo, sem mencionar preços de procedimentos ou consultas, focando exclusivamente no aspecto educativo e de valorização profissional).

Você deve produzir em Português Brasileiro (ou em inglês nos prompts de imagem) e retornar OBRIGATORIAMENTE um objeto JSON válido, sem qualquer quebra de linha inválida ou tags adicionais de markdown, com as seguintes chaves exatas:

{
  "carousel": [
    {
      "title": "Título de impacto do slide (máx 60 caracteres)",
      "content": "Conteúdo altamente scannavel e persuasivo do slide (máx 150 caracteres). Adicione quebras de parágrafo curtas se necessário.",
      "imagePrompt": "A highly detailed English prompt for an image generator (like gemini-2.5-flash-image) to generate a professional mockup corresponding to this slide. Must use the following style directions: ${styleDescription}. ONLY generate this for slide 1 (the cover hook) and the very last slide (call to action). ALL other intermediate slides MUST have a value of null."
    }
  ],
  "instagramCaption": "Legenda estratégica completa em tom compatível com o estilo de marca '${style}'. Deve conter parágrafo inicial de gancho, explicação amigável do caso, dicas práticas de prevenção ou cuidados veterinários para os tutores, e hashtags relevantes.",
  "linkedinText": "Estudo de caso clínico para médicos veterinários no LinkedIn. Tom sóbrio, técnico, acadêmico e de alta competência prática. Detalhe os achados de imagem/exames fictícios ou reais fornecidos, a discussão cirúrgica ou clínica, e o desfecho feliz do paciente.",
  "letterText": "Carta formal e técnica de referência e contrarreferência para ser enviada a um colega veterinário ou médico veterinário que indicou o paciente. Deve ser formal, prestativa e usar termos de alto jargão profissional."
}

Mantenha a contagem de slides do carrossel entre 3 e 5 slides. Certifique-se de que cada slide ensina algo de forma direta.
No slide final do carrossel, inclua sutilmente as informações da marca: ${brandName} - ${specialty} ${handle ? `(${handle})` : ""}.
`;

    const userPrompt = `
DADOS CLÍNICOS DO CASO:
- Queixa do Tutor: ${queixa}
- Achados de Exames / Imagem: ${exames}
- Técnica Cirúrgica / Procedimento Adotado: ${tecnica}
- Desfecho / Resultado do Caso: ${desfecho}

INFORMAÇÕES DA MARCA DO CLÍNICO:
- Nome da Clínica/Hospital: ${brandName}
- Especialidade Principal: ${specialty}
- Estilo de Marca: ${style} (Tipografia: ${font}, Cor Destaque: ${color})
- ID de Redes Sociais (@handle): ${handle}

Gere todo o material no formato JSON solicitado.
`;

    console.log("[MARKETING IA] Calling Gemini 3.5-flash for text generation...");
    const response = await generateContentWithFallback({
      model: 'gemini-3.5-flash',
      contents: [
        { text: systemInstruction },
        { text: userPrompt }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text;
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseError) {
      console.warn("[MARKETING IA] JSON parsing failed, clean block markdown...");
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        parsedData = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
      } else {
        throw parseError;
      }
    }

    const finalCarousel = [];
    if (parsedData.carousel && Array.isArray(parsedData.carousel)) {
      for (let i = 0; i < parsedData.carousel.length; i++) {
        const slide = parsedData.carousel[i];
        let imageUrl = null;
        
        if (slide.imagePrompt && typeof slide.imagePrompt === 'string') {
          console.log(`[MARKETING IA] Generating image for slide ${i+1} using imagePrompt: ${slide.imagePrompt}`);
          try {
            const imgResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: [{ text: `${slide.imagePrompt}. Veterinary medicine high-resolution clinical photograph.` }],
              config: {
                imageConfig: {
                  aspectRatio: "1:1"
                }
              }
            });

            let base64Image = "";
            if (imgResponse?.candidates?.[0]?.content?.parts) {
              for (const part of imgResponse.candidates[0].content.parts) {
                if (part.inlineData) {
                  base64Image = part.inlineData.data;
                  break;
                }
              }
            }
            if (base64Image) {
              imageUrl = `data:image/jpeg;base64,${base64Image}`;
              console.log(`[MARKETING IA] Image generated successfully for slide ${i+1}`);
            }
          } catch (imgError: any) {
            console.error(`[MARKETING IA] Failed to generate image for slide ${i+1}, using fallback:`, imgError.message || imgError);
            if (style === "Acolhedor") {
              imageUrl = "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop";
            } else if (style === "Executivo") {
              imageUrl = "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&auto=format&fit=crop";
            } else if (style === "Minimalista") {
              imageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop";
            } else {
              imageUrl = "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=800&auto=format&fit=crop";
            }
          }
        }
        
        finalCarousel.push({
          ...slide,
          imageUrl
        });
      }
    }

    res.json({
      carousel: finalCarousel,
      instagramCaption: parsedData.instagramCaption || "",
      linkedinText: parsedData.linkedinText || "",
      letterText: parsedData.letterText || ""
    });

  } catch (err: any) {
    console.error("[MARKETING IA ERROR]:", err);
    res.status(500).json({ error: "Erro ao criar posts para redes sociais. " + (err.message || "") });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VetCopilot AI running at http://localhost:${PORT}`);
  });
}

startServer();
