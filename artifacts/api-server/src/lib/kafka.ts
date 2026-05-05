import { logger } from "./logger";

export type KafkaTopic = "payment-created" | "payment-success" | "payment-failed" | "notification-events" | "fraud-events";

export interface KafkaMessage {
  id: string;
  topic: KafkaTopic;
  payload: Record<string, unknown>;
  status: "pending" | "processed" | "failed";
  createdAt: Date;
  processedAt?: Date;
}

class KafkaBus {
  private messages: KafkaMessage[] = [];
  private handlers: Map<KafkaTopic, Array<(msg: KafkaMessage) => Promise<void>>> = new Map();
  private delayMs = 0;
  private notificationFailureMode = false;
  private dbFailureMode = false;

  setDelay(ms: number) {
    this.delayMs = ms;
    setTimeout(() => { this.delayMs = 0; }, ms + 5000);
  }

  setNotificationFailureMode(v: boolean) {
    this.notificationFailureMode = v;
    if (v) setTimeout(() => { this.notificationFailureMode = false; }, 10000);
  }

  setDbFailureMode(v: boolean) {
    this.dbFailureMode = v;
    if (v) setTimeout(() => { this.dbFailureMode = false; }, 10000);
  }

  isDbFailureMode() { return this.dbFailureMode; }

  async publish(topic: KafkaTopic, payload: Record<string, unknown>): Promise<KafkaMessage> {
    const msg: KafkaMessage = {
      id: crypto.randomUUID(),
      topic,
      payload,
      status: "pending",
      createdAt: new Date(),
    };
    this.messages.push(msg);
    logger.info({ topic, msgId: msg.id }, "Kafka message published");

    setTimeout(async () => {
      if (this.delayMs > 0) {
        await new Promise(r => setTimeout(r, this.delayMs));
      }
      await this.dispatch(msg);
    }, 50);

    return msg;
  }

  private async dispatch(msg: KafkaMessage): Promise<void> {
    const handlers = this.handlers.get(msg.topic) ?? [];
    try {
      for (const handler of handlers) {
        await handler(msg);
      }
      msg.status = "processed";
      msg.processedAt = new Date();
    } catch (err) {
      msg.status = "failed";
      logger.error({ err, msgId: msg.id }, "Kafka message processing failed");
    }
  }

  subscribe(topic: KafkaTopic, handler: (msg: KafkaMessage) => Promise<void>) {
    const existing = this.handlers.get(topic) ?? [];
    this.handlers.set(topic, [...existing, handler]);
  }

  getStats() {
    const topics: KafkaTopic[] = ["payment-created", "payment-success", "payment-failed", "notification-events", "fraud-events"];
    return {
      topics: topics.map(name => {
        const msgs = this.messages.filter(m => m.topic === name);
        return {
          name,
          messageCount: msgs.length,
          pendingCount: msgs.filter(m => m.status === "pending").length,
          processedCount: msgs.filter(m => m.status === "processed").length,
        };
      }),
      totalMessages: this.messages.length,
      processedMessages: this.messages.filter(m => m.status === "processed").length,
      pendingMessages: this.messages.filter(m => m.status === "pending").length,
      failedMessages: this.messages.filter(m => m.status === "failed").length,
    };
  }

  isNotificationFailureMode() { return this.notificationFailureMode; }
}

export const kafka = new KafkaBus();
