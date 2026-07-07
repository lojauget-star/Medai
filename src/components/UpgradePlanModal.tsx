import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Sparkles, CheckCircle2, CreditCard, QrCode, ShieldCheck, 
  Loader2, PartyPopper, Check, Copy, ArrowRight 
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: (newPlan: 'free' | 'pro') => void;
}

export default function UpgradePlanModal({ isOpen, onClose, onUpgradeSuccess }: UpgradePlanModalProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [step, setStep] = useState<'plan' | 'payment' | 'success'>('plan');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Form states for credit card
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const plans = {
    monthly: {
      price: "R$ 89,90",
      period: "mês",
      total: "R$ 89,90 cobrados mensalmente"
    },
    yearly: {
      price: "R$ 59,90",
      period: "mês",
      total: "R$ 718,80 cobrados anualmente (Economia de 33%)"
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText("00020101021126580014br.gov.bcb.pix0136vetmind-payment-89d2f3c1a-prod5204000053039865406718.805802BR5913VETMIND%20TECNOLOGIA6009SAO%20PAULO62070503***6304D1A0");
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    
    // Simulating clinical payment validations (Disney: magic details!)
    setTimeout(async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            plan: 'pro',
            subscriptionDetails: {
              cycle: billingCycle,
              method: paymentMethod,
              activeSince: new Date().toISOString(),
              nextBilling: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
            }
          }, { merge: true });
          
          onUpgradeSuccess('pro');
          setStep('success');
        } catch (error) {
          console.error("Error upgrading user plan:", error);
          alert("Não foi possível atualizar o plano no Firebase. Verifique sua conexão.");
        } finally {
          setIsProcessing(false);
        }
      } else {
        setIsProcessing(false);
        alert("Nenhum usuário logado. Por favor, faça login novamente.");
      }
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
      />

      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-100 shadow-2xl z-10 overflow-hidden"
      >
        {/* Close Button */}
        {step !== 'success' && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {step === 'plan' && (
            <motion.div 
              key="step-plan"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-8 lg:p-10 space-y-6"
            >
              <div className="flex items-center gap-3 text-indigo-600">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-900 tracking-tight leading-none">Upgrade de Plano</h3>
                  <p className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider mt-1.5">Tenha superpoderes clínicos com a IA</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800">Escolha a recorrência:</h4>
                {/* Billing Cycle Selector */}
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/40">
                  <button 
                    onClick={() => setBillingCycle('yearly')}
                    className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      billingCycle === 'yearly' 
                        ? 'bg-white text-indigo-600 shadow-xs border border-indigo-100/20' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Plano Anual</span>
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black uppercase px-2 py-0.5 rounded-md">-33% Off</span>
                  </button>
                  <button 
                    onClick={() => setBillingCycle('monthly')}
                    className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      billingCycle === 'monthly' 
                        ? 'bg-white text-indigo-600 shadow-xs border border-indigo-100/20' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Plano Mensal
                  </button>
                </div>
              </div>

              {/* Price Tag */}
              <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100/40 text-center space-y-2">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-4xl font-black text-slate-950 tracking-tight">{plans[billingCycle].price}</span>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">/ {plans[billingCycle].period}</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">{plans[billingCycle].total}</p>
              </div>

              {/* Bullet Points */}
              <div className="space-y-3">
                <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-400">Tudo incluso no plano Pro:</h5>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    "Geração de posts e carrosséis ilimitados no Estúdio de Marketing",
                    "Acesso completo ao Inteligência de Negócios e BI do consultório",
                    "Uploader ilimitado de PDFs/Livros e busca RAG inteligente",
                    "Copiloto inteligente sem restrições de uso",
                    "Assinatura digital ilimitada em todos os laudos"
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 bg-emerald-50 rounded-full p-0.5 border border-emerald-100" />
                      <span className="text-xs text-slate-600 font-medium leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep('payment')}
                className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-indigo-600/15 duration-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Avançar para Pagamento</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div 
              key="step-payment"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-8 lg:p-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-extrabold text-slate-800 text-base">Pagamento Seguro</h4>
                </div>
                <button 
                  onClick={() => setStep('plan')}
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer uppercase tracking-wider"
                >
                  Voltar
                </button>
              </div>

              {/* Payment Method Selector */}
              <div className="flex gap-4">
                <button 
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex-1 py-4 px-4 border rounded-2xl flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    paymentMethod === 'pix' 
                      ? 'border-indigo-600 bg-indigo-50/20 text-indigo-600' 
                      : 'border-slate-150 hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <QrCode className="w-6 h-6" />
                  <span className="text-xs font-bold uppercase tracking-wider">PIX (Instantâneo)</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-4 px-4 border rounded-2xl flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    paymentMethod === 'card' 
                      ? 'border-indigo-600 bg-indigo-50/20 text-indigo-600' 
                      : 'border-slate-150 hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-xs font-bold uppercase tracking-wider">Cartão de Crédito</span>
                </button>
              </div>

              {/* Pix Payment Method Container */}
              {paymentMethod === 'pix' ? (
                <div className="space-y-5 flex flex-col items-center bg-slate-50 p-6 rounded-3xl border border-slate-150">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/65 shadow-inner">
                    <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      {/* Simulated elegant PIX QRCode */}
                      <svg className="w-28 h-28 text-slate-900" viewBox="0 0 100 100">
                        <rect x="0" y="0" width="25" height="25" fill="currentColor" />
                        <rect x="5" y="5" width="15" height="15" fill="white" />
                        <rect x="75" y="0" width="25" height="25" fill="currentColor" />
                        <rect x="80" y="5" width="15" height="15" fill="white" />
                        <rect x="0" y="75" width="25" height="25" fill="currentColor" />
                        <rect x="5" y="80" width="15" height="15" fill="white" />
                        {/* Mock QR codes patterns */}
                        <rect x="35" y="10" width="10" height="10" fill="currentColor" />
                        <rect x="55" y="15" width="15" height="10" fill="currentColor" />
                        <rect x="30" y="45" width="15" height="15" fill="currentColor" />
                        <rect x="60" y="50" width="15" height="10" fill="currentColor" />
                        <rect x="45" y="75" width="10" height="15" fill="currentColor" />
                        <rect x="75" y="75" width="15" height="15" fill="currentColor" />
                      </svg>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium text-center leading-relaxed">
                    Escaneie o código QR acima ou copie o código Pix abaixo para pagar de forma instantânea.
                  </p>

                  <button
                    onClick={handleCopyPix}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-98 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-600 font-extrabold">Copiado com Sucesso!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-400" />
                        <span>Copiar Código Pix copia-e-cola</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Card Payment Method Container */
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Número do Cartão</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="4532 1928 3829 4821"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                        className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono focus:outline-none focus:border-indigo-600"
                      />
                      <CreditCard className="w-5 h-5 text-slate-400 absolute right-4 top-3.5" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Nome no Cartão</label>
                    <input 
                      type="text" 
                      placeholder="NOME COMPLETO"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl uppercase focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Validade</label>
                      <input 
                        type="text" 
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value.substring(0, 5))}
                        className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">CVV</label>
                      <input 
                        type="password" 
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center focus:outline-none focus:border-indigo-600 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleProcessPayment}
                disabled={isProcessing}
                className="w-full py-4.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/10 duration-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>PROCESSANDO PAGAMENTO...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>CONCLUIR ASSINATURA PRO</span>
                  </>
                )}
              </button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 lg:p-10 space-y-6 text-center flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 flex items-center justify-center shadow-inner relative mb-2">
                <PartyPopper className="w-8 h-8 text-emerald-500 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="font-black text-2xl text-slate-900 tracking-tight leading-none">Você é VetMind Pro!</h3>
                <p className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider mt-1.5">Pagamento confirmado na rede principal</p>
              </div>

              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm">
                Seja muito bem-vindo ao plano premium. Seu acesso ilimitado a todos os módulos avançados, análises de BI e estúdio de marketing já está ativo!
              </p>

              <div className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between text-left">
                <div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Status do Plano</div>
                  <div className="text-xs font-black text-slate-800 uppercase mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span>Plano Ativo (VetMind Pro)</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Próximo Vencimento</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">
                    {new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-indigo-600/10 duration-200 transition-all flex items-center justify-center cursor-pointer"
              >
                Começar a usar as funções Pro!
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
