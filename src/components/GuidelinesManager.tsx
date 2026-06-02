import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Trash2, Library, Sparkles, FileText, CheckCircle2, 
  Loader2, PlusCircle, AlertCircle, Info, Upload, FileUp
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface Guideline {
  id: string;
  title: string;
  content: string;
  source: string;
  createdAt?: any;
}

const DEFAULT_GUIDELINES = [
  {
    title: "Bioquímica Renal em Cães",
    source: "Nelson & Couto, Medicina Interna de Pequenos Animais, Cap. 38, pág. 620-635",
    content: "Valores de referência para Ureia: 15-40 mg/dL. Creatinina: 0.5-1.5 mg/dL. Elevações concomitantes de Creatinina e Ureia sugerem azotemia se a densidade urinária estiver baixa (<1.030), necessitando de hemograma completo, urinálise e ultrassonografia abdominal para descartar nefropatia crônica ou lesão renal aguda."
  },
  {
    title: "Enzimas Hepáticas Felinas",
    source: "Nelson & Couto, Medicina Interna de Pequenos Animais, Cap. 45, pág. 782-790",
    content: "ALT (Alanina Aminotransferase) acima de 100 U/L em gatos indica dano hepatocelular agudo ou crônico. Diferenciar de lipidose hepática se houver icterícia acentuada e FA (Fosfatase Alcalina) desproporcionalmente alta, ou de colangite neutrofílica se houver febre concomitante."
  },
  {
    title: "Diretrizes de Manejo de Dor em Cães",
    source: "WSAVA Pain Management Guidelines, Seção de Analgesia Preventiva, pág. 12-18",
    content: "O controle ágil da dor deve combinar opioides de ação rápida (Buprenorfina ou Metadona) com anti-inflamatórios não esteroidais (AINEs como Carprofeno ou Meloxicam), desde que a função renal e a integridade gastrointestinal estejam preservadas."
  }
];

