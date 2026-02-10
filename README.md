# Car Garage API - Multi-Tenant

API multi-tenant para gerenciamento de garagens de carros com autenticação JWT e upload de imagens.

## 🚀 Estrutura

```
src/
 ├─ server.ts
 ├─ app.ts
 ├─ routes/
 │   ├─ public.routes.ts
 │   ├─ admin.routes.ts
 │   └─ auth.routes.ts
 ├─ middlewares/
 │   ├─ resolveGarage.ts
 │   ├─ auth.ts
 │   └─ upload.ts
 ├─ services/
 │   ├─ garage.service.ts
 │   ├─ car.service.ts
 │   └─ auth.service.ts
 ├─ controllers/
 │   ├─ public.controller.ts
 │   ├─ admin.controller.ts
 │   └─ auth.controller.ts
 └─ prisma/
     └─ client.ts
```

## 📦 Instalação

1. Instale as dependências:
```bash
npm install
```

2. Inicie o banco de dados com Docker Compose:
```bash
docker-compose up -d
```

3. Configure o arquivo `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/car_garage?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=3000
UPLOAD_DIR="./uploads"
```

4. Configure o Prisma:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## 🏃 Executando

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 🔐 Autenticação

### Login
```http
POST /auth/login
Host: garagem1.localhost:3000
Content-Type: application/json

{
  "email": "admin@garagem1.com",
  "password": "senha123"
}
```

Resposta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@garagem1.com",
    "name": "Admin",
    "role": "ADMIN"
  }
}
```

### Usar o token
```http
Authorization: Bearer {token}
```

## 📡 Rotas Públicas

Todas as rotas públicas requerem o header `Host` com o domínio da garagem.

### Obter informações da garagem
```http
GET /public/garage-by-domain
Host: garagem1.localhost:3000
```

### Listar carros disponíveis
```http
GET /public/cars
Host: garagem1.localhost:3000
```

### Obter carro específico
```http
GET /public/cars/:id
Host: garagem1.localhost:3000
```

## 🔧 Rotas Admin

Todas as rotas admin requerem autenticação JWT.

### Listar todos os carros
```http
GET /admin/cars?status=AVAILABLE
Host: garagem1.localhost:3000
Authorization: Bearer {token}
```

### Criar carro
```http
POST /admin/cars
Host: garagem1.localhost:3000
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "brand": "Toyota",
  "model": "Corolla",
  "year": 2023,
  "price": 120000,
  "mileage": 0,
  "description": "Carro novo",
  "images": [file1, file2, ...]
}
```

### Atualizar carro
```http
PUT /admin/cars/:id
Host: garagem1.localhost:3000
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Deletar carro
```http
DELETE /admin/cars/:id
Host: garagem1.localhost:3000
Authorization: Bearer {token}
```

### Obter configurações
```http
GET /admin/settings
Host: garagem1.localhost:3000
Authorization: Bearer {token}
```

### Atualizar configurações
```http
PUT /admin/settings
Host: garagem1.localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Minha Garagem",
  "primaryColor": "#FF0000",
  "secondaryColor": "#0000FF",
  "whatsapp": "+5511999999999"
}
```

## 🎯 Multi-Tenant

O sistema identifica a garagem através do header `Host` da requisição. Cada garagem tem seu próprio domínio único.

Exemplo:
- `garagem1.localhost:3000` → Garagem 1
- `garagem2.localhost:3000` → Garagem 2

## 📝 Notas

- As imagens são salvas no diretório `./uploads` (configurável via `UPLOAD_DIR`)
- O token JWT expira em 7 dias
- Senhas são hasheadas com bcrypt
- Todos os dados são isolados por `garageId`

