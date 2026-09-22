"use client";

import { useEffect, useMemo, useState, type ElementType, type FormEvent } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlarmClock,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Package,
  Palette,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  Sun,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  clients,
  initialAppointments,
  initialTransactions,
  products,
  professionals,
  revenueData,
  serviceMix,
  services,
  type Appointment,
  type AppointmentStatus,
  type Client,
  type Transaction,
} from "@/lib/demo-data";

type View = "dashboard" | "agenda" | "clients" | "team" | "services" | "cash" | "inventory" | "reports" | "settings";
type Modal = "appointment" | "transaction" | "client" | null;
type Density = "comfortable" | "compact";

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: Record<string, unknown>) => unknown;
    },
    options?: { signal: AbortSignal },
  ) => void | Promise<void>;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
const clock = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

const navigation: { id: View; label: string; icon: ElementType; group?: string }[] = [
  { id: "dashboard", label: "Visão geral", icon: LayoutDashboard },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "clients", label: "Clientes", icon: UserRound },
  { id: "team", label: "Profissionais", icon: UsersRound },
  { id: "services", label: "Serviços", icon: Sparkles },
  { id: "cash", label: "Financeiro", icon: WalletCards, group: "Gestão" },
  { id: "inventory", label: "Estoque", icon: Package },
  { id: "reports", label: "Relatórios", icon: TrendingUp },
  { id: "settings", label: "Configurações", icon: Settings, group: "Sistema" },
];

const viewTitles: Record<View, { title: string; description: string }> = {
  dashboard: { title: "Visão geral", description: "O que está acontecendo no salão hoje." },
  agenda: { title: "Agenda", description: "Atendimentos, horários livres e ocupação da equipe." },
  clients: { title: "Clientes", description: "Relacionamento, histórico e recorrência." },
  team: { title: "Profissionais", description: "Equipe, desempenho e comissões." },
  services: { title: "Serviços", description: "Catálogo, duração, preços e repasses." },
  cash: { title: "Financeiro", description: "Movimentações e posição do caixa em tempo real." },
  inventory: { title: "Estoque", description: "Insumos, produtos e alertas de reposição." },
  reports: { title: "Relatórios", description: "Receita, ocupação e composição dos serviços." },
  settings: { title: "Configurações", description: "Identidade, aparência e preferências do ORBI." },
};

const statusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};

