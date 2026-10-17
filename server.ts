import express, { Request, Response } from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory system state for admin logs and accounts
let systemVersion = {
  current: '2.5.0',
  latest: '2.5.1',
  hasUpdate: true,
  releaseDate: '2026-10-17',
  releaseNotes: [
    'Otimização da sincronização em tempo real com o Google Calendar.',
    'Suporte aprimorado a gestos de arrasto e pinça para tablet e mobile.',
    'Novo modelo preditivo Gemini 3.8 Flash para sugestão de blocos de foco.',
    'Aprimoramento do modo ultra-escuro (OLED Black) e transparência adaptativa.',
    'Sincronização offline com fila de persistência local resiliente.'
  ],
  lastChecked: new Date().toISOString()
};

let auditLogs: Array<{
  id: string;
  timestamp: string;
  user: string;
  action: string;
  category: 'SECURITY' | 'SYNC' | 'SYSTEM' | 'AUTH' | 'EVENT';
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  ip: string;
  details: string;
}> = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    user: 'luanleao12@gmail.com',
    action: 'Google Calendar OAuth Conectado',
    category: 'SYNC',
    status: 'SUCCESS',
    ip: '192.168.1.45',
    details: 'Permissão concedida para calendar.events com token de acesso renovado.'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    user: 'luanleao12@gmail.com',
    action: 'Autenticação 2FA Verificada',
    category: 'AUTH',
    status: 'SUCCESS',
    ip: '192.168.1.45',
    details: 'Desafio TOTP de 6 dígitos validado com sucesso na sessão.'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    user: 'Sistema',
    action: 'Verificação de Atualização OTA',
    category: 'SYSTEM',
    status: 'INFO',
    ip: '127.0.0.1',
    details: 'Banco de dados consultado: Nova versão v2.5.1 pronta para instalação.'
  }
];

