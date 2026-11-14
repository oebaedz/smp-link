import type { Response } from 'express';
import type { ClickEvent } from '../src/types.ts';

type RealtimeEventPayload =
  | { type: 'connected'; timestamp: string }
  | { type: 'click:recorded'; click: ClickEvent; linkClickCount: number }
  | { type: 'data:updated'; scope: 'links' | 'groups' | 'profile' | 'all' };

class RealtimeEventBus {
  private clients = new Set<Response>();

  addClient(res: Response) {
    this.clients.add(res);
    this.sendToClient(res, {
      type: 'connected',
      timestamp: new Date().toISOString(),
    });

    const heartbeat = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        clearInterval(heartbeat);
        this.clients.delete(res);
      }
    }, 25000);

    res.on('close', () => {
      clearInterval(heartbeat);
      this.clients.delete(res);
    });
  }

  broadcast(payload: RealtimeEventPayload) {
    for (const client of this.clients) {
      this.sendToClient(client, payload);
    }
  }

  private sendToClient(res: Response, payload: RealtimeEventPayload) {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      this.clients.delete(res);
    }
  }
}

export const realtimeBus = new RealtimeEventBus();
