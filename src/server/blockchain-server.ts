import * as WebSocket from 'ws';
import { MessageServer } from './message-server';
import { Message, MessageTypes, UUID } from '../../shared/messages';

type Replies = Map<WebSocket, Message>;
export class BlockchainServer extends MessageServer<Message> {
  private readonly receivedMessageAwaitingResponse = new Map<UUID, WebSocket>();
  private readonly sendMessagesAwaitingReply = new Map<UUID, Replies>();
  protected handleMessage(sender: WebSocket, message: Message): void {
    switch (message.type) {
      case MessageTypes.GetLongestChainRequest:
        return this.handleGetLongestChainRequest(sender, message);
      case MessageTypes.GetLongestChainResponse:
        return this.handleGetLongestChainResponse(sender, message);
      case MessageTypes.NewBlockRequest:
        return this.handleAddTransactionsRequest(sender, message);
      case MessageTypes.NewBlockAnnouncement:
        return this.handleNewBlockAnnouncement(sender, message);
      default: {
        console.log(`Received message of unknown type: ${message.type}`);
      }
    }
  }

  private handleGetLongestChainRequest(
    requester: WebSocket,
    message: Message,
  ): void {
    if (this.clientIsNotAlone) {
      this.receivedMessageAwaitingResponse.set(
        message.correlationId,
        requester,
      );
      this.sendMessagesAwaitingReply.set(message.correlationId, new Map());
      this.broadcastExcept(requester, message);
    } else {
      this.replyTo(requester, {
        type: MessageTypes.GetLongestChainResponse,
        correlationId: message.correlationId,
        payload: [],
      });
    }
  }

  private handleGetLongestChainResponse(
    sender: WebSocket,
    message: Message,
  ): void {
    if (this.receivedMessageAwaitingResponse.has(message.correlationId)) {
      const requester = this.receivedMessageAwaitingResponse.get(
        message.correlationId,
      );
      if (this.everyoneReplied(sender, message)) {
        const allReplies = this.sendMessagesAwaitingReply
          .get(message.correlationId)
          .values();
        const longestChain = Array.from(allReplies).reduce(
          this.selectTheLongestChain,
        );
        this.replyTo(requester, longestChain);
      }
    }
  }

  private handleAddTransactionsRequest(
    requester: WebSocket,
    message: Message,
  ): void {
    this.broadcastExcept(requester, message);
  }

  private handleNewBlockAnnouncement(
    requester: WebSocket,
    message: Message,
  ): void {
    this.broadcastExcept(requester, message);
  }

  private everyoneReplied(sender: WebSocket, message: Message): boolean {
    const repliedClients = this.sendMessagesAwaitingReply
      .get(message.correlationId)
      .set(sender, message);
    const awaitingForClients = Array.from(this.clients).filter(
      (client) => !repliedClients.has(client),
    );
    return awaitingForClients.length === 1;
  }

  private selectTheLongestChain(
    currentlyLongest: Message,
    current: Message,
    index: number,
  ) {
    return index > 0 && current.payload.length > currentlyLongest.payload.length
      ? current
      : currentlyLongest;
  }

  private get clientIsNotAlone(): boolean {
    return this.clients.size > 1;
  }
}