export default function GuidelinesManager() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // New PDF Database States
  const [pdfFiles, setPdfFiles] = useState<{ name: string, size: string, createdAt: string, pageCount?: number | null, status?: string }[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGuidelines();
    fetchPdfFiles();
  }, []);

  const fetchPdfFiles = async () => {
    try {
      setPdfLoading(true);
      const response = await fetch('/api/admin/guidelines-pdfs');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setPdfFiles(data.files || []);
        } else {
          console.warn("Expected JSON from /api/admin/guidelines-pdfs but got:", contentType);
          setPdfFiles([]);
        }
      }
    } catch (err) {
      console.error("Erro ao listar PDFs:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setPdfUploading(true);
    setPdfError(null);
    setUploadProgress(0);

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const base64 = (event.target?.result as string).split(',')[1];
        const chunkSize = 1024 * 512; // 512 KB chunks for seamless upload over proxy limits
        const totalChunks = Math.ceil(base64.length / chunkSize);
        const uploadId = Math.random().toString(36).substring(2, 15);

        let completedChunks = 0;
        let uploadFailed = false;

        // Upload chunks sequentially to maintain order and stable connection handling
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const chunkData = base64.slice(start, start + chunkSize);

          const res = await fetch('/api/admin/upload-guideline-pdf-chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uploadId,
              chunkIndex: i,
              totalChunks,
              name: file.name,
              data: chunkData
            })
          });

          if (!res.ok) {
            uploadFailed = true;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errData = await res.json();
              setPdfError(errData.error || `Erro de proxy ao carregar bloco ${i+1} de ${totalChunks}.`);
            } else {
              setPdfError(`Falha de rede ao enviar o bloco ${i+1} de ${totalChunks} do PDF.`);
            }
            break;
          }

          completedChunks++;
          setUploadProgress(Math.round((completedChunks / totalChunks) * 100));
        }

        if (!uploadFailed) {
          fetchPdfFiles();
        }
      } catch (err) {
        setPdfError("Erro de comunicação com o servidor de chunks do PDF.");
        console.error(err);
      } finally {
        setPdfUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  const handlePdfDelete = async (name: string) => {
    if (!confirm(`Tem certeza que deseja apagar o livro/artigo "${name}" da Base Geral?`)) return;

    try {
      const res = await fetch(`/api/admin/guidelines-pdfs/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPdfFiles(prev => prev.filter(f => f.name !== name));
      } else {
        alert("Erro ao excluir PDF.");
      }
    } catch (err) {
      console.error("Error deleting PDF:", err);
    }
  };

  const fetchGuidelines = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'guidelines'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Guideline[];
      setGuidelines(list);
    } catch (err) {
      console.error("Erro ao carregar diretrizes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !source) {
      setError("Todos os campos de referência são obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, 'guidelines'), {
        title,
        source,
        content,
        createdAt: serverTimestamp()
      });

      // Reset
      setTitle('');
      setSource('');
      setContent('');
      setSuccess(true);
      fetchGuidelines();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError("Falha ao salvar no banco do Firebase. Conexão recusada ou pendente.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta diretriz de referência permanente?")) return;
    try {
      await deleteDoc(doc(db, 'guidelines', id));
      setGuidelines(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error("Erro ao deletar:", err);
    }
  };

  const handleInsertDefaults = async () => {
    setLoading(true);
    try {
      for (const item of DEFAULT_GUIDELINES) {
        await addDoc(collection(db, 'guidelines'), {
          ...item,
          createdAt: serverTimestamp()
        });
      }
      fetchGuidelines();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-400 max-w-4xl mx-auto py-4">
      
      {/* Top section heading */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-1">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#6B4EFF]/5 text-[#6B4EFF] rounded-full border border-[#6B4EFF]/10">
            <Library className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Biblioteca de RAG Clínico</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
            Banco de Diretrizes e Referências
          </h2>
          <p className="text-sm text-slate-500 font-normal">
            Aqui você inputa as diretrizes permanentes de referência de exames, livros e consensos. O motor de Inteligência Artificial cruzará estas diretrizes automaticamente com a revisão de literatura do usuário em tempo real.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* FORM TO ADD NEW COPIES FROM REFERENCE BOOK */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
          <div className="flex items-center gap-3 text-[#6B4EFF]">
            <BookOpen className="w-5 h-5" />
            <h3 className="font-bold text-lg text-slate-800 tracking-tight">Cadastrar Nova Referência</h3>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="label-medical text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">Título do Artigo ou Diretriz</label>
              <input 
                type="text"
                placeholder="Ex: Diretriz de Vacinação Felina ABCD"
                className="input-clinical text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="label-medical text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">Fonte / Livro / Autor / Revista</label>
              <input 
                type="text"
                placeholder="Ex: WSAVA Guidelines 2024, pág. 110"
                className="input-clinical text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>

            <div>
              <label className="label-medical text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">Trecho, Protocolo ou Conteúdo Técnico Clínico</label>
              <textarea 
                placeholder="Insira aqui as dosagens, faixas de referência e orientações explícitas para o RAG..."
                className="input-clinical h-40 text-sm leading-relaxed"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl font-bold flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 text-emerald-600 text-xs p-3.5 rounded-xl font-bold flex items-center gap-2 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Cadastrado no Banco Firebase!</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4.5 bg-[#6B4EFF] hover:bg-[#5339cc] active:scale-[0.98] text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#6B4EFF]/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>CADASTRANDO...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Inserir no RAG Permanente</span>
                </>
              )}
            </button>
          </form>

          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3 text-slate-600">
            <Info className="w-5 h-5 text-clinical-blue shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              O administrador do sistema (você) insere os PDFs ou regras aqui para alimentar o cérebro literário de retaguarda. Os veterinários poderação carregar os seus próprios artigos avulsos na tela de chat.
            </p>
          </div>
        </div>

        {/* LIST OF GUIDELINES CURRENTLY ACTIVE IN FIRESTORE */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-extrabold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              <span>Bancos Cadastrados</span>
              <span className="bg-[#6B4EFF]/10 text-[#6B4EFF] text-[10px] font-black px-2 py-0.5 rounded-full">{guidelines.length} ativos</span>
            </h3>
            {guidelines.length === 0 && !loading && (
              <button 
                onClick={handleInsertDefaults}
                className="text-xs text-[#6B4EFF] font-bold hover:underline uppercase tracking-wide"
              >
                + Carregar Padrões
              </button>
            )}
          </div>

          <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl space-y-4">
                <Loader2 className="w-8 h-8 text-[#6B4EFF] animate-spin" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest animate-pulse">Consultando Firebase...</p>
              </div>
            ) : guidelines.length === 0 ? (
              <div className="bg-white p-12 rounded-[2rem] border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center gap-4">
                <Library className="w-12 h-12 text-slate-300" />
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Nenhuma diretriz de referência adicionada</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Clique em "Carregar Padrões" para restaurar os consensos da WSAVA/Nelson de exemplo, ou use o formulário para cadastrar seus próprios materiais.
                  </p>
                </div>
                <button 
                  onClick={handleInsertDefaults}
                  className="bg-slate-100 text-slate-600 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all border border-slate-200"
                >
                  Carregar Exemplos Padrão
                </button>
              </div>
            ) : (
              guidelines.map(g => (
                <div key={g.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-3 relative group hover:border-[#6B4EFF]/20 transition-all">
                  <button 
                    onClick={() => handleDelete(g.id)}
                    className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all p-1.5 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col gap-1 pr-6">
                    <h4 className="font-bold text-slate-800 text-base leading-snug">{g.title}</h4>
                    <span className="text-[10px] font-black text-[#6B4EFF] uppercase tracking-wide">Fonte: {g.source}</span>
                  </div>

                  <p className="text-xs text-slate-500 font-normal leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line select-text">
                    {g.content}
                  </p>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* SEÇÃO BASE GERAL DE PDFS (MANUAIS / CO-RELAÇÃO DE LIVROS) */}
      <div className="bg-slate-50 border border-slate-200/60 p-8 rounded-[2.5rem] space-y-6 mt-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#6B4EFF]/10 text-[#6B4EFF] rounded-full border border-[#6B4EFF]/15">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Base Geral de Literatura (PDFs)</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Gestão de PDFs de Referência Permanente
          </h3>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Faça upload de manuais completos, diretrizes ou livros (Nelson, Fossum, consensos da ACVIM). O motor de IA lerá o texto e as tabelas destes arquivos para subsidiar a verificação e justificar os <b>diagnósticos diferenciais</b>.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
          {/* Upload Box */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-105 shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Enviar PDF para a Base Geral</h4>
            
            <input 
              type="file" 
              accept=".pdf" 
              hidden 
              ref={fileInputRef} 
              onChange={handlePdfUpload} 
            />

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-[#6B4EFF]/50 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-50/20 cursor-pointer transition-all group"
            >
              <div className="text-slate-400 group-hover:scale-110 transition-transform mb-3">
                <FileUp className="w-8 h-8 text-[#6B4EFF]" />
              </div>
              <p className="text-xs font-bold text-slate-600">Arraste seu manual PDF aqui</p>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mt-1">Uploader de Servidor (Máx 50MB)</p>
              <button 
                type="button"
                className="mt-4 bg-[#6B4EFF] text-white text-[10px] font-black uppercase px-5 py-2.5 rounded-lg hover:bg-[#5339cc]"
              >
                Selecionar Livro/Artigo
              </button>
            </div>

            {pdfUploading && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-[#6B4EFF] animate-spin shrink-0" />
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Enviando manual... ({uploadProgress}%)
                  </div>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#6B4EFF] h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {pdfError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 px-4 rounded-xl font-bold flex items-center gap-2 border border-red-105">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pdfError}</span>
              </div>
            )}
          </div>

          {/* List Box */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>PDFs Ativos no Servidor Climatizado</span>
              <span className="bg-[#6B4EFF]/10 text-[#6B4EFF] text-xs font-black px-2.5 py-1 rounded-full">{pdfFiles.length} arquivos</span>
            </h4>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {pdfLoading ? (
                <div className="flex items-center justify-center py-10 bg-white border border-slate-105 rounded-2xl gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                  <Loader2 className="w-4 h-4 text-[#6B4EFF] animate-spin" /> Carregando diretório PDF...
                </div>
              ) : pdfFiles.length === 0 ? (
                <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
                  <Library className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sem PDFs de base geral anexados ainda.</p>
                </div>
              ) : (
                pdfFiles.map((f, idx) => (
                  <div key={idx} className="bg-white p-4 px-5 rounded-2xl border border-slate-105 flex items-center justify-between group hover:border-[#6B4EFF]/20 transition-colors">
                    <div className="flex items-center gap-3 truncate">
                      <div className="bg-red-50 text-red-500 p-2.5 rounded-xl">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate flex-1">
                        <p className="text-xs font-extrabold text-slate-700 truncate max-w-[280px] lg:max-w-[420px]" title={f.name}>
                          {f.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          Tamanho: {f.size} • Adicionado em {new Date(f.createdAt).toLocaleDateString()}
                        </p>
                        {f.status && f.status !== 'Ativo' ? (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200">
                              ⚠️ {f.status}
                            </span>
                          </div>
                        ) : f.pageCount && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              ✅ {f.pageCount} páginas • Ativo para IA
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handlePdfDelete(f.name)}
                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
