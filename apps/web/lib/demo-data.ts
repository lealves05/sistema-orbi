export type Professional = {
  id: string;
  name: string;
  specialty: string;
  color: string;
  avatar: string;
  commissionRate: number;
  occupancy: number;
  revenue: number;
  nextSlot: string;
};

export type Service = {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  commissionRate: number;
  color: string;
  active: boolean;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  tags: string[];
  lastVisit: string;
  visits: number;
  spent: number;
};

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

export type Appointment = {
  id: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  serviceIds: string[];
  services: string[];
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  total: number;
  notes?: string;
};

export type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  description: string;
  category: string;
  amount: number;
  paymentMethod: string;
  occurredAt: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minimumStock: number;
  unit: string;
  costPrice: number;
};

export const professionals: Professional[] = [
  { id: "p1", name: "Profissional 01", specialty: "Colorista", color: "#6558f5", avatar: "P1", commissionRate: 40, occupancy: 82, revenue: 3480, nextSlot: "16:30" },
  { id: "p2", name: "Profissional 02", specialty: "Nail designer", color: "#f27059", avatar: "P2", commissionRate: 45, occupancy: 91, revenue: 2890, nextSlot: "18:00" },
  { id: "p3", name: "Profissional 03", specialty: "Lash designer", color: "#1f9d8b", avatar: "P3", commissionRate: 42, occupancy: 76, revenue: 3220, nextSlot: "17:20" },
  { id: "p4", name: "Profissional 04", specialty: "Cabeleireiro", color: "#d59b2c", avatar: "P4", commissionRate: 40, occupancy: 69, revenue: 2310, nextSlot: "15:30" },
];

export const services: Service[] = [
  { id: "s1", name: "Corte feminino", category: "Cabelo", durationMinutes: 60, price: 120, commissionRate: 40, color: "#6558f5", active: true },
  { id: "s2", name: "Coloração premium", category: "Cabelo", durationMinutes: 150, price: 320, commissionRate: 40, color: "#8d7ff2", active: true },
  { id: "s3", name: "Escova", category: "Cabelo", durationMinutes: 50, price: 90, commissionRate: 40, color: "#ad9cf5", active: true },
  { id: "s4", name: "Manicure em gel", category: "Unhas", durationMinutes: 75, price: 110, commissionRate: 45, color: "#f27059", active: true },
  { id: "s5", name: "Extensão de cílios", category: "Olhar", durationMinutes: 120, price: 210, commissionRate: 42, color: "#1f9d8b", active: true },
  { id: "s6", name: "Design de sobrancelhas", category: "Olhar", durationMinutes: 40, price: 65, commissionRate: 42, color: "#54b8a9", active: true },
  { id: "s7", name: "Barba premium", category: "Barbearia", durationMinutes: 45, price: 75, commissionRate: 40, color: "#d59b2c", active: true },
];

export const clients: Client[] = [
  { id: "c1", name: "Cliente Demonstração 01", phone: "+55 00 00000-0001", email: "cliente01@example.invalid", tags: ["VIP"], lastVisit: "18 set", visits: 18, spent: 2840 },
  { id: "c2", name: "Cliente Demonstração 02", phone: "+55 00 00000-0002", email: "cliente02@example.invalid", tags: ["Recorrente"], lastVisit: "Hoje", visits: 12, spent: 1560 },
  { id: "c3", name: "Cliente Demonstração 03", phone: "+55 00 00000-0003", email: "cliente03@example.invalid", tags: ["Nova"], lastVisit: "Hoje", visits: 1, spent: 210 },
  { id: "c4", name: "Cliente Demonstração 04", phone: "+55 00 00000-0004", email: "cliente04@example.invalid", tags: ["Recorrente"], lastVisit: "11 set", visits: 9, spent: 1180 },
  { id: "c5", name: "Cliente Demonstração 05", phone: "+55 00 00000-0005", email: "cliente05@example.invalid", tags: ["VIP"], lastVisit: "16 set", visits: 21, spent: 3920 },
  { id: "c6", name: "Cliente Demonstração 06", phone: "+55 00 00000-0006", email: "cliente06@example.invalid", tags: ["Recorrente"], lastVisit: "Hoje", visits: 7, spent: 640 },
];

const today = new Date();
const at = (hour: number, minute = 0) => {
  const value = new Date(today);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
};

