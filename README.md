# Lista de Compras — 28ª Festa do Livro da USP

Aplicação em **React + Vite + TypeScript + Firebase** para buscar livros diretamente no catálogo da [28ª Festa do Livro da USP (Edusp)](https://festadolivro.edusp.com.br/28-festa-do-livro-da-usp/busca-por-livros) e montar um carrinho de compras organizado por editora com somatório total.

## Funcionalidades

- **Busca imediata na página inicial**: consulta a API oficial (`https://festadolivro.edusp.com.br/api/v1/event-books?flag=28-festa-do-livro-da-usp`) por **Título**, **Autor**, **Editora**, **Assunto** ou **ISBN**, com paginação.
- **Cards de resultado**: exibem nome do livro, autor(es), editora, preço com desconto (além do preço de capa e % de desconto) e botão para adicionar ao carrinho.
- **Carrinho agrupado por editora**: organiza os livros em ordem alfabética por editora, exibe o subtotal de cada editora, permite ajustar quantidades/remover itens e mostra o **resumo da compra** com o somatório total e economia estimada.
- **Cadastro e login com Firebase Auth**: suporte a E-mail/Senha e Google Sign-In.
- **Sincronização na nuvem com Firestore**: cada usuário autenticado tem seu carrinho salvo em `users/{uid}/cartItems/{itemId}` em tempo real (com mesclagem automática dos itens adicionados antes do login).

## Como executar localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure o Firebase:
   - Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
   - Em **Authentication -> Sign-in method**, ative **E-mail/senha** (e opcionalmente **Google**).
   - Em **Firestore Database**, crie um banco de dados e publique as regras de segurança de `firestore.rules`.
   - Copie `.env.example` para `.env` e preencha com as credenciais do seu app Web:
     ```bash
     cp .env.example .env
     ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Para gerar o build de produção:
   ```bash
   npm run build
   ```

