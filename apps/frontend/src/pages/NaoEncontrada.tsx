import { Link } from 'react-router';

export function NaoEncontrada() {
  return (
    <main className="pagina-centralizada">
      <div className="cartao">
        <h1>Página não encontrada</h1>
        <p>O endereço acessado não existe.</p>
        <Link className="botao" to="/">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
