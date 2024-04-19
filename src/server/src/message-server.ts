import * as WebSocket from 'ws';

export abstract class MessageServer<T> {
  constructor(private readonly wsServer: WebSocket.Server) {
    wsServer.on('connection', this.subscribeToMessages);
    this.wsServer.on('error', this.cleanUpDeadClients);
  }

  protected abstract handleMessage(sender: WebSocket, message: T): void;

  protected readonly subscribeToMessages = (ws: WebSocket) => {
    ws.on('message', (data: WebSocket.Data) => {
      if (typeof data === 'string') {
        const message = JSON.parse(data);
        this.handleMessage(ws, message);
      } else {
        console.log('Received data of unsupported type.');
      }
    });
  };

  private readonly cleanUpDeadClients = () => {
    this.wsServer.clients.forEach((client) => {
      if (this.isDead(client)) {
        this.wsServer.clients.delete(client);
      }
    });
  };
  protected broadcastExcept(currentClient: WebSocket, message: Readonly<T>) {
    this.wsServer.clients.forEach((client) => {
      if (this.isAlive(client) && client !== currentClient) {
        client.send(JSON.stringify(message));
      }
    });
  }

  protected replyTo(client: WebSocket, message: Readonly<T>) {
      client.send(JSON.stringify(message));
  }

  protected get clients(): Set<WebSocket> {
    return this.wsServer.clients;
  }

  private isDead(client: WebSocket): boolean {
    return (
      client.readyState === WebSocket.CLOSED ||
      client.readyState === WebSocket.CLOSING
    );
  }

  private isAlive(client: WebSocket): boolean {
    return !this.isDead(client);
  }
}
