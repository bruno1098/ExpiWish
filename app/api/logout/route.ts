import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Criar uma página HTML simples que faz o logout automaticamente
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fazendo Logout...</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background-color: #f8fafc;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .spinner {
          border: 3px solid #f3f4f6;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <script type="module">
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
        import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
        
        // Configuração do Firebase
      const firebaseConfig = {
          apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}",
          authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}",
          projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}",
          storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}",
          messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
          appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}"
        };
        
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        
        async function doLogout() {
          try {
            await signOut(auth);
            document.getElementById('status').textContent = 'Logout realizado com sucesso!';
            document.getElementById('message').textContent = 'Redirecionando para a página de login...';
            setTimeout(() => {
              window.location.href = '/auth/login';
            }, 2000);
          } catch (error) {
            console.error('Erro no logout:', error);
            document.getElementById('status').textContent = 'Erro no logout';
            document.getElementById('message').textContent = 'Redirecionando para a página de login...';
            setTimeout(() => {
              window.location.href = '/auth/login';
            }, 2000);
          }
        }
        
        // Executar logout quando a página carregar
        window.addEventListener('load', doLogout);
      </script>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h2 id="status">Fazendo logout...</h2>
        <p id="message">Aguarde um momento.</p>
      </div>
    </body>
    </html>
    `;
    
    return new NextResponse(html, {
      headers: {
        'content-type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Erro na rota de logout:', error);
    return NextResponse.redirect('/auth/login');
  }
}

export async function POST(request: NextRequest) {
  // Para requisições POST, simplesmente redirecionar para login
  return NextResponse.redirect('/auth/login');
} 