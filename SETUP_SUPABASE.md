# Setup Prisma + Supabase

## 1. Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com) et créer un compte
2. Cliquer **New project**
3. Choisir un nom, un mot de passe (note-le), une région proche
4. Attendre que le projet soit prêt (~2 min)

---

## 2. Récupérer la connection string

Dans le dashboard Supabase :

**Settings → Database → Connection string → URI**

Copier la chaîne qui ressemble à :

```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

> Remplacer `[password]` par le mot de passe choisi à l'étape 1.

Il y a deux modes de connexion :
- **Transaction mode** (port `6543`) — pour les environnements serverless (Next.js, Edge, etc.) ✅ recommandé ici
- **Session mode** (port `5432`) — pour les connexions longue durée

---

## 3. Activer l'extension pgvector

Dans le dashboard Supabase :

**Database → Extensions → chercher "vector" → activer**

Ou via l'éditeur SQL :

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 4. Mettre à jour le `.env`

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

> `DIRECT_URL` est nécessaire pour les migrations Prisma (pgBouncer ne supporte pas les migrations).

---

## 5. Mettre à jour `prisma/schema.prisma`

Ajouter `url` et `directUrl` dans le bloc `datasource` :

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [vector]
}
```

---

## 6. Lancer les migrations

```bash
npx prisma migrate dev --name init
```

Cela va :
- Créer les tables dans Supabase
- Générer le client Prisma

---

## 7. Vérifier la connexion

```bash
npx prisma studio
```

Ouvre une interface web sur `http://localhost:5555` pour explorer les données.

---

## Récapitulatif des variables d'environnement

| Variable       | Valeur                              | Usage                        |
|----------------|-------------------------------------|------------------------------|
| `DATABASE_URL` | Connection string mode Transaction  | Runtime (app Next.js)        |
| `DIRECT_URL`   | Connection string mode Session      | Migrations Prisma uniquement |
