import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, type AppointmentStatus, type PaymentMethod, type TransactionType } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET ?? "";

type Session = { userId: string; salonId: string; role: string; email: string };
type AuthRequest = Request & { session?: Session };

const configuredOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, callback) {
      const allowed =
        !origin ||
        configuredOrigins.includes("*") ||
        configuredOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      callback(allowed ? null : new Error("Origem não autorizada"), allowed);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

function asyncRoute(
  handler: (request: AuthRequest, response: Response, next: NextFunction) => Promise<unknown>,
) {
  return (request: AuthRequest, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function authenticate(request: AuthRequest, response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return response.status(401).json({ error: "Sessão não informada." });
  try {
    request.session = jwt.verify(token, jwtSecret) as Session;
    return next();
  } catch {
    return response.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}

function parseId(value: unknown) {
  return z.string().min(1).parse(value);
}

function startOfDay(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date = new Date()) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function atTime(base: Date, hour: number, minute = 0) {
  const result = new Date(base);
  result.setHours(hour, minute, 0, 0);
  return result;
}

async function ensureSeed() {
  if ((await prisma.salon.count()) > 0) return;

  const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? crypto.randomUUID();
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const salon = await prisma.salon.create({
    data: {
      name: "Salão Demonstração ORBI",
      slug: "studio-orbi",
      email: "contato@example.invalid",
      address: "Unidade demonstração",
      users: {
        create: {
          name: "Administrador ORBI",
          email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.invalid",
          passwordHash,
          role: "OWNER",
        },
      },
    },
  });

  const professionals = await Promise.all(
    [
      ["Profissional 01", "Colorista", "#6558f5", 40],
      ["Profissional 02", "Nail designer", "#f27059", 45],
      ["Profissional 03", "Lash designer", "#1f9d8b", 42],
      ["Profissional 04", "Cabeleireiro", "#d59b2c", 40],
    ].map(([name, specialty, color, commissionRate]) =>
      prisma.professional.create({
        data: {
          salonId: salon.id,
          name: String(name),
          specialty: String(specialty),
          color: String(color),
          commissionRate: Number(commissionRate),
          startTime: "08:00",
          endTime: "20:00",
        },
      }),
    ),
  );

  const services = await Promise.all(
    [
      ["Corte feminino", "Cabelo", 60, 120, 40, "#6558f5"],
      ["Coloração premium", "Cabelo", 150, 320, 40, "#8d7ff2"],
      ["Escova", "Cabelo", 50, 90, 40, "#ad9cf5"],
      ["Manicure em gel", "Unhas", 75, 110, 45, "#f27059"],
      ["Extensão de cílios", "Olhar", 120, 210, 42, "#1f9d8b"],
      ["Design de sobrancelhas", "Olhar", 40, 65, 42, "#54b8a9"],
      ["Barba premium", "Barbearia", 45, 75, 40, "#d59b2c"],
    ].map(([name, category, durationMinutes, price, commissionRate, color]) =>
      prisma.service.create({
        data: {
          salonId: salon.id,
          name: String(name),
          category: String(category),
          durationMinutes: Number(durationMinutes),
          price: Number(price),
          commissionRate: Number(commissionRate),
          color: String(color),
        },
      }),
    ),
  );

  const clients = await Promise.all(
    [
      ["Cliente Demonstração 01", "+55 00 00000-0001", "VIP"],
      ["Cliente Demonstração 02", "+55 00 00000-0002", "Recorrente"],
      ["Cliente Demonstração 03", "+55 00 00000-0003", "Nova"],
      ["Cliente Demonstração 04", "+55 00 00000-0004", "Recorrente"],
      ["Cliente Demonstração 05", "+55 00 00000-0005", "VIP"],
      ["Cliente Demonstração 06", "+55 00 00000-0006", "Recorrente"],
    ].map(([name, phone, tag], index) =>
      prisma.client.create({
        data: {
          salonId: salon.id,
          name,
          phone,
          email: `cliente${index + 1}@example.invalid`,
          tags: [tag],
        },
      }),
    ),
  );

  const today = new Date();
  const appointmentInputs = [
    [0, 0, 0, 9, "CONFIRMED"],
    [1, 1, 3, 9, "COMPLETED"],
    [2, 2, 4, 10, "IN_PROGRESS"],
    [3, 3, 6, 11, "CONFIRMED"],
    [4, 0, 1, 13, "SCHEDULED"],
    [5, 3, 6, 14, "SCHEDULED"],
    [1, 1, 3, 15, "SCHEDULED"],
    [3, 2, 5, 16, "SCHEDULED"],
  ] as const;

  for (const [clientIndex, professionalIndex, serviceIndex, hour, status] of appointmentInputs) {
    const service = services[serviceIndex];
    const startsAt = atTime(today, hour);
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
    await prisma.appointment.create({
      data: {
        salonId: salon.id,
        clientId: clients[clientIndex].id,
        professionalId: professionals[professionalIndex].id,
        startsAt,
        endsAt,
        status,
        total: service.price,
        items: {
          create: {
            serviceId: service.id,
            price: service.price,
            duration: service.durationMinutes,
          },
        },
      },
    });
  }

  const cashSession = await prisma.cashSession.create({
    data: { salonId: salon.id, openedBy: "Administrador ORBI", openingAmount: 200 },
  });

  const transactionInputs = [
    ["INCOME", "Manicure em gel — Cliente Demonstração 02", "Serviços", 110, "PIX", 9],
    ["INCOME", "Extensão de cílios — Cliente Demonstração 03", "Serviços", 210, "CREDIT_CARD", 10],
    ["EXPENSE", "Reposição de esmaltes", "Insumos", 86.5, "PIX", 11],
    ["INCOME", "Corte feminino — Cliente Demonstração 01", "Serviços", 120, "DEBIT_CARD", 12],
    ["INCOME", "Barba premium — Cliente Demonstração 06", "Serviços", 75, "CASH", 14],
  ] as const;

  for (const [type, description, category, amount, paymentMethod, hour] of transactionInputs) {
    await prisma.transaction.create({
      data: {
        salonId: salon.id,
        cashSessionId: cashSession.id,
        type,
        description,
        category,
        amount,
        paymentMethod,
        occurredAt: atTime(today, hour),
      },
    });
  }

  await prisma.product.createMany({
    data: [
      { salonId: salon.id, name: "Coloração 6.0", sku: "COL-060", category: "Coloração", stock: 8, minimumStock: 4, costPrice: 32.9, salePrice: 58 },
      { salonId: salon.id, name: "Shampoo profissional 1 L", sku: "SHP-1L", category: "Lavagem", stock: 3, minimumStock: 4, costPrice: 58, salePrice: 98 },
      { salonId: salon.id, name: "Esmalte nude rosé", sku: "ESM-042", category: "Unhas", stock: 12, minimumStock: 5, costPrice: 11.5, salePrice: 22 },
      { salonId: salon.id, name: "Cola para cílios", sku: "CIL-010", category: "Olhar", stock: 2, minimumStock: 3, costPrice: 89, salePrice: null },
      { salonId: salon.id, name: "Luva nitrílica P", sku: "LUV-P", category: "Descartáveis", stock: 6, minimumStock: 3, costPrice: 34.9, salePrice: null },
    ],
  });
}

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "orbi-api", time: new Date().toISOString() });
});

