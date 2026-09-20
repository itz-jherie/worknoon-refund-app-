/**
 * Mock CRM / order database seed data.
 * 15 customers with order histories designed to exercise every policy rule:
 * final-sale items, old orders, high-value orders, damaged/incorrect items,
 * change-of-mind cases, and a customer with a suspicious history.
 */
export const CUSTOMERS = [
  {
    id: "c-001",
    name: "Amara Okafor",
    email: "amara.okafor@example.com",
    joinedAt: "2023-03-11",
    riskLevel: "low",
    orders: [
      {
        id: "o-1001",
        items: [{ name: "Wireless Noise-Canceling Headphones", price: 249.99, finalSale: false }],
        total: 249.99,
        placedAt: "2026-09-10",
        deliveredAt: "2026-09-14",
        status: "delivered",
      },
      {
        id: "o-1002",
        items: [{ name: "Phone Case", price: 19.99, finalSale: true }],
        total: 19.99,
        placedAt: "2026-08-01",
        deliveredAt: "2026-08-05",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-002",
    name: "Liam Chen",
    email: "liam.chen@example.com",
    joinedAt: "2022-07-02",
    riskLevel: "low",
    orders: [
      {
        id: "o-2001",
        items: [{ name: "Ceramic Mug Set (6pc)", price: 44.5, finalSale: false }],
        total: 44.5,
        placedAt: "2026-09-15",
        deliveredAt: "2026-09-18",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-003",
    name: "Sofia Reyes",
    email: "sofia.reyes@example.com",
    joinedAt: "2021-11-20",
    riskLevel: "low",
    orders: [
      {
        id: "o-3001",
        items: [
          { name: "Standing Desk", price: 429.0, finalSale: false },
          { name: "Desk Mat", price: 35.0, finalSale: false },
        ],
        total: 464.0,
        placedAt: "2026-06-02",
        deliveredAt: "2026-06-09",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-004",
    name: "Noah Fitzgerald",
    email: "noah.fitzgerald@example.com",
    joinedAt: "2024-01-15",
    riskLevel: "medium",
    orders: [
      {
        id: "o-4001",
        items: [{ name: "Ultra HD 65\" Smart TV", price: 899.99, finalSale: false }],
        total: 899.99,
        placedAt: "2026-09-01",
        deliveredAt: "2026-09-06",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-005",
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    joinedAt: "2023-05-30",
    riskLevel: "low",
    orders: [
      {
        id: "o-5001",
        items: [{ name: "Yoga Mat Premium", price: 68.0, finalSale: false }],
        total: 68.0,
        placedAt: "2026-08-20",
        deliveredAt: "2026-08-24",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-006",
    name: "Marcus Webb",
    email: "marcus.webb@example.com",
    joinedAt: "2025-02-08",
    riskLevel: "high",
    orders: [
      {
        id: "o-6001",
        items: [{ name: "Gaming Laptop RTX 4070", price: 1499.0, finalSale: false }],
        total: 1499.0,
        placedAt: "2026-09-05",
        deliveredAt: "2026-09-08",
        status: "delivered",
      },
      {
        id: "o-6002",
        items: [{ name: "Bluetooth Speaker", price: 89.99, finalSale: false }],
        total: 89.99,
        placedAt: "2026-07-14",
        deliveredAt: "2026-07-18",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-007",
    name: "Elena Petrova",
    email: "elena.petrova@example.com",
    joinedAt: "2022-09-14",
    riskLevel: "low",
    orders: [
      {
        id: "o-7001",
        items: [{ name: "Leather Crossbody Bag", price: 179.0, finalSale: false }],
        total: 179.0,
        placedAt: "2026-09-17",
        deliveredAt: "2026-09-19",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-008",
    name: "Jamal Thompson",
    email: "jamal.thompson@example.com",
    joinedAt: "2024-06-01",
    riskLevel: "low",
    orders: [
      {
        id: "o-8001",
        items: [{ name: "Espresso Machine", price: 389.99, finalSale: false }],
        total: 389.99,
        placedAt: "2026-09-12",
        deliveredAt: "2026-09-16",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-009",
    name: "Hana Yamamoto",
    email: "hana.yamamoto@example.com",
    joinedAt: "2023-08-19",
    riskLevel: "low",
    orders: [
      {
        id: "o-9001",
        items: [{ name: "Watercolor Paint Set", price: 32.5, finalSale: false }],
        total: 32.5,
        placedAt: "2026-04-10",
        deliveredAt: "2026-04-15",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-010",
    name: "Oliver Grant",
    email: "oliver.grant@example.com",
    joinedAt: "2025-10-03",
    riskLevel: "low",
    orders: [
      {
        id: "o-10001",
        items: [{ name: "Running Shoes Size 10", price: 129.99, finalSale: false }],
        total: 129.99,
        placedAt: "2026-09-16",
        deliveredAt: "2026-09-19",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-011",
    name: "Fatima Al-Rashid",
    email: "fatima.alrashid@example.com",
    joinedAt: "2022-12-05",
    riskLevel: "low",
    orders: [
      {
        id: "o-11001",
        items: [{ name: "Air Fryer 5.8qt", price: 119.0, finalSale: false }],
        total: 119.0,
        placedAt: "2026-09-13",
        deliveredAt: "2026-09-17",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-012",
    name: "Diego Morales",
    email: "diego.morales@example.com",
    joinedAt: "2024-03-22",
    riskLevel: "medium",
    orders: [
      {
        id: "o-12001",
        items: [{ name: "Smart Watch Series 8", price: 329.0, finalSale: false }],
        total: 329.0,
        placedAt: "2026-08-25",
        deliveredAt: "2026-08-29",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-013",
    name: "Grace Kim",
    email: "grace.kim@example.com",
    joinedAt: "2023-01-30",
    riskLevel: "low",
    orders: [
      {
        id: "o-13001",
        items: [{ name: "Winter Parka", price: 215.0, finalSale: false }],
        total: 215.0,
        placedAt: "2026-09-18",
        deliveredAt: "2026-09-20",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-014",
    name: "Tobias Muller",
    email: "tobias.muller@example.com",
    joinedAt: "2025-05-17",
    riskLevel: "low",
    orders: [
      {
        id: "o-14001",
        items: [{ name: "Camping Tent 4-Person", price: 245.0, finalSale: false }],
        total: 245.0,
        placedAt: "2026-05-20",
        deliveredAt: "2026-05-26",
        status: "delivered",
      },
    ],
  },
  {
    id: "c-015",
    name: "Zara Ahmed",
    email: "zara.ahmed@example.com",
    joinedAt: "2024-09-09",
    riskLevel: "low",
    orders: [
      {
        id: "o-15001",
        items: [{ name: "Robot Vacuum Cleaner", price: 279.99, finalSale: false }],
        total: 279.99,
        placedAt: "2026-09-08",
        deliveredAt: "2026-09-12",
        status: "delivered",
      },
    ],
  },
];

