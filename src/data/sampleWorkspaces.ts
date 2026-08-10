import { WorkspaceTemplate } from '../types';

export const SAMPLE_WORKSPACES: WorkspaceTemplate[] = [
  {
    id: 'ecommerce-multirepo',
    name: '🛒 E-Commerce Microservices Workspace',
    description: '4 repos: Storefront Web (React), Payment Service (Node), Order API (Go), & Infrastructure (Terraform).',
    folders: [
      { id: 'f-sprint-auth', name: '🔥 Sprint 44 - Auth & Checkout Flow', parentId: null, color: '#ef4444' },
      { id: 'f-payment-gateway', name: '💳 Payment Integration', parentId: null, color: '#3b82f6' },
      { id: 'f-infra', name: '☁️ Cloud Configs', parentId: null, color: '#10b981' },
      { id: 'f-sub-stripe', name: 'Stripe Webhooks', parentId: 'f-payment-gateway', color: '#8b5cf6' }
    ],
    repos: [
      {
        id: 'repo-web',
        name: 'web-storefront',
        path: '/workspaces/web-storefront',
        color: '#3b82f6',
        files: [
          {
            id: 'file-web-1',
            repoId: 'repo-web',
            repoName: 'web-storefront',
            relativePath: 'src/components/CheckoutModal.tsx',
            language: 'typescript',
            content: `import React, { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { processPayment } from '../api/paymentClient';

export const CheckoutModal: React.FC = () => {
  const { cartItems, totalAmount, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    setIsProcessing(true);
    // TODO: Connect with payment-service v2 endpoint
    const result = await processPayment({ items: cartItems, total: totalAmount });
    if (result.success) {
      clearCart();
    }
    setIsProcessing(false);
  };

  return (
    <div className="checkout-modal">
      <h2>Complete Your Purchase</h2>
      <button onClick={handleCheckout} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : \`Pay \${totalAmount}\`}
      </button>
    </div>
  );
};`
          },
          {
            id: 'file-web-2',
            repoId: 'repo-web',
            repoName: 'web-storefront',
            relativePath: 'src/api/paymentClient.ts',
            language: 'typescript',
            content: `import axios from 'axios';

const PAYMENT_SERVICE_URL = process.env.VITE_PAYMENT_URL || 'http://localhost:4000/api/v1';

export async function processPayment(payload: { items: any[]; total: number }) {
  const response = await axios.post(\`\${PAYMENT_SERVICE_URL}/charge\`, payload, {
    headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }
  });
  return response.data;
}`
          },
          {
            id: 'file-web-3',
            repoId: 'repo-web',
            repoName: 'web-storefront',
            relativePath: 'src/hooks/useAuthToken.ts',
            language: 'typescript',
            content: `import { useState, useEffect } from 'react';

export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('jwt_auth');
    if (saved) setToken(saved);
  }, []);

  return { token, setToken };
}`
          }
        ]
      },
      {
        id: 'repo-payment',
        name: 'payment-service',
        path: '/workspaces/payment-service',
        color: '#8b5cf6',
        files: [
          {
            id: 'file-pay-1',
            repoId: 'repo-payment',
            repoName: 'payment-service',
            relativePath: 'server/routes/charge.js',
            language: 'javascript',
            content: `const express = require('express');
const router = express.Router();
const stripe = require('../services/stripe');

router.post('/charge', async (req, res) => {
  try {
    const { items, total } = req.body;
    // Check line 14: Important Stripe idempotent key handling
    const charge = await stripe.charges.create({
      amount: Math.round(total * 100),
      currency: 'usd',
      source: req.body.stripeToken,
    });
    res.json({ success: true, transactionId: charge.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;`
          },
          {
            id: 'file-pay-2',
            repoId: 'repo-payment',
            repoName: 'payment-service',
            relativePath: 'server/webhooks/stripeWebhook.js',
            language: 'javascript',
            content: `const express = require('express');
const router = express.Router();

router.post('/webhook/stripe', (req, res) => {
  const event = req.body;
  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log('Payment succeeded:', event.data.object.id);
      break;
    default:
      console.log('Unhandled event:', event.type);
  }
  res.json({ received: true });
});`
          }
        ]
      },
      {
        id: 'repo-order',
        name: 'order-api-go',
        path: '/workspaces/order-api-go',
        color: '#10b981',
        files: [
          {
            id: 'file-order-1',
            repoId: 'repo-order',
            repoName: 'order-api-go',
            relativePath: 'internal/handlers/order.go',
            language: 'go',
            content: `package handlers

import (
	"encoding/json"
	"net/http"
)

type Order struct {
	ID     string  \`json:"id"\`
	Total  float64 \`json:"total"\`
	Status string  \`json:"status"\`
}

func CreateOrderHandler(w http.ResponseWriter, r *http.Request) {
	var order Order
	if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	order.Status = "PENDING_PAYMENT"
	json.NewEncoder(w).Encode(order)
}`
          }
        ]
      },
      {
        id: 'repo-infra',
        name: 'devops-infra',
        path: '/workspaces/devops-infra',
        color: '#f59e0b',
        files: [
          {
            id: 'file-infra-1',
            repoId: 'repo-infra',
            repoName: 'devops-infra',
            relativePath: 'terraform/main.tf',
            language: 'hcl',
            content: `provider "google" {
  project = "my-ecommerce-prod"
  region  = "us-central1"
}

resource "google_cloud_run_service" "payment_service" {
  name     = "payment-service"
  location = "us-central1"

  template {
    spec {
      containers {
        image = "gcr.io/my-ecommerce-prod/payment-service:v2.1"
      }
    }
  }
}`
          }
        ]
      }
    ],
    bookmarks: [
      {
        id: 'bm-1',
        fileId: 'file-web-1',
        repoId: 'repo-web',
        repoName: 'web-storefront',
        relativePath: 'src/components/CheckoutModal.tsx',
        fileName: 'CheckoutModal.tsx',
        folderId: 'f-sprint-auth',
        lineNumber: 13,
        lineContent: 'const result = await processPayment({ items: cartItems, total: totalAmount });',
        title: 'Checkout Payment Call',
        notes: 'Needs error handling for failed cards in sprint 44',
        tag: 'urgent',
        colorTag: '#ef4444',
        createdAt: Date.now() - 100000
      },
      {
        id: 'bm-2',
        fileId: 'file-pay-1',
        repoId: 'repo-payment',
        repoName: 'payment-service',
        relativePath: 'server/routes/charge.js',
        fileName: 'charge.js',
        folderId: 'f-payment-gateway',
        lineNumber: 10,
        lineContent: 'const charge = await stripe.charges.create({',
        title: 'Stripe Charge Endpoint',
        notes: 'Update to Stripe API v2024 SDK',
        tag: 'feature',
        colorTag: '#3b82f6',
        createdAt: Date.now() - 80000
      },
      {
        id: 'bm-3',
        fileId: 'file-pay-2',
        repoId: 'repo-payment',
        repoName: 'payment-service',
        relativePath: 'server/webhooks/stripeWebhook.js',
        fileName: 'stripeWebhook.js',
        folderId: 'f-sub-stripe',
        lineNumber: 7,
        lineContent: "case 'payment_intent.succeeded':",
        title: 'Stripe Webhook Event Switch',
        notes: 'Verify signature check header',
        tag: 'review',
        colorTag: '#8b5cf6',
        createdAt: Date.now() - 60000
      },
      {
        id: 'bm-4',
        fileId: 'file-infra-1',
        repoId: 'repo-infra',
        repoName: 'devops-infra',
        relativePath: 'terraform/main.tf',
        fileName: 'main.tf',
        folderId: 'f-infra',
        lineNumber: 12,
        lineContent: 'image = "gcr.io/my-ecommerce-prod/payment-service:v2.1"',
        title: 'Cloud Run Image Tag',
        notes: 'Check release image digest before deploy',
        tag: 'refactor',
        colorTag: '#f59e0b',
        createdAt: Date.now() - 40000
      }
    ]
  },
  {
    id: 'saas-fullstack',
    name: '🚀 SaaS Platform Workspace',
    description: '3 repos: Frontend Dashboard (Next/React), Backend API (FastAPI Python), Analytics Worker.',
    folders: [
      { id: 'f-saas-1', name: '📊 Analytics Pipeline', parentId: null, color: '#10b981' },
      { id: 'f-saas-2', name: '🔒 User Auth & Permissions', parentId: null, color: '#8b5cf6' }
    ],
    repos: [
      {
        id: 'repo-saas-fe',
        name: 'dashboard-ui',
        path: '/workspaces/dashboard-ui',
        color: '#6366f1',
        files: [
          {
            id: 'file-fe-1',
            repoId: 'repo-saas-fe',
            repoName: 'dashboard-ui',
            relativePath: 'src/app/analytics/page.tsx',
            language: 'typescript',
            content: `import { AnalyticsChart } from '@/components/AnalyticsChart';

export default async function AnalyticsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Analytics Overview</h1>
      <AnalyticsChart />
    </div>
  );
}`
          }
        ]
      },
      {
        id: 'repo-saas-be',
        name: 'backend-api-py',
        path: '/workspaces/backend-api-py',
        color: '#ec4899',
        files: [
          {
            id: 'file-be-1',
            repoId: 'repo-saas-be',
            repoName: 'backend-api-py',
            relativePath: 'app/api/v1/endpoints/analytics.py',
            language: 'python',
            content: `from fastapi import APIRouter, Depends
from app.services.analytics import calculate_metrics

router = APIRouter()

@router.get("/metrics")
async def get_metrics():
    return calculate_metrics()`
          }
        ]
      }
    ],
    bookmarks: [
      {
        id: 'bm-saas-1',
        fileId: 'file-be-1',
        repoId: 'repo-saas-be',
        repoName: 'backend-api-py',
        relativePath: 'app/api/v1/endpoints/analytics.py',
        fileName: 'analytics.py',
        folderId: 'f-saas-1',
        lineNumber: 7,
        lineContent: 'async def get_metrics():',
        title: 'FastAPI Metrics Endpoint',
        notes: 'Add caching layer using Redis',
        tag: 'feature',
        colorTag: '#10b981',
        createdAt: Date.now() - 50000
      }
    ]
  }
];