function sameDay(value: string, date: Date) {
  const itemDate = new Date(value);
  return itemDate.toDateString() === date.toDateString();
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  detail,
  icon: Icon,
  tone = "indigo",
}: {
  label: string;
  value: string;
  change?: string;
  detail: string;
  icon: ElementType;
  tone?: "indigo" | "coral" | "teal" | "gold";
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-icon--${tone}`}><Icon /></div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{change ? <b>{change}</b> : null} {detail}</p>
      </div>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <CalendarDays />
      <p>{message}</p>
    </div>
  );
}

export function OrbiApp() {
  const [view, setView] = useState<View>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [agendaDate, setAgendaDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [clientList, setClientList] = useState<Client[]>(clients);
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [density, setDensity] = useState<Density>("comfortable");
  const [accent, setAccent] = useState("#6558f5");
  const [salonName, setSalonName] = useState("Studio ORBI");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("orbi-preferences") ?? "{}") as {
        darkMode?: boolean;
        density?: Density;
        accent?: string;
        salonName?: string;
        appointments?: Appointment[];
        transactions?: Transaction[];
        clientList?: Client[];
      };
      if (typeof saved.darkMode === "boolean") setDarkMode(saved.darkMode);
      if (saved.density) setDensity(saved.density);
      if (saved.accent) setAccent(saved.accent);
      if (saved.salonName) setSalonName(saved.salonName);
      if (saved.appointments?.length) setAppointments(saved.appointments);
      if (saved.transactions?.length) setTransactions(saved.transactions);
      if (saved.clientList?.length) setClientList(saved.clientList);
    } catch {
      localStorage.removeItem("orbi-preferences");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.dataset.density = density;
    document.documentElement.style.setProperty("--brand", accent);
    if (loaded) {
      localStorage.setItem(
        "orbi-preferences",
        JSON.stringify({ darkMode, density, accent, salonName, appointments, transactions, clientList }),
      );
    }
  }, [darkMode, density, accent, salonName, appointments, transactions, clientList, loaded]);

  const todaysAppointments = useMemo(
    () => appointments.filter((appointment) => sameDay(appointment.startsAt, agendaDate)),
    [appointments, agendaDate],
  );

  const income = transactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0);
  const balance = 200 + income - expenses;

  function addAppointment(input: { clientId: string; professionalId: string; serviceId: string; time: string; notes?: string }) {
    const client = clientList.find((item) => item.id === input.clientId);
    const professional = professionals.find((item) => item.id === input.professionalId);
    const service = services.find((item) => item.id === input.serviceId);
    if (!client || !professional || !service) throw new Error("Dados do atendimento incompletos.");
    const [hour, minute] = input.time.split(":").map(Number);
    const startsAt = new Date(agendaDate);
    startsAt.setHours(hour, minute, 0, 0);
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
    const conflict = appointments.some(
      (item) =>
        item.professionalId === professional.id &&
        item.status !== "CANCELED" &&
        new Date(item.startsAt) < endsAt &&
        new Date(item.endsAt) > startsAt,
    );
    if (conflict) throw new Error(`${professional.name} já possui um atendimento nesse horário.`);
    const created: Appointment = {
      id: crypto.randomUUID(),
      clientId: client.id,
      clientName: client.name,
      professionalId: professional.id,
      professionalName: professional.name,
      serviceIds: [service.id],
      services: [service.name],
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      status: "SCHEDULED",
      total: service.price,
      notes: input.notes,
    };
    setAppointments((current) => [...current, created]);
    return created;
  }

  function addTransaction(input: Omit<Transaction, "id" | "occurredAt">) {
    const created: Transaction = { ...input, id: crypto.randomUUID(), occurredAt: new Date().toISOString() };
    setTransactions((current) => [created, ...current]);
    return created;
  }

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool(
        {
          name: "list_today_appointments",
          title: "Consultar agenda de hoje",
          description: "Lista os atendimentos visíveis na agenda atual do ORBI.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute: () => ({ count: todaysAppointments.length, appointments: todaysAppointments }),
        },
        { signal: lifecycle.signal },
      );
      await context.registerTool(
        {
          name: "create_appointment",
          title: "Criar agendamento",
          description: "Cria um atendimento no ORBI usando cliente, profissional, serviço e horário existentes.",
          inputSchema: {
            type: "object",
            properties: {
              clientId: { type: "string" },
              professionalId: { type: "string" },
              serviceId: { type: "string" },
              time: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
            },
            required: ["clientId", "professionalId", "serviceId", "time"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: (input) => addAppointment(input as { clientId: string; professionalId: string; serviceId: string; time: string }),
        },
        { signal: lifecycle.signal },
      );
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [todaysAppointments]);

  const title = viewTitles[view];

  return (
    <div className="orbi-app">
      <aside className={`sidebar ${mobileMenu ? "sidebar--open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div className="brand-copy"><strong>ORBI</strong><small>gestão inteligente</small></div>
          <button className="mobile-close" aria-label="Fechar menu" onClick={() => setMobileMenu(false)}><X /></button>
        </div>
        <div className="salon-switcher">
          <div className="salon-avatar">{initials(salonName)}</div>
          <div><strong>{salonName}</strong><span>Unidade Campinas</span></div>
          <ChevronDown />
        </div>
        <nav className="nav-list" aria-label="Navegação principal">
          {navigation.map((item, index) => {
            const previous = navigation[index - 1];
            const showGroup = item.group && item.group !== previous?.group;
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {showGroup ? <span className="nav-group">{item.group}</span> : null}
                <button
                  className={view === item.id ? "nav-item nav-item--active" : "nav-item"}
                  onClick={() => { setView(item.id); setMobileMenu(false); }}
                >
                  <Icon /><span>{item.label}</span>
                  {item.id === "inventory" && products.some((product) => product.stock <= product.minimumStock) ? <b>2</b> : null}
                </button>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="plan-card"><Sparkles /><div><b>ORBI Pro</b><span>Todos os recursos ativos</span></div></div>
          <div className="user-row">
            <div className="user-avatar">LA</div>
            <div><strong>Administrador ORBI</strong><span>Conta demonstração</span></div>
            <MoreHorizontal />
          </div>
        </div>
      </aside>

      {mobileMenu ? <button className="menu-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} /> : null}

      <main className="main-shell">
        <header className="topbar">
          <button className="menu-button" aria-label="Abrir menu" onClick={() => setMobileMenu(true)}><Menu /></button>
          <div className="page-intro"><h1>{title.title}</h1><p>{title.description}</p></div>
          <label className="global-search">
            <Search />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, serviço ou horário" />
            <kbd>⌘ K</kbd>
          </label>
          <button className="icon-button notification-button" aria-label="Notificações"><Bell /><span /></button>
          <Button className="primary-action" onClick={() => setModal("appointment")}><Plus /> Novo agendamento</Button>
        </header>

        <div className="content-area">
          {view === "dashboard" ? (
            <DashboardView appointments={todaysAppointments} income={income} setView={setView} setModal={setModal} />
          ) : null}
          {view === "agenda" ? (
            <AgendaView
              date={agendaDate}
              setDate={setAgendaDate}
              appointments={todaysAppointments}
              setAppointments={setAppointments}
              setModal={setModal}
            />
          ) : null}
          {view === "clients" ? <ClientsView clients={clientList} query={query} setModal={setModal} /> : null}
          {view === "team" ? <TeamView /> : null}
          {view === "services" ? <ServicesView query={query} /> : null}
          {view === "cash" ? (
            <CashView transactions={transactions} income={income} expenses={expenses} balance={balance} setModal={setModal} />
          ) : null}
          {view === "inventory" ? <InventoryView query={query} /> : null}
          {view === "reports" ? <ReportsView /> : null}
          {view === "settings" ? (
            <SettingsView
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              density={density}
              setDensity={setDensity}
              accent={accent}
              setAccent={setAccent}
              salonName={salonName}
              setSalonName={setSalonName}
            />
          ) : null}
        </div>
      </main>

      <QuickActionDialogs
        modal={modal}
        setModal={setModal}
        agendaDate={agendaDate}
        clientList={clientList}
        setClientList={setClientList}
        addAppointment={addAppointment}
        addTransaction={addTransaction}
      />
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

function DashboardView({
  appointments,
  income,
  setView,
  setModal,
}: {
  appointments: Appointment[];
  income: number;
  setView: (view: View) => void;
  setModal: (modal: Modal) => void;
}) {
  const confirmed = appointments.filter((item) => item.status === "CONFIRMED" || item.status === "IN_PROGRESS").length;
  return (
    <div className="view-stack">
      <section className="welcome-strip">
        <div><span className="eyebrow">TERÇA, 22 DE SETEMBRO</span><h2>Boa tarde.</h2><p>Seu salão está com <strong>78% de ocupação</strong> hoje. Há 3 horários disponíveis.</p></div>
        <div className="welcome-actions"><Button variant="outline" onClick={() => setView("agenda")}><CalendarDays /> Ver agenda</Button><Button onClick={() => setModal("appointment")}><Plus /> Agendar</Button></div>
      </section>

      <section className="stats-grid">
        <StatCard label="Faturamento hoje" value={money.format(income)} change="+12,4%" detail="comparado à terça passada" icon={CircleDollarSign} tone="indigo" />
        <StatCard label="Atendimentos" value={String(appointments.length + 10)} change={`${confirmed + 5} confirmados`} detail="e 3 aguardando" icon={CalendarDays} tone="coral" />
        <StatCard label="Ticket médio" value={money.format(147.3)} change="+8,1%" detail="nos últimos 30 dias" icon={ReceiptText} tone="teal" />
        <StatCard label="Ocupação da equipe" value="78%" change="+6,2%" detail="acima da média mensal" icon={UsersRound} tone="gold" />
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <SectionHeader title="Faturamento da semana" description="Receita confirmada por dia" action={<button className="text-button">Últimos 7 dias <ChevronDown /></button>} />
          <div className="chart-summary"><strong>{money.format(16335)}</strong><span><ArrowUpRight /> 14,2% na semana</span></div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={revenueData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                <defs><linearGradient id="orbiRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-text)", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-text)", fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                <ChartTooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--panel)" }} formatter={(value) => [money.format(Number(value)), "Receita"]} />
                <Area type="monotone" dataKey="revenue" stroke="var(--brand)" strokeWidth={3} fill="url(#orbiRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel agenda-preview">
          <SectionHeader title="Próximos atendimentos" description={`${appointments.length} na agenda de hoje`} action={<button className="text-button" onClick={() => setView("agenda")}>Ver agenda <ChevronRight /></button>} />
          <div className="timeline-list">
            {appointments.slice(0, 4).map((appointment) => {
              const professional = professionals.find((item) => item.id === appointment.professionalId)!;
              return (
                <div className="timeline-item" key={appointment.id}>
                  <time>{clock.format(new Date(appointment.startsAt))}</time>
                  <span className="timeline-dot" style={{ background: professional.color }} />
                  <div><strong>{appointment.clientName}</strong><span>{appointment.services.join(" + ")}</span></div>
                  <div className="mini-avatar" style={{ background: `${professional.color}20`, color: professional.color }}>{professional.avatar}</div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <article className="panel">
          <SectionHeader title="Equipe hoje" description="Ocupação e próximo horário livre" action={<button className="text-button" onClick={() => setView("team")}>Ver equipe <ChevronRight /></button>} />
          <div className="team-compact-list">
            {professionals.map((person) => (
              <div className="team-compact" key={person.id}>
                <div className="profile-avatar" style={{ background: `${person.color}20`, color: person.color }}>{person.avatar}</div>
                <div className="team-person"><strong>{person.name}</strong><span>{person.specialty}</span></div>
                <div className="occupancy"><div><span>Ocupação</span><b>{person.occupancy}%</b></div><Progress value={person.occupancy} /></div>
                <span className="next-slot">Livre {person.nextSlot}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel insight-panel">
          <div className="insight-icon"><Sparkles /></div>
          <span className="eyebrow">INSIGHT ORBI</span>
          <h3>Você tem 4 clientes sem retorno há mais de 45 dias.</h3>
          <p>Uma campanha de reativação pode recuperar cerca de <strong>{money.format(620)}</strong> em receita.</p>
          <Button variant="outline" onClick={() => setView("clients")}>Ver clientes</Button>
        </article>
      </section>
    </div>
  );
}

function AgendaView({
  date,
  setDate,
  appointments,
  setAppointments,
  setModal,
}: {
  date: Date;
  setDate: (date: Date) => void;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  setModal: (modal: Modal) => void;
}) {
  function moveDate(days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    setDate(next);
  }

  function updateStatus(id: string, status: AppointmentStatus) {
    setAppointments((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    toast.success(`Atendimento marcado como ${statusLabels[status].toLowerCase()}.`);
  }

  return (
    <div className="view-stack">
      <section className="toolbar-card">
        <div className="date-navigator">
          <button onClick={() => moveDate(-1)} aria-label="Dia anterior"><ChevronLeft /></button>
          <button className="date-current" onClick={() => setDate(new Date())}><CalendarDays /><div><strong>{shortDate.format(date)}</strong><span>{date.toLocaleDateString("pt-BR", { year: "numeric" })}</span></div></button>
          <button onClick={() => moveDate(1)} aria-label="Próximo dia"><ChevronRight /></button>
        </div>
        <div className="agenda-summary"><span><b>{appointments.length}</b> atendimentos</span><span><b>{money.format(appointments.reduce((sum, item) => sum + item.total, 0))}</b> previsto</span><Button onClick={() => setModal("appointment")}><Plus /> Agendar horário</Button></div>
      </section>

      <section className="agenda-board">
        <div className="agenda-board-head"><div className="time-label">Horário</div>{professionals.map((person) => <div className="professional-head" key={person.id}><div className="mini-avatar" style={{ background: `${person.color}20`, color: person.color }}>{person.avatar}</div><div><strong>{person.name}</strong><span>{person.specialty}</span></div><b>{person.occupancy}%</b></div>)}</div>
        <div className="agenda-board-body">
          <div className="time-column">{[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00</span>)}</div>
          {professionals.map((person) => {
            const personAppointments = appointments.filter((item) => item.professionalId === person.id).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
            return (
              <div className="professional-column" key={person.id}>
                {personAppointments.length ? personAppointments.map((appointment) => {
                  const hour = new Date(appointment.startsAt).getHours();
                  const top = Math.max(0, (hour - 8) * 68 + new Date(appointment.startsAt).getMinutes() * (68 / 60));
                  const duration = (new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()) / 60_000;
                  const height = Math.max(54, duration * (68 / 60) - 7);
                  return (
                    <article className={`appointment-card status-${appointment.status.toLowerCase()}`} key={appointment.id} style={{ top, height, borderLeftColor: person.color }}>
                      <div className="appointment-time"><Clock3 /> {clock.format(new Date(appointment.startsAt))}–{clock.format(new Date(appointment.endsAt))}<span>{statusLabels[appointment.status]}</span></div>
                      <strong>{appointment.clientName}</strong>
                      <p>{appointment.services.join(" + ")}</p>
                      <div className="appointment-footer"><b>{money.format(appointment.total)}</b><button aria-label="Alterar status" onClick={() => updateStatus(appointment.id, appointment.status === "COMPLETED" ? "CONFIRMED" : "COMPLETED")}><Check /></button></div>
                    </article>
                  );
                }) : <EmptyState message="Agenda livre" />}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ClientsView({ clients: data, query, setModal }: { clients: Client[]; query: string; setModal: (modal: Modal) => void }) {
  const filtered = data.filter((client) => `${client.name} ${client.phone} ${client.email}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="view-stack">
      <section className="stats-grid stats-grid--three">
        <StatCard label="Clientes ativos" value="284" change="+18" detail="neste mês" icon={UsersRound} tone="indigo" />
        <StatCard label="Taxa de retorno" value="71%" change="+4,3%" detail="nos últimos 90 dias" icon={TrendingUp} tone="teal" />
        <StatCard label="Aniversariantes" value="9" detail="nos próximos 30 dias" icon={Sparkles} tone="coral" />
      </section>
      <section className="panel table-panel">
        <SectionHeader title="Base de clientes" description={`${filtered.length} clientes exibidos`} action={<Button onClick={() => setModal("client")}><Plus /> Novo cliente</Button>} />
        <div className="data-table-wrapper">
          <table className="data-table"><thead><tr><th>Cliente</th><th>Contato</th><th>Última visita</th><th>Atendimentos</th><th>Total investido</th><th /></tr></thead>
            <tbody>{filtered.map((client) => <tr key={client.id}><td><div className="table-person"><div className="profile-avatar profile-avatar--small">{initials(client.name)}</div><div><strong>{client.name}</strong><span>{client.tags.map((tag) => <b key={tag}>{tag}</b>)}</span></div></div></td><td><strong className="cell-main">{client.phone}</strong><span className="cell-sub">{client.email}</span></td><td>{client.lastVisit}</td><td>{client.visits}</td><td><strong>{money.format(client.spent)}</strong></td><td><button className="icon-button"><MoreHorizontal /></button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TeamView() {
  return (
    <div className="view-stack">
      <section className="team-grid">
        {professionals.map((person) => (
          <article className="professional-card" key={person.id}>
            <div className="professional-card-top"><div className="profile-avatar profile-avatar--large" style={{ background: `${person.color}20`, color: person.color }}>{person.avatar}</div><button className="icon-button"><MoreHorizontal /></button></div>
            <h3>{person.name}</h3><p>{person.specialty}</p>
            <div className="professional-metrics"><div><span>Faturamento</span><strong>{money.format(person.revenue)}</strong></div><div><span>Comissão</span><strong>{person.commissionRate}%</strong></div></div>
            <div className="occupancy occupancy--card"><div><span>Ocupação em setembro</span><b>{person.occupancy}%</b></div><Progress value={person.occupancy} /></div>
            <div className="availability"><Clock3 /><span>Próximo horário livre</span><b>{person.nextSlot}</b></div>
          </article>
        ))}
        <button className="add-card"><Plus /><strong>Adicionar profissional</strong><span>Convide alguém para a equipe</span></button>
      </section>
      <section className="panel table-panel">
        <SectionHeader title="Desempenho da equipe" description="Consolidado do mês atual" />
        <div className="data-table-wrapper"><table className="data-table"><thead><tr><th>Profissional</th><th>Atendimentos</th><th>Receita</th><th>Ticket médio</th><th>Comissão estimada</th></tr></thead><tbody>{professionals.map((person, index) => <tr key={person.id}><td><div className="table-person"><div className="mini-avatar" style={{ background: `${person.color}20`, color: person.color }}>{person.avatar}</div><strong>{person.name}</strong></div></td><td>{32 - index * 3}</td><td><strong>{money.format(person.revenue)}</strong></td><td>{money.format(person.revenue / (32 - index * 3))}</td><td>{money.format(person.revenue * person.commissionRate / 100)}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

function ServicesView({ query }: { query: string }) {
  const filtered = services.filter((service) => `${service.name} ${service.category}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="view-stack">
      <div className="category-pills"><button className="category-pill category-pill--active">Todos <b>{services.length}</b></button>{["Cabelo", "Unhas", "Olhar", "Barbearia"].map((category) => <button className="category-pill" key={category}>{category} <b>{services.filter((service) => service.category === category).length}</b></button>)}<Button><Plus /> Novo serviço</Button></div>
      <section className="service-grid">{filtered.map((service) => <article className="service-card" key={service.id}><div className="service-accent" style={{ background: service.color }} /><div className="service-card-top"><span>{service.category}</span><button className="icon-button"><MoreHorizontal /></button></div><h3>{service.name}</h3><div className="service-data"><div><Clock3 /><span>{service.durationMinutes} min</span></div><div><CircleDollarSign /><span>{money.format(service.price)}</span></div></div><div className="service-card-foot"><span>Comissão padrão</span><strong>{service.commissionRate}%</strong></div></article>)}</section>
    </div>
  );
}

function CashView({ transactions, income, expenses, balance, setModal }: { transactions: Transaction[]; income: number; expenses: number; balance: number; setModal: (modal: Modal) => void }) {
  return (
    <div className="view-stack">
      <section className="cash-hero">
        <div className="cash-position"><span>Saldo atual do caixa</span><strong>{money.format(balance)}</strong><p>Aberto hoje às 07:52 com {money.format(200)}</p></div>
        <div className="cash-flows"><div><span className="flow-icon flow-icon--income"><ArrowUpRight /></span><div><span>Entradas</span><strong>{money.format(income)}</strong></div></div><div><span className="flow-icon flow-icon--expense"><ArrowDownRight /></span><div><span>Saídas</span><strong>{money.format(expenses)}</strong></div></div></div>
        <div className="cash-actions"><Button onClick={() => setModal("transaction")}><Plus /> Lançar movimento</Button><Button variant="outline">Fechar caixa</Button></div>
      </section>
      <section className="dashboard-grid">
        <article className="panel payment-panel"><SectionHeader title="Formas de pagamento" description="Distribuição das entradas de hoje" /><div className="payment-bars">{[{ label: "Pix", value: 46, amount: 402.5 }, { label: "Cartão de crédito", value: 32, amount: 280 }, { label: "Cartão de débito", value: 14, amount: 120 }, { label: "Dinheiro", value: 8, amount: 75 }].map((item) => <div key={item.label}><div><span>{item.label}</span><b>{money.format(item.amount)} · {item.value}%</b></div><Progress value={item.value} /></div>)}</div></article>
        <article className="panel cash-note"><div className="insight-icon"><CreditCard /></div><h3>Conciliação simples</h3><p>Os recebimentos registrados somam <strong>{money.format(income)}</strong>. Confira as maquininhas antes do fechamento.</p><button className="text-button">Ver conferência <ChevronRight /></button></article>
      </section>
      <section className="panel table-panel"><SectionHeader title="Movimentações de hoje" description={`${transactions.length} lançamentos registrados`} action={<button className="text-button">Exportar CSV</button>} /><div className="data-table-wrapper"><table className="data-table"><thead><tr><th>Horário</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th>Valor</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id}><td>{clock.format(new Date(transaction.occurredAt))}</td><td><strong>{transaction.description}</strong></td><td><span className="soft-badge">{transaction.category}</span></td><td>{transaction.paymentMethod}</td><td><strong className={transaction.type === "INCOME" ? "money-positive" : "money-negative"}>{transaction.type === "INCOME" ? "+" : "−"} {money.format(transaction.amount)}</strong></td></tr>)}</tbody></table></div></section>
    </div>
  );
}

function InventoryView({ query }: { query: string }) {
  const filtered = products.filter((product) => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query.toLowerCase()));
  const lowStock = products.filter((product) => product.stock <= product.minimumStock).length;
  return (
    <div className="view-stack">
      <section className="stats-grid stats-grid--three"><StatCard label="Itens cadastrados" value={String(products.length)} detail="em 5 categorias" icon={Package} tone="indigo" /><StatCard label="Estoque baixo" value={String(lowStock)} detail="precisam de reposição" icon={AlarmClock} tone="coral" /><StatCard label="Valor em estoque" value={money.format(products.reduce((sum, item) => sum + item.stock * item.costPrice, 0))} detail="a preço de custo" icon={CircleDollarSign} tone="teal" /></section>
      {lowStock ? <section className="stock-alert"><AlarmClock /><div><strong>{lowStock} produtos atingiram o estoque mínimo</strong><span>Crie uma lista de compras para não interromper atendimentos.</span></div><Button variant="outline">Gerar lista</Button></section> : null}
      <section className="panel table-panel"><SectionHeader title="Produtos e insumos" description={`${filtered.length} itens exibidos`} action={<Button><Plus /> Novo produto</Button>} /><div className="data-table-wrapper"><table className="data-table"><thead><tr><th>Produto</th><th>SKU</th><th>Categoria</th><th>Saldo</th><th>Estoque mínimo</th><th>Custo médio</th><th /></tr></thead><tbody>{filtered.map((product) => { const low = product.stock <= product.minimumStock; return <tr key={product.id}><td><div className="table-person"><div className={`product-icon ${low ? "product-icon--low" : ""}`}><Package /></div><strong>{product.name}</strong></div></td><td><code>{product.sku}</code></td><td><span className="soft-badge">{product.category}</span></td><td><strong className={low ? "money-negative" : ""}>{product.stock} {product.unit}</strong>{low ? <span className="cell-sub">Repor estoque</span> : null}</td><td>{product.minimumStock} {product.unit}</td><td>{money.format(product.costPrice)}</td><td><button className="icon-button"><MoreHorizontal /></button></td></tr>; })}</tbody></table></div></section>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="view-stack">
      <section className="stats-grid"><StatCard label="Receita no mês" value={money.format(42680)} change="+11,8%" detail="vs. mês anterior" icon={CircleDollarSign} tone="indigo" /><StatCard label="Lucro estimado" value={money.format(18140)} change="42,5%" detail="de margem" icon={TrendingUp} tone="teal" /><StatCard label="Atendimentos" value="298" change="+24" detail="vs. mês anterior" icon={CalendarDays} tone="coral" /><StatCard label="Novos clientes" value="36" change="+9" detail="no período" icon={UserRound} tone="gold" /></section>
      <section className="dashboard-grid">
        <article className="panel chart-panel"><SectionHeader title="Receita e atendimentos" description="Desempenho dos últimos sete dias" action={<button className="text-button">Setembro <ChevronDown /></button>} /><div className="chart-box chart-box--tall"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}><BarChart data={revenueData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-text)", fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-text)", fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} /><ChartTooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--panel)" }} formatter={(value) => money.format(Number(value))} /><Bar dataKey="revenue" fill="var(--brand)" radius={[7, 7, 2, 2]} maxBarSize={38} /></BarChart></ResponsiveContainer></div></article>
        <article className="panel mix-panel"><SectionHeader title="Composição dos serviços" description="Participação na receita do mês" /><div className="mix-content"><div className="donut-box"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}><PieChart><Pie data={serviceMix} dataKey="value" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">{serviceMix.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie></PieChart></ResponsiveContainer><div><strong>100%</strong><span>receita</span></div></div><div className="mix-legend">{serviceMix.map((item) => <div key={item.name}><span style={{ background: item.color }} /><b>{item.name}</b><strong>{item.value}%</strong></div>)}</div></div></article>
      </section>
      <section className="panel table-panel"><SectionHeader title="Ranking de serviços" description="Por receita gerada no mês" /><div className="data-table-wrapper"><table className="data-table"><thead><tr><th>Posição</th><th>Serviço</th><th>Realizados</th><th>Receita</th><th>Participação</th></tr></thead><tbody>{services.slice(0, 5).sort((a, b) => b.price - a.price).map((service, index) => <tr key={service.id}><td><strong>#{index + 1}</strong></td><td><div className="table-person"><span className="service-dot" style={{ background: service.color }} /><strong>{service.name}</strong></div></td><td>{32 - index * 4}</td><td><strong>{money.format(service.price * (32 - index * 4))}</strong></td><td><div className="share-cell"><Progress value={28 - index * 4} /><span>{28 - index * 4}%</span></div></td></tr>)}</tbody></table></div></section>
    </div>
  );
}

function SettingsView({ darkMode, setDarkMode, density, setDensity, accent, setAccent, salonName, setSalonName }: { darkMode: boolean; setDarkMode: (value: boolean) => void; density: Density; setDensity: (value: Density) => void; accent: string; setAccent: (value: string) => void; salonName: string; setSalonName: (value: string) => void }) {
  return (
    <div className="settings-layout">
      <nav className="settings-nav"><button className="settings-nav--active"><Palette /> Aparência</button><button><Sparkles /> Identidade do salão</button><button><Bell /> Notificações</button><button><CreditCard /> Plano e cobrança</button></nav>
      <div className="settings-content">
        <section className="panel settings-panel"><SectionHeader title="Identidade do salão" description="Essas informações aparecem no topo do sistema e nos documentos." /><div className="form-grid"><label className="field field--wide"><span>Nome do estabelecimento</span><Input value={salonName} onChange={(event) => setSalonName(event.target.value)} /></label><label className="field"><span>Telefone</span><Input defaultValue="+55 00 00000-0000" /></label><label className="field"><span>E-mail</span><Input defaultValue="contato@example.invalid" /></label></div><div className="settings-actions"><Button onClick={() => toast.success("Identidade atualizada.")}>Salvar alterações</Button></div></section>
        <section className="panel settings-panel"><SectionHeader title="Aparência" description="Personalize o ORBI para combinar com a identidade do seu salão." /><div className="setting-row"><div><strong>Tema escuro</strong><span>Reduz o brilho e melhora o conforto em ambientes pouco iluminados.</span></div><div className="theme-toggle"><Sun /><Switch checked={darkMode} onCheckedChange={setDarkMode} /><Moon /></div></div><div className="setting-block"><strong>Cor principal</strong><span>Aplicada em botões, gráficos e destaques.</span><div className="color-options">{["#6558f5", "#246bfe", "#1f9d8b", "#e05943", "#b47716", "#151a2d"].map((color) => <button key={color} aria-label={`Usar cor ${color}`} className={accent === color ? "color-swatch color-swatch--active" : "color-swatch"} style={{ background: color }} onClick={() => setAccent(color)}>{accent === color ? <Check /> : null}</button>)}</div></div><div className="setting-block"><strong>Densidade da interface</strong><span>Ajusta os espaços entre os elementos.</span><div className="density-options"><button className={density === "comfortable" ? "density-card density-card--active" : "density-card"} onClick={() => setDensity("comfortable")}><div><i /><i /><i /></div><strong>Confortável</strong><span>Mais espaço e leitura</span></button><button className={density === "compact" ? "density-card density-card--active" : "density-card"} onClick={() => setDensity("compact")}><div className="density-mini"><i /><i /><i /><i /></div><strong>Compacta</strong><span>Mais dados por tela</span></button></div></div></section>
        <section className="panel settings-panel"><SectionHeader title="Preferências operacionais" description="Comportamentos padrão para o dia a dia." /><div className="setting-row"><div><strong>Confirmação automática</strong><span>Marca novos agendamentos como confirmados.</span></div><Switch /></div><div className="setting-row"><div><strong>Alertas de estoque</strong><span>Avisa quando um item chega ao nível mínimo.</span></div><Switch defaultChecked /></div><div className="setting-row"><div><strong>Resumo diário</strong><span>Envia o fechamento da operação por e-mail.</span></div><Switch defaultChecked /></div></section>
      </div>
    </div>
  );
}

function QuickActionDialogs({ modal, setModal, agendaDate, clientList, setClientList, addAppointment, addTransaction }: { modal: Modal; setModal: (modal: Modal) => void; agendaDate: Date; clientList: Client[]; setClientList: React.Dispatch<React.SetStateAction<Client[]>>; addAppointment: (input: { clientId: string; professionalId: string; serviceId: string; time: string; notes?: string }) => Appointment; addTransaction: (input: Omit<Transaction, "id" | "occurredAt">) => Transaction }) {
  const [clientId, setClientId] = useState(clientList[0]?.id ?? "");
  const [professionalId, setProfessionalId] = useState(professionals[0].id);
  const [serviceId, setServiceId] = useState(services[0].id);
  const [time, setTime] = useState("09:00");
  const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  function submitAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = addAppointment({ clientId, professionalId, serviceId, time });
      setModal(null);
      toast.success("Agendamento criado", { description: `${result.clientName}, às ${time}.` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível agendar.");
    }
  }

  function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(String(form.get("amount") ?? "0").replace(",", "."));
    if (!amount || amount <= 0) return toast.error("Informe um valor válido.");
    addTransaction({ type: transactionType, description: String(form.get("description")), category: String(form.get("category")), amount, paymentMethod: String(form.get("paymentMethod")) });
    setModal(null);
    toast.success("Movimentação registrada.");
  }

  function submitClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (clientName.trim().length < 2 || clientPhone.trim().length < 8) return toast.error("Preencha nome e telefone.");
    const created: Client = { id: crypto.randomUUID(), name: clientName, phone: clientPhone, email: "", tags: ["Nova"], lastVisit: "Ainda não visitou", visits: 0, spent: 0 };
    setClientList((current) => [created, ...current]);
    setClientId(created.id);
    setClientName(""); setClientPhone(""); setModal(null);
    toast.success("Cliente cadastrado.");
  }

  return (
    <>
      <Dialog open={modal === "appointment"} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="orbi-dialog"><DialogHeader><DialogTitle>Novo agendamento</DialogTitle><DialogDescription>{shortDate.format(agendaDate)} · selecione os dados do atendimento.</DialogDescription></DialogHeader><form onSubmit={submitAppointment} className="dialog-form"><label className="field"><span>Cliente</span><Select value={clientId} onValueChange={setClientId}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{clientList.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></label><div className="form-grid"><label className="field"><span>Profissional</span><Select value={professionalId} onValueChange={setProfessionalId}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{professionals.map((professional) => <SelectItem key={professional.id} value={professional.id}>{professional.name}</SelectItem>)}</SelectContent></Select></label><label className="field"><span>Horário</span><Input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label></div><label className="field"><span>Serviço</span><Select value={serviceId} onValueChange={setServiceId}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{services.map((service) => <SelectItem key={service.id} value={service.id}>{service.name} · {money.format(service.price)}</SelectItem>)}</SelectContent></Select></label><div className="booking-summary"><Clock3 /><div><span>Duração prevista</span><strong>{services.find((item) => item.id === serviceId)?.durationMinutes} minutos</strong></div><div><span>Valor</span><strong>{money.format(services.find((item) => item.id === serviceId)?.price ?? 0)}</strong></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setModal(null)}>Cancelar</Button><Button type="submit">Confirmar agendamento</Button></DialogFooter></form></DialogContent>
      </Dialog>
      <Dialog open={modal === "transaction"} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="orbi-dialog"><DialogHeader><DialogTitle>Novo movimento de caixa</DialogTitle><DialogDescription>Registre uma entrada ou saída com forma de pagamento.</DialogDescription></DialogHeader><form onSubmit={submitTransaction} className="dialog-form"><div className="transaction-type"><button type="button" className={transactionType === "INCOME" ? "type-choice type-choice--active" : "type-choice"} onClick={() => setTransactionType("INCOME")}><ArrowUpRight /> Entrada</button><button type="button" className={transactionType === "EXPENSE" ? "type-choice type-choice--active type-choice--expense" : "type-choice"} onClick={() => setTransactionType("EXPENSE")}><ArrowDownRight /> Saída</button></div><label className="field"><span>Descrição</span><Input name="description" placeholder="Ex.: Pagamento de serviço" required /></label><div className="form-grid"><label className="field"><span>Valor</span><Input name="amount" inputMode="decimal" placeholder="0,00" required /></label><label className="field"><span>Categoria</span><Input name="category" placeholder="Serviços" required /></label></div><label className="field"><span>Forma de pagamento</span><Select name="paymentMethod" defaultValue="PIX"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PIX">Pix</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Crédito">Cartão de crédito</SelectItem><SelectItem value="Débito">Cartão de débito</SelectItem><SelectItem value="Transferência">Transferência</SelectItem></SelectContent></Select></label><DialogFooter><Button type="button" variant="outline" onClick={() => setModal(null)}>Cancelar</Button><Button type="submit">Registrar movimento</Button></DialogFooter></form></DialogContent></Dialog>
      <Dialog open={modal === "client"} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="orbi-dialog"><DialogHeader><DialogTitle>Novo cliente</DialogTitle><DialogDescription>Cadastre os dados essenciais. O histórico será construído automaticamente.</DialogDescription></DialogHeader><form onSubmit={submitClient} className="dialog-form"><label className="field"><span>Nome completo</span><Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Nome da cliente" required /></label><label className="field"><span>WhatsApp</span><Input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="+55 00 00000-0000" required /></label><label className="field"><span>E-mail <em>opcional</em></span><Input type="email" placeholder="cliente@example.invalid" /></label><DialogFooter><Button type="button" variant="outline" onClick={() => setModal(null)}>Cancelar</Button><Button type="submit">Cadastrar cliente</Button></DialogFooter></form></DialogContent></Dialog>
    </>
  );
}
