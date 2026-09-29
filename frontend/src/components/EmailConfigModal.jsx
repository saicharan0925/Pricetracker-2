import { useState } from 'react';
import { X, Mail, CheckCircle2, AlertTriangle, Send, Loader2, Copy, Check, ExternalLink, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendTestEmail } from '../services/api.js';

export default function EmailConfigModal({ isOpen, onClose, emailStatus, onRefreshStatus }) {
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeTab, setActiveTab] = useState('resend'); // 'resend' | 'gmail'

  if (!isOpen) return null;

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testEmail.trim() || !/^\S+@\S+\.\S+$/.test(testEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setSending(true);
      setTestResult(null);
      const res = await sendTestEmail(testEmail.trim());
      setTestResult(res);
      if (res?.success) {
        toast.success('Test email delivered successfully!');
      } else {
        toast((t) => (
          <span className="text-xs">
            {res?.message || 'Email delivery logged in backend console.'}
          </span>
        ), { icon: 'ℹ️' });
      }
      if (onRefreshStatus) onRefreshStatus();
    } catch (err) {
      toast.error(err.message || 'Failed to send test email');
      setTestResult({ success: false, message: err.message });
    } finally {
      setSending(false);
    }
  };

  const resendSample = `# Add to backend/.env:
RESEND_API_KEY=re_123456789abcdef...
RESEND_FROM=SmartPrice <onboarding@resend.dev>`;

  const gmailSample = `# Add to backend/.env:
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your.email@gmail.com
SMTP_PASSWORD=your_16_char_app_password
FROM_EMAIL=your.email@gmail.com`;

  const isConfigured = Boolean(emailStatus?.configured);
  const isResend = emailStatus?.provider === 'resend';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center text-white shadow-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Email Service Setup</h2>
              <p className="text-xs text-slate-400">Resend API &amp; SMTP configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status pill */}
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 ${
            isConfigured
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          )}
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-sm">
              {isConfigured
                ? isResend
                  ? 'Resend API Active (Modern Email API)'
                  : `SMTP Active (${emailStatus.smtp_server})`
                : 'Email in Simulation Mode (Not Configured)'}
            </p>
            <p className="opacity-90 mt-0.5">
              {isConfigured
                ? `Delivering alerts via ${emailStatus.from_email || 'configured provider'}`
                : 'Emails are logged to backend console until RESEND_API_KEY or SMTP credentials are added in backend/.env.'}
            </p>
          </div>
        </div>

        {/* Quick test form */}
        <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/10 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Send Test Email</h3>
          <p className="text-xs text-slate-400">
            Verify real delivery by triggering an instant test alert.
          </p>
          <form onSubmit={handleSendTest} className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter your email to test..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-bg text-white text-xs sm:text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-md shrink-0"
            >
              {sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Test
                </>
              )}
            </button>
          </form>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-indigo-500/10 border-indigo-500/20 text-slate-300'
              }`}
            >
              <p className="font-semibold">
                {testResult.success ? 'Delivery Status: Success' : 'Delivery Status: Simulation Logged'}
              </p>
              <p className="mt-1 opacity-90 break-words">{testResult.message}</p>
            </div>
          )}
        </div>

        {/* Provider Tabs */}
        <div className="space-y-3">
          <div className="flex border-b border-white/10 gap-2 pb-1">
            <button
              onClick={() => setActiveTab('resend')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                activeTab === 'resend'
                  ? 'border-indigo-500 text-indigo-400 bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" /> Resend API (Recommended)
            </button>
            <button
              onClick={() => setActiveTab('gmail')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                activeTab === 'gmail'
                  ? 'border-indigo-500 text-indigo-400 bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Gmail SMTP
            </button>
          </div>

          {activeTab === 'resend' ? (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">
                  Resend.com Setup (No Gmail passwords required!)
                </span>
                <button
                  onClick={() => handleCopy(resendSample, 'resend')}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {copiedKey === 'resend' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'resend' ? 'Copied' : 'Copy config'}
                </button>
              </div>

              <ol className="text-xs text-slate-400 space-y-1.5 list-decimal pl-4 leading-relaxed">
                <li>
                  Sign up free at{' '}
                  <a
                    href="https://resend.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 underline inline-flex items-center gap-0.5"
                  >
                    resend.com <ExternalLink className="w-3 h-3 inline" />
                  </a>{' '}
                  (Free tier gives 3,000 emails/mo).
                </li>
                <li>
                  Go to <strong className="text-slate-300">API Keys</strong> &rarr; Click <strong className="text-slate-300">&quot;Create API Key&quot;</strong>.
                </li>
                <li>
                  Copy the key (starts with <code className="text-indigo-300 font-mono">re_</code>) and paste into <code className="bg-slate-800 text-indigo-300 px-1 py-0.5 rounded font-mono">backend/.env</code>:
                </li>
              </ol>

              <pre className="p-3 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-mono text-slate-300 overflow-x-auto">
                {resendSample}
              </pre>
              <p className="text-[11px] text-slate-500 leading-normal">
                💡 <span className="text-slate-400">Default sender:</span> Resend provides <code className="text-slate-400 font-mono">onboarding@resend.dev</code> to test sending to your registered account email. You can also connect any custom domain in Resend to send to anyone worldwide.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Gmail App Password Setup</span>
                <button
                  onClick={() => handleCopy(gmailSample, 'gmail')}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {copiedKey === 'gmail' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'gmail' ? 'Copied' : 'Copy config'}
                </button>
              </div>

              <ol className="text-xs text-slate-400 space-y-1.5 list-decimal pl-4 leading-relaxed">
                <li>
                  Enable 2-Step Verification on your Google Account: <span className="text-slate-300">myaccount.google.com/security</span>
                </li>
                <li>
                  Visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-indigo-400 underline">myaccount.google.com/apppasswords</a> and create an App Password named &quot;SmartPrice&quot;.
                </li>
                <li>
                  Add to <code className="bg-slate-800 text-indigo-300 px-1 py-0.5 rounded font-mono">backend/.env</code>:
                </li>
              </ol>

              <pre className="p-3 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-mono text-slate-300 overflow-x-auto">
                {gmailSample}
              </pre>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
