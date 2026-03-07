# Sistema de Gestão de Consórcios

Sistema completo para gerenciamento de consórcios financeiros.

**Stack:** Go · React · Tailwind CSS · PostgreSQL

---

## Estrutura do Projeto

```
consorcios/
├── docker-compose.yml
├── backend/
│   ├── cmd/api/main.go          # Entrypoint
│   ├── internal/
│   │   ├── db/                  # Conexão com banco
│   │   ├── models/              # Tipos de dados
│   │   └── handlers/            # Handlers HTTP
│   ├── db/migrations/           # Schema SQL
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── pages/               # Páginas
    │   ├── components/          # Componentes reutilizáveis
    │   ├── lib/                 # API client, utilitários
    │   └── types/               # TypeScript types
    └── Dockerfile
```

---

## Rodando com Docker (recomendado)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- PostgreSQL: localhost:5432

---

## Rodando localmente (desenvolvimento)

### Pré-requisitos
- Go 1.22+
- Node.js 20+
- PostgreSQL rodando localmente

### Backend

```bash
cd backend
go mod tidy
go run ./cmd/api
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

### Consórcios
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/consorcios | Listar todos |
| POST | /api/consorcios | Criar consórcio |
| GET | /api/consorcios/:id | Detalhes |
| PUT | /api/consorcios/:id | Atualizar |
| DELETE | /api/consorcios/:id | Excluir |
| GET | /api/consorcios/:id/periodos | Listar períodos |
| POST | /api/consorcios/:id/gerar-periodos | Gerar períodos automáticos |
| GET | /api/consorcios/:id/participantes | Listar participantes do consórcio |
| POST | /api/consorcios/:id/participantes | Adicionar participante |
| PATCH | /api/consorcios/:cid/participantes/:pid/status | Alterar status |
| DELETE | /api/consorcios/:cid/participantes/:pid | Remover participante |

### Participantes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/participantes | Listar todos |
| POST | /api/participantes | Criar |
| GET | /api/participantes/:id | Detalhes |
| PUT | /api/participantes/:id | Atualizar |
| DELETE | /api/participantes/:id | Excluir |
| GET | /api/participantes/:id/resumo | Resumo financeiro completo |
| GET | /api/participantes/:id/consolidacao?data=YYYY-MM-DD | Consolidação diária |

### Pagamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/pagamentos | Listar (filtros: consorcio_id, participante_id) |
| POST | /api/pagamentos | Registrar pagamento |
| DELETE | /api/pagamentos/:id | Excluir |

### Recebimentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/recebimentos | Listar todos |
| POST | /api/recebimentos | Registrar contemplação (calcula taxa automaticamente) |
| DELETE | /api/recebimentos/:id | Excluir |

### Dashboard
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/dashboard | Dados consolidados |

---

## Funcionalidades

- **Consórcios**: Cadastro com cota inicial, taxa de aumento progressiva, taxa administrativa, periodicidade (diário/semanal/mensal)
- **Períodos automáticos**: Geração automática de todos os períodos com datas e valores calculados
- **Participantes**: Cadastro com múltiplos consórcios simultâneos
- **Pagamentos manuais**: Registro pelo administrador com histórico completo
- **Contemplações**: Registro com desconto automático da taxa administrativa
- **Dívida automática**: Cálculo de parcelas em aberto via views SQL
- **Consolidação diária**: Total a pagar e a receber por participante em qualquer data
- **Dashboard**: Visão geral com métricas financeiras e próximos recebimentos
