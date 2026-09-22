# ORBI

Plataforma full stack de gestão para salões de beleza, criada para concentrar a operação em uma única tela: agenda, clientes, profissionais, serviços, fluxo de caixa, estoque, relatórios e personalização.

## Arquitetura

- `apps/web`: Next.js 16 + React 19 + Tailwind CSS, publicado no Vercel.
- `apps/api`: Node.js + Express + Prisma, publicado no Render.
- PostgreSQL gerenciado pelo Render.
- Autenticação JWT e isolamento dos dados por salão.

## Recursos principais

- Agenda diária por profissional, com múltiplos serviços por atendimento.
- Cadastro de clientes, histórico e indicadores de recorrência.
- Gestão de equipe, especialidades, comissão e disponibilidade.
- Catálogo de serviços com duração, preço, categoria e comissão.
- Abertura e fechamento de caixa, entradas, saídas e formas de pagamento.
- Estoque com alerta de nível mínimo e movimentações.
- Painel com faturamento, ocupação, ticket médio e próximos atendimentos.
- Relatórios de receita, serviços e desempenho da equipe.
- Personalização de cor, tema, densidade e nome do estabelecimento.
- Interface responsiva para computador, tablet e celular.

## Execução local

### Frontend

```bash
cd apps/web
pnpm install
pnpm dev
```

### API

```bash
cd apps/api
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Copie `.env.example` para `.env` e ajuste as variáveis. A API cria dados de demonstração quando o banco está vazio.

## Acesso inicial

Defina `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` no ambiente da API. A primeira inicialização cria o usuário administrador sem registrar a senha no código-fonte.

## Publicação

O `render.yaml` descreve a API e o PostgreSQL no Render. Para o Vercel, configure a raiz do projeto como `apps/web` e a variável `NEXT_PUBLIC_API_URL` com a URL pública da API acrescida de `/api`.