let accounts = [
  {
    id: 'acc-1',
    name: 'Luan Leão',
    email: 'luanleao12@gmail.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    storageUsed: '14.2 MB',
    twoFactorEnabled: true,
    lastLogin: new Date().toISOString(),
    googleConnected: true
  },
  {
    id: 'acc-2',
    name: 'Perfil Profissional',
    email: 'trabalho@empresa.com',
    role: 'EDITOR',
    status: 'ACTIVE',
    storageUsed: '8.7 MB',
    twoFactorEnabled: true,
    lastLogin: new Date(Date.now() - 86400000).toISOString(),
    googleConnected: false
  },
  {
    id: 'acc-3',
    name: 'Convidado Familiar',
    email: 'familia@compartilhado.org',
    role: 'VIEWER',
    status: 'ACTIVE',
    storageUsed: '2.1 MB',
    twoFactorEnabled: false,
    lastLogin: new Date(Date.now() - 172800000).toISOString(),
    googleConnected: false
  }
];

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // --- API Endpoints ---

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      geminiAvailable: !!apiKey
    });
  });

  // System Version & Updates
  app.get('/api/system/version', (_req: Request, res: Response) => {
    systemVersion.lastChecked = new Date().toISOString();
    res.json(systemVersion);
  });

  app.post('/api/system/update', (_req: Request, res: Response) => {
    const prevVersion = systemVersion.current;
    systemVersion.current = systemVersion.latest;
    systemVersion.hasUpdate = false;

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'Administrador',
      action: 'Atualização do Sistema Concluída',
      category: 'SYSTEM',
      status: 'SUCCESS',
      ip: '127.0.0.1',
      details: `Sistema atualizado com sucesso de v${prevVersion} para v${systemVersion.current}.`
    });

    res.json({
      success: true,
      message: `Sistema atualizado com êxito para v${systemVersion.current}`,
      version: systemVersion
    });
  });

  // Admin Logs
  app.get('/api/admin/logs', (_req: Request, res: Response) => {
    res.json({ logs: auditLogs });
  });

  app.post('/api/admin/logs', (req: Request, res: Response) => {
    const { user, action, category, status, ip, details } = req.body;
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user || 'Anônimo',
      action: action || 'Ação Registrada',
      category: category || 'SYSTEM',
      status: status || 'INFO',
      ip: ip || req.ip || '127.0.0.1',
      details: details || ''
    };
    auditLogs.unshift(newLog);
    if (auditLogs.length > 200) auditLogs.pop();
    res.status(201).json(newLog);
  });

  // Admin Accounts
  app.get('/api/admin/accounts', (_req: Request, res: Response) => {
    res.json({ accounts });
  });

  app.post('/api/admin/accounts', (req: Request, res: Response) => {
    const { action, accountId, role, status } = req.body;
    const target = accounts.find((a) => a.id === accountId);
    if (!target) {
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }

    if (action === 'UPDATE_ROLE' && role) {
      target.role = role;
    } else if (action === 'TOGGLE_STATUS' && status) {
      target.status = status;
    } else if (action === 'RESET_2FA') {
      target.twoFactorEnabled = false;
    }

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'Painel Admin',
      action: `Gerenciamento de Conta: ${target.name}`,
      category: 'SECURITY',
      status: 'WARNING',
      ip: req.ip || '127.0.0.1',
      details: `Alteração aplicada em ${target.email}: Ação=${action}`
    });

    res.json({ success: true, account: target });
  });

  // --- Gemini AI Endpoints ---

  // 1. Analyze Schedule & Workload
  app.post('/api/gemini/analyze', async (req: Request, res: Response) => {
    try {
      const { events, userContext } = req.body;

      if (!aiClient) {
        // Fallback intelligent analysis when API key is missing
        const count = Array.isArray(events) ? events.length : 0;
        return res.json({
          analysis: {
            workloadScore: count > 8 ? 85 : count > 4 ? 65 : 40,
            workloadStatus: count > 8 ? 'Alta Sobrecarga' : count > 4 ? 'Moderado Equilibrado' : 'Dia Leve',
            meetingDensity: `${count} compromissos agendados`,
            focusBlocksFound: count > 5 ? '1 bloco de 90 min à tarde' : '3 blocos ideais de foco profundo',
            conflictsDetected: false,
            recommendations: [
              'Reserve pausas de 10 minutos entre reuniões consecutivas.',
              'Aproveite a janela matinal para tarefas de alta complexidade mental.',
              'Mantenha notificações silenciosas durante os períodos de foco.'
            ],
            summary: `Sua agenda possui ${count} eventos mapeados no horizonte. O dia apresenta boa flexibilidade para conclusão de prioridades.`
          }
        });
      }

      const prompt = `Analise a agenda a seguir em português do Brasil para otimização de tempo e produtividade:
Eventos atuais: ${JSON.stringify(events || [])}
Contexto do usuário: ${userContext || 'Profissional com reuniões e tarefas diárias'}

Responda em formato JSON com o seguinte formato:
{
  "workloadScore": número de 0 a 100,
  "workloadStatus": "string (ex: Leve, Equilibrado, Intenso, Crítico)",
  "meetingDensity": "string explicando a densidade de reuniões",
  "focusBlocksFound": "string indicando melhores janelas de foco profundo",
  "conflictsDetected": booleano,
  "recommendations": ["dica prática 1", "dica prática 2", "dica prática 3"],
  "summary": "resumo executivo conciso em 2 frases"
}`;

      const aiResponse = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              workloadScore: { type: Type.INTEGER },
              workloadStatus: { type: Type.STRING },
              meetingDensity: { type: Type.STRING },
              focusBlocksFound: { type: Type.STRING },
              conflictsDetected: { type: Type.BOOLEAN },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              summary: { type: Type.STRING }
            },
            required: ['workloadScore', 'workloadStatus', 'meetingDensity', 'focusBlocksFound', 'recommendations', 'summary']
          }
        }
      });

      const text = aiResponse.text || '{}';
      const parsed = JSON.parse(text);
      res.json({ analysis: parsed });
    } catch (error: any) {
      console.error('Error analyzing schedule with Gemini:', error);
      res.status(500).json({
        error: 'Erro na análise da agenda pelo Gemini',
        details: error?.message || String(error)
      });
    }
  });

  // 2. Parse Natural Language Event Creation
  app.post('/api/gemini/parse-event', async (req: Request, res: Response) => {
    try {
      const { textPrompt, referenceDate } = req.body;

      if (!textPrompt) {
        res.status(400).json({ error: 'Texto descritivo é obrigatório.' });
        return;
      }

      const ref = referenceDate || new Date().toISOString();

      if (!aiClient) {
        // Fallback parser if API key is not yet set
        const now = new Date();
        const start = new Date(now.getTime() + 3600000);
        const end = new Date(start.getTime() + 3600000);
        return res.json({
          event: {
            title: textPrompt.slice(0, 40),
            start: start.toISOString(),
            end: end.toISOString(),
            isAllDay: false,
            location: 'A definir',
            description: `Criado a partir de: "${textPrompt}"`,
            reminderMinutes: [15],
            category: 'work'
          }
        });
      }

      const prompt = `Você é um assistente de calendário inteligente. Converta a solicitação do usuário em linguagem natural em um evento de calendário estruturado.
Data e hora de referência atual: ${ref}
Texto do usuário: "${textPrompt}"

Regras:
1. Extraia título claro e profissional.
2. Defina datas de início (start) e término (end) em formato ISO 8601 exato (ex: 2026-10-18T14:00:00). Se a duração não for dita, use 1 hora padrão.
3. Se for o dia todo, marque isAllDay = true.
4. Identifique local ou link (se mencionado).
5. Atribua uma categoria: 'work', 'personal', 'meeting', 'health', ou 'urgent'.
6. Lembretes padrão em minutos (ex: [15] para 15 minutos antes).`;

      const aiResponse = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              start: { type: Type.STRING },
              end: { type: Type.STRING },
              isAllDay: { type: Type.BOOLEAN },
              location: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              reminderMinutes: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER }
              }
            },
            required: ['title', 'start', 'end', 'isAllDay', 'category']
          }
        }
      });

      const parsed = JSON.parse(aiResponse.text || '{}');
      res.json({ event: parsed });
    } catch (error: any) {
      console.error('Error parsing natural language event:', error);
      res.status(500).json({
        error: 'Falha ao processar evento com IA',
        details: error?.message || String(error)
      });
    }
  });

  // 3. Daily Executive Briefing (Horizonte 24h)
  app.post('/api/gemini/daily-briefing', async (req: Request, res: Response) => {
    try {
      const { events } = req.body;

      if (!aiClient) {
        return res.json({
          briefing: 'Bom dia! Você tem compromissos importantes nas próximas 24 horas. Verifique seus links do Google Meet e mantenha tempo reservado para pausas estratégicas.'
        });
      }

      const prompt = `Gere um briefing executivo matinal motivador, pontual e elegante em português (máximo 3 parágrafos curtos) para os eventos das próximas 24 horas:
${JSON.stringify(events || [])}
Destaque o primeiro evento crítico, momentos de respiro e deseje um dia produtivo.`;

      const aiResponse = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt
      });

      res.json({ briefing: aiResponse.text });
    } catch (error: any) {
      console.error('Error generating daily briefing:', error);
      res.status(500).json({ error: 'Erro ao gerar briefing diário' });
    }
  });

  // --- Vite Dev Server Middleware or Static Serve ---
  const server = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Chronos Calendar Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
