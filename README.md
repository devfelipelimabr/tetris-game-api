Aqui está a documentação atualizada para incluir as novas funcionalidades, como geração única de IDs de jogo, proteção contra múltiplos salvamentos de pontuação, e sistema de níveis dinâmico.

---

# **Tetris Game API**

Esta API fornece a lógica e comunicação para um jogo de Tetris multiplayer em tempo real, usando WebSockets para interação cliente-servidor. A API suporta funcionalidades como movimentação de peças, rotação, sistema de níveis com velocidade dinâmica e atualizações em tempo real para o cliente.

---

## **Índice**

1. [Funcionalidades](#funcionalidades)
2. [Tecnologias Utilizadas](#tecnologias-utilizadas)
3. [Requisitos](#requisitos)
4. [Instalação](#instalação)
5. [Uso](#uso)
6. [Endpoints do WebSocket](#endpoints-do-websocket)
7. [Mensagens de WebSocket](#mensagens-de-websocket)
8. [Contribuição](#contribuição)
9. [Licença](#licença)

---

## **Funcionalidades**

- Comunicação em tempo real usando WebSockets.
- **Geração única de `gameId`** com UUID para cada sessão de jogo.
- Sistema de níveis, onde a velocidade de descida das peças aumenta 10% a cada 5 minutos.
- Movimentação das peças (esquerda, direita, baixo) e rotação.
- Gerenciamento de múltiplos jogos simultaneamente.
- **Proteção contra múltiplos salvamentos de pontuação** no evento "Game Over".
- Mensagens claras de inicialização, atualização de estado e finalização de jogo.
- Estrutura modular e escalável para expansão futura.

---

## **Tecnologias Utilizadas**

- **Node.js**: Plataforma principal para o servidor.
- **Express.js**: Gerenciamento do servidor HTTP.
- **WebSocket**: Comunicação em tempo real.
- **jQuery**: Manipulação do frontend.
- **UUID**: Geração de identificadores únicos para cada jogo.
- **HTML/CSS**: Interface do jogo.

---

## **Requisitos**

- Node.js >= 16.x
- npm >= 7.x

---

## **Instalação**

1. Clone este repositório:

   ```bash
   git clone https://github.com/devfelipelimabr/tetris-game-api.git
   cd tetris-game-api
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Inicie o servidor:

   ```bash
   npm start
   ```

4. Acesse a aplicação:
   - O servidor estará disponível em: `ws://localhost:3000`.

---

## **Uso**

1. Execute o servidor.
2. Abra o frontend (`index.html`) em um navegador para começar o jogo.
3. Conecte-se ao WebSocket e envie comandos para interagir com o jogo.

---

## **Endpoints do WebSocket**

### **URI Base**

`ws://localhost:3000`

### **Conexão**

Ao conectar, o servidor cria uma nova instância do jogo para o cliente. Cada jogo recebe um identificador único (`gameId`).

---

## **Mensagens de WebSocket**

### **Tipos de Mensagem do Cliente**

| Tipo         | Descrição                          |
|--------------|------------------------------------|
| `MOVE_LEFT`  | Move a peça atual para a esquerda. |
| `MOVE_RIGHT` | Move a peça atual para a direita.  |
| `MOVE_DOWN`  | Move a peça atual para baixo.      |
| `ROTATE`     | Rotaciona a peça atual.           |
| `NEW_GAME`   | Reinicia o jogo atual.            |

### **Tipos de Mensagem do Servidor**

| Tipo             | Descrição                                                     |
|-------------------|-------------------------------------------------------------|
| `GAME_INITIALIZED` | Enviado ao cliente ao iniciar um novo jogo, incluindo o ID do jogo e o estado inicial. |
| `GAME_UPDATE`      | Atualiza o estado do jogo em tempo real, incluindo tabuleiro, pontuação e nível.        |
| `GAME_OVER`        | Enviado quando o jogo termina devido a uma colisão.          |
| `LEVEL_UP`         | Notifica o cliente que o nível foi incrementado.             |

### **Estrutura da Mensagem do Estado do Jogo**

```json
{
  "type": "GAME_UPDATE",
  "gameState": {
    "gameId": "0a0c690e-d42c-4a3d-965c-3f40e17943ca1732253829847",
    "board": [[null, null, "red", ...], ...],
    "score": 150,
    "level": 3,
    "gameOver": false,
    "nextPiece": {
      "shape": [[1, 1], [1, 1]],
      "color": "yellow",
      "name": "O"
    }
  }
}
```

---

## **Novas Funcionalidades**

1. **Geração única de IDs**:
   - Cada jogo recebe um ID único gerado com UUID para evitar colisões, especialmente em sistemas distribuídos.

2. **Proteção contra múltiplos salvamentos de pontuação**:
   - Ao final do jogo (`GAME_OVER`), o servidor salva a pontuação apenas uma vez para cada sessão.

3. **Sistema de níveis dinâmico**:
   - O nível do jogador aumenta automaticamente a cada 5 minutos, reduzindo o intervalo de descida das peças.

---

## **Contribuição**

Sinta-se à vontade para contribuir com melhorias, relatando problemas ou enviando pull requests.

---

## **Licença**

Este projeto está licenciado sob a licença MIT. Consulte o arquivo `LICENSE` para mais informações.