export const initialAppointments: Appointment[] = [
  { id: "a1", clientId: "c1", clientName: "Cliente Demonstração 01", professionalId: "p1", professionalName: "Profissional 01", serviceIds: ["s1", "s3"], services: ["Corte feminino", "Escova"], startsAt: at(9), endsAt: at(10, 50), status: "CONFIRMED", total: 210 },
  { id: "a2", clientId: "c2", clientName: "Cliente Demonstração 02", professionalId: "p2", professionalName: "Profissional 02", serviceIds: ["s4"], services: ["Manicure em gel"], startsAt: at(9), endsAt: at(10, 15), status: "COMPLETED", total: 110 },
  { id: "a3", clientId: "c3", clientName: "Cliente Demonstração 03", professionalId: "p3", professionalName: "Profissional 03", serviceIds: ["s5"], services: ["Extensão de cílios"], startsAt: at(10), endsAt: at(12), status: "IN_PROGRESS", total: 210 },
  { id: "a4", clientId: "c6", clientName: "Cliente Demonstração 06", professionalId: "p4", professionalName: "Profissional 04", serviceIds: ["s7"], services: ["Barba premium"], startsAt: at(11), endsAt: at(11, 45), status: "CONFIRMED", total: 75 },
  { id: "a5", clientId: "c5", clientName: "Cliente Demonstração 05", professionalId: "p1", professionalName: "Profissional 01", serviceIds: ["s2"], services: ["Coloração premium"], startsAt: at(13), endsAt: at(15, 30), status: "SCHEDULED", total: 320 },
  { id: "a6", clientId: "c4", clientName: "Cliente Demonstração 04", professionalId: "p3", professionalName: "Profissional 03", serviceIds: ["s6"], services: ["Design de sobrancelhas"], startsAt: at(16), endsAt: at(16, 40), status: "SCHEDULED", total: 65 },
];

export const initialTransactions: Transaction[] = [
  { id: "t1", type: "INCOME", description: "Manicure em gel — Cliente Demonstração 02", category: "Serviços", amount: 110, paymentMethod: "PIX", occurredAt: at(10, 18) },
  { id: "t2", type: "INCOME", description: "Extensão de cílios — Cliente Demonstração 03", category: "Serviços", amount: 210, paymentMethod: "Crédito", occurredAt: at(12, 5) },
  { id: "t3", type: "EXPENSE", description: "Reposição de esmaltes", category: "Insumos", amount: 86.5, paymentMethod: "PIX", occurredAt: at(12, 40) },
  { id: "t4", type: "INCOME", description: "Corte feminino — Cliente Demonstração 01", category: "Serviços", amount: 120, paymentMethod: "Débito", occurredAt: at(13, 12) },
  { id: "t5", type: "INCOME", description: "Barba premium — Cliente Demonstração 06", category: "Serviços", amount: 75, paymentMethod: "Dinheiro", occurredAt: at(14, 2) },
];

export const products: Product[] = [
  { id: "i1", name: "Coloração 6.0", sku: "COL-060", category: "Coloração", stock: 8, minimumStock: 4, unit: "un", costPrice: 32.9 },
  { id: "i2", name: "Shampoo profissional 1 L", sku: "SHP-1L", category: "Lavagem", stock: 3, minimumStock: 4, unit: "un", costPrice: 58 },
  { id: "i3", name: "Esmalte nude rosé", sku: "ESM-042", category: "Unhas", stock: 12, minimumStock: 5, unit: "un", costPrice: 11.5 },
  { id: "i4", name: "Cola para cílios", sku: "CIL-010", category: "Olhar", stock: 2, minimumStock: 3, unit: "un", costPrice: 89 },
  { id: "i5", name: "Luva nitrílica P", sku: "LUV-P", category: "Descartáveis", stock: 6, minimumStock: 3, unit: "cx", costPrice: 34.9 },
];

export const revenueData = [
  { day: "Seg", revenue: 1680, appointments: 13 },
  { day: "Ter", revenue: 2140, appointments: 17 },
  { day: "Qua", revenue: 1820, appointments: 14 },
  { day: "Qui", revenue: 2460, appointments: 19 },
  { day: "Sex", revenue: 2910, appointments: 22 },
  { day: "Sáb", revenue: 3380, appointments: 25 },
  { day: "Hoje", revenue: 1945, appointments: 16 },
];

export const serviceMix = [
  { name: "Cabelo", value: 44, color: "#6558f5" },
  { name: "Unhas", value: 24, color: "#f27059" },
  { name: "Olhar", value: 21, color: "#1f9d8b" },
  { name: "Barbearia", value: 11, color: "#d59b2c" },
];
