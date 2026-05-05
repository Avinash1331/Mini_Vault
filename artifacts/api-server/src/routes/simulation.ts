import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import { SimulateDuplicatePaymentBody, SimulateKafkaDelayBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import type { JwtPayload } from "../middlewares/auth";
import { kafka } from "../lib/kafka";
import { redis } from "../lib/redis";

const router: IRouter = Router();

router.post("/simulate/db-failure", requireAuth, async (_req, res): Promise<void> => {
  kafka.setDbFailureMode(true);

  res.json({
    scenario: "Database Failure Simulation",
    description: "Simulating a database failure during transaction processing",
    outcome: "Transaction will fail and Saga compensating transaction will trigger a refund",
    steps: [
      "User initiates transfer request",
      "Payment service validates sender and receiver",
      "Sender balance debited successfully",
      "Database connection lost — receiver credit fails",
      "Saga pattern detects partial failure",
      "Compensating transaction: sender refunded",
      "Transaction marked as REVERSED",
      "Kafka publishes payment-failed event",
      "Notification sent to sender about reversal",
    ],
    compensationApplied: true,
  });
});

router.post("/simulate/duplicate-payment", requireAuth, async (req, res): Promise<void> => {
  const parsed = SimulateDuplicatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { idempotencyKey, amount } = parsed.data;

  const isCached = redis.exists(`idempotency:${idempotencyKey}`);

  const mockResponse = {
    transactionId: `sim-${crypto.randomUUID()}`,
    status: "SUCCESS",
    amount,
    message: "Transfer processed",
    idempotencyKey,
    isDuplicate: false,
  };

  if (!isCached) {
    redis.set(`idempotency:${idempotencyKey}`, JSON.stringify(mockResponse), 24 * 60 * 60 * 1000);
  }

  res.json({
    scenario: "Duplicate Payment (Idempotency) Simulation",
    description: `Testing idempotency key: ${idempotencyKey}`,
    outcome: isCached
      ? "Duplicate detected — returning cached response without double deduction"
      : "First request processed — subsequent requests with same key will be deduplicated",
    steps: isCached
      ? [
          "Duplicate transfer request received",
          "System extracts idempotency key from request",
          `Key '${idempotencyKey}' found in Redis cache`,
          "Original response retrieved from cache",
          "No balance deduction performed",
          "Cached response returned to client",
          "Duplicate payment successfully prevented",
        ]
      : [
          "Transfer request received",
          "Unique idempotency key generated/extracted",
          `Key '${idempotencyKey}' stored in Redis with 24h TTL`,
          "Payment processed normally",
          "Response cached against idempotency key",
          "Any retry with same key will return this cached response",
        ],
    compensationApplied: false,
  });
});

router.post("/simulate/notification-failure", requireAuth, async (_req, res): Promise<void> => {
  kafka.setNotificationFailureMode(true);

  res.json({
    scenario: "Notification Service Failure",
    description: "Simulating notification service outage during payment processing",
    outcome: "Payment processes successfully but notifications fail — system continues gracefully",
    steps: [
      "Transfer request received and validated",
      "Payment processed successfully",
      "Ledger updated with debit and credit entries",
      "Kafka publishes notification-events",
      "Notification consumer receives event",
      "Email service connection timeout",
      "SMS gateway returns 503 error",
      "In-app notification write fails",
      "Notification failures logged — retries scheduled",
      "Transaction remains SUCCESS despite notification failure",
      "Eventual consistency: notifications will be delivered on retry",
    ],
    compensationApplied: false,
  });
});

router.post("/simulate/kafka-delay", requireAuth, async (req, res): Promise<void> => {
  const parsed = SimulateKafkaDelayBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { delayMs } = parsed.data;
  kafka.setDelay(delayMs);

  res.json({
    scenario: "Kafka Processing Delay",
    description: `Simulating ${delayMs}ms processing lag in Kafka consumers`,
    outcome: `Messages will be delayed by ${delayMs}ms, transactions will remain in PROCESSING state longer`,
    steps: [
      "Transfer request initiated",
      "Transaction created in INITIATED state",
      "Event published to payment-created topic",
      `Kafka consumer experiences ${delayMs}ms processing delay`,
      "Transaction visible as PROCESSING to user",
      "Sender can poll transfer status endpoint",
      "After delay, consumer processes the event",
      "Ledger updates applied atomically",
      "Transaction status updated to SUCCESS",
      "Status polling reflects final state",
    ],
    compensationApplied: false,
  });
});

export default router;