app.post(
  "/api/auth/login",
  asyncRoute(async (request, response) => {
    const input = z
      .object({ email: z.string().email(), password: z.string().min(6) })
      .parse(request.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { salon: true },
    });
    if (!user || !user.active || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return response.status(401).json({ error: "E-mail ou senha incorretos." });
    }
    const session: Session = {
      userId: user.id,
      salonId: user.salonId,
      role: user.role,
      email: user.email,
    };
    const token = jwt.sign(session, jwtSecret, { expiresIn: "12h" });
    return response.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      salon: user.salon,
    });
  }),
);

app.use("/api", authenticate);

app.get(
  "/api/bootstrap",
  asyncRoute(async (request, response) => {
    const salonId = request.session!.salonId;
    const today = new Date();
    const [salon, professionals, services, clients, appointments, transactions, products, cashSession] =
      await Promise.all([
        prisma.salon.findUnique({ where: { id: salonId } }),
        prisma.professional.findMany({ where: { salonId, active: true }, orderBy: { name: "asc" } }),
        prisma.service.findMany({ where: { salonId, active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
        prisma.client.findMany({ where: { salonId }, orderBy: { updatedAt: "desc" }, take: 100 }),
        prisma.appointment.findMany({
          where: { salonId, startsAt: { gte: startOfDay(today), lte: endOfDay(today) } },
          include: { client: true, professional: true, items: { include: { service: true } } },
          orderBy: { startsAt: "asc" },
        }),
        prisma.transaction.findMany({
          where: { salonId, occurredAt: { gte: startOfDay(today), lte: endOfDay(today) } },
          include: { professional: true },
          orderBy: { occurredAt: "desc" },
        }),
        prisma.product.findMany({ where: { salonId, active: true }, orderBy: { name: "asc" } }),
        prisma.cashSession.findFirst({ where: { salonId, status: "OPEN" }, orderBy: { openedAt: "desc" } }),
      ]);
    response.json({ salon, professionals, services, clients, appointments, transactions, products, cashSession });
  }),
);

app.get(
  "/api/appointments",
  asyncRoute(async (request, response) => {
    const salonId = request.session!.salonId;
    const date = request.query.date ? new Date(String(request.query.date)) : new Date();
    const appointments = await prisma.appointment.findMany({
      where: { salonId, startsAt: { gte: startOfDay(date), lte: endOfDay(date) } },
      include: { client: true, professional: true, items: { include: { service: true } } },
      orderBy: { startsAt: "asc" },
    });
    response.json(appointments);
  }),
);

app.post(
  "/api/appointments",
  asyncRoute(async (request, response) => {
    const salonId = request.session!.salonId;
    const input = z
      .object({
        clientId: z.string().min(1),
        professionalId: z.string().min(1),
        serviceIds: z.array(z.string().min(1)).min(1),
        startsAt: z.coerce.date(),
        notes: z.string().max(500).optional(),
        status: z.enum(["SCHEDULED", "CONFIRMED"]).default("SCHEDULED"),
      })
      .parse(request.body);
    const services = await prisma.service.findMany({
      where: { salonId, id: { in: input.serviceIds }, active: true },
    });
    if (services.length !== input.serviceIds.length) {
      return response.status(400).json({ error: "Um ou mais serviços são inválidos." });
    }
    const duration = services.reduce((sum, service) => sum + service.durationMinutes, 0);
    const total = services.reduce((sum, service) => sum + Number(service.price), 0);
    const endsAt = new Date(input.startsAt.getTime() + duration * 60_000);
    const conflict = await prisma.appointment.findFirst({
      where: {
        salonId,
        professionalId: input.professionalId,
        status: { notIn: ["CANCELED", "NO_SHOW"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: input.startsAt },
      },
    });
    if (conflict) return response.status(409).json({ error: "Este profissional já possui atendimento nesse horário." });
    const appointment = await prisma.appointment.create({
      data: {
        salonId,
        clientId: input.clientId,
        professionalId: input.professionalId,
        startsAt: input.startsAt,
        endsAt,
        notes: input.notes,
        status: input.status,
        total,
        items: {
          create: services.map((service) => ({
            serviceId: service.id,
            price: service.price,
            duration: service.durationMinutes,
          })),
        },
      },
      include: { client: true, professional: true, items: { include: { service: true } } },
    });
    response.status(201).json(appointment);
  }),
);

app.patch(
  "/api/appointments/:id/status",
  asyncRoute(async (request, response) => {
    const salonId = request.session!.salonId;
    const status = z
      .enum(["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELED", "NO_SHOW"])
      .parse(request.body.status) as AppointmentStatus;
    const result = await prisma.appointment.updateMany({
      where: { id: parseId(request.params.id), salonId },
      data: { status },
    });
    if (!result.count) return response.status(404).json({ error: "Atendimento não encontrado." });
    response.json({ success: true });
  }),
);

app.get(
  "/api/clients",
  asyncRoute(async (request, response) => {
    const salonId = request.session!.salonId;
    const search = String(request.query.search ?? "").trim();
    const clients = await prisma.client.findMany({
      where: {
        salonId,
        ...(search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] }
          : {}),
      },
      include: { _count: { select: { appointments: true } } },
      orderBy: { updatedAt: "desc" },
      take: 150,
    });
    response.json(clients);
  }),
);

app.post(
  "/api/clients",
  asyncRoute(async (request, response) => {
    const salonId = request.session!.salonId;
    const input = z
      .object({
        name: z.string().min(2).max(120),
        phone: z.string().min(8).max(30),
        email: z.string().email().optional().or(z.literal("")),
        notes: z.string().max(1000).optional(),
        tags: z.array(z.string().max(30)).default([]),
      })
      .parse(request.body);
    const client = await prisma.client.create({ data: { ...input, email: input.email || null, salonId } });
    response.status(201).json(client);
  }),
);

app.get("/api/professionals", asyncRoute(async (request, response) => {
  response.json(await prisma.professional.findMany({ where: { salonId: request.session!.salonId }, orderBy: { name: "asc" } }));
}));

app.post(
  "/api/professionals",
  asyncRoute(async (request, response) => {
    const input = z
      .object({
        name: z.string().min(2),
        specialty: z.string().min(2),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        color: z.string().regex(/^#[0-9a-f]{6}$/i),
        commissionRate: z.coerce.number().min(0).max(100),
      })
      .parse(request.body);
    const professional = await prisma.professional.create({
      data: { ...input, email: input.email || null, salonId: request.session!.salonId },
    });
    response.status(201).json(professional);
  }),
);

app.get("/api/services", asyncRoute(async (request, response) => {
  response.json(await prisma.service.findMany({ where: { salonId: request.session!.salonId }, orderBy: [{ category: "asc" }, { name: "asc" }] }));
}));

app.post(
  "/api/services",
  asyncRoute(async (request, response) => {
    const input = z
      .object({
        name: z.string().min(2),
        category: z.string().min(2),
        durationMinutes: z.coerce.number().int().min(10).max(720),
        price: z.coerce.number().positive(),
        commissionRate: z.coerce.number().min(0).max(100),
        color: z.string().regex(/^#[0-9a-f]{6}$/i),
      })
      .parse(request.body);
    response.status(201).json(await prisma.service.create({ data: { ...input, salonId: request.session!.salonId } }));
  }),
);

app.get(
  "/api/transactions",
  asyncRoute(async (request, response) => {
    const salonId = request.session!.salonId;
    const from = request.query.from ? new Date(String(request.query.from)) : startOfDay(new Date());
    const to = request.query.to ? new Date(String(request.query.to)) : endOfDay(new Date());
    response.json(
      await prisma.transaction.findMany({
        where: { salonId, occurredAt: { gte: from, lte: to } },
        include: { professional: true },
        orderBy: { occurredAt: "desc" },
      }),
    );
  }),
);

app.post(
  "/api/transactions",
  asyncRoute(async (request, response) => {
    const salonId = request.session!.salonId;
    const input = z
      .object({
        type: z.enum(["INCOME", "EXPENSE"]),
        description: z.string().min(2),
        category: z.string().min(2),
        amount: z.coerce.number().positive(),
        paymentMethod: z.enum(["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "TRANSFER", "OTHER"]),
        professionalId: z.string().optional().nullable(),
        occurredAt: z.coerce.date().optional(),
      })
      .parse(request.body);
    const cashSession = await prisma.cashSession.findFirst({ where: { salonId, status: "OPEN" } });
    const transaction = await prisma.transaction.create({
      data: {
        ...input,
        type: input.type as TransactionType,
        paymentMethod: input.paymentMethod as PaymentMethod,
        salonId,
        cashSessionId: cashSession?.id,
      },
    });
    response.status(201).json(transaction);
  }),
);

app.post(
  "/api/cash/open",
  asyncRoute(async (request, response) => {
    const salonId = request.session!.salonId;
    const existing = await prisma.cashSession.findFirst({ where: { salonId, status: "OPEN" } });
    if (existing) return response.status(409).json({ error: "Já existe um caixa aberto." });
    const input = z.object({ openingAmount: z.coerce.number().min(0) }).parse(request.body);
    response.status(201).json(
      await prisma.cashSession.create({
        data: { salonId, openedBy: request.session!.email, openingAmount: input.openingAmount },
      }),
    );
  }),
);

app.post(
  "/api/cash/close",
  asyncRoute(async (request, response) => {
    const salonId = request.session!.salonId;
    const input = z.object({ closingAmount: z.coerce.number().min(0) }).parse(request.body);
    const current = await prisma.cashSession.findFirst({ where: { salonId, status: "OPEN" } });
    if (!current) return response.status(404).json({ error: "Não há caixa aberto." });
    response.json(
      await prisma.cashSession.update({
        where: { id: current.id },
        data: { status: "CLOSED", closingAmount: input.closingAmount, closedAt: new Date(), closedBy: request.session!.email },
      }),
    );
  }),
);

app.get("/api/products", asyncRoute(async (request, response) => {
  response.json(await prisma.product.findMany({ where: { salonId: request.session!.salonId }, orderBy: { name: "asc" } }));
}));

app.post(
  "/api/products",
  asyncRoute(async (request, response) => {
    const input = z
      .object({
        name: z.string().min(2),
        sku: z.string().min(2),
        category: z.string().min(2),
        unit: z.string().default("un"),
        stock: z.coerce.number().min(0),
        minimumStock: z.coerce.number().min(0),
        costPrice: z.coerce.number().min(0),
        salePrice: z.coerce.number().min(0).optional().nullable(),
      })
      .parse(request.body);
    response.status(201).json(await prisma.product.create({ data: { ...input, salonId: request.session!.salonId } }));
  }),
);

app.patch(
  "/api/products/:id/stock",
  asyncRoute(async (request, response) => {
    const salonId = request.session!.salonId;
    const input = z.object({ quantity: z.coerce.number() }).parse(request.body);
    const product = await prisma.product.findFirst({ where: { id: parseId(request.params.id), salonId } });
    if (!product) return response.status(404).json({ error: "Produto não encontrado." });
    const nextStock = Math.max(0, Number(product.stock) + input.quantity);
    response.json(await prisma.product.update({ where: { id: product.id }, data: { stock: nextStock } }));
  }),
);

app.patch(
  "/api/settings",
  asyncRoute(async (request, response) => {
    const input = z
      .object({
        name: z.string().min(2).max(120).optional(),
        phone: z.string().max(30).optional(),
        email: z.string().email().optional(),
        address: z.string().max(250).optional(),
        accentColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
      })
      .parse(request.body);
    response.json(await prisma.salon.update({ where: { id: request.session!.salonId }, data: input }));
  }),
);

app.use((_request, response) => response.status(404).json({ error: "Rota não encontrada." }));

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    return response.status(400).json({ error: "Dados inválidos.", details: error.flatten() });
  }
  console.error(error);
  const message = error instanceof Error && process.env.NODE_ENV !== "production" ? error.message : "Erro interno do servidor.";
  return response.status(500).json({ error: message });
});

async function start() {
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres.");
  }
  await prisma.$connect();
  await ensureSeed();
  app.listen(port, "0.0.0.0", () => {
    console.log(`ORBI API disponível na porta ${port}`);
  });
}

start().catch(async (error) => {
  console.error("Não foi possível iniciar a ORBI API", error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
