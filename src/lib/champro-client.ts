import { supabase } from "@/integrations/supabase/client";

export interface CustomOrderItem {
  SKU: string;
  TeamName?: string;
  PlayerName?: string;
  PlayerNumber?: string;
  Quantity: number;
}

export interface CustomOrderPayload {
  PO: string;
  ShipToFirstName: string;
  ShipToLastName: string;
  Address: string;
  Address2?: string;
  City: string;
  StateCode: string;
  ZIPCode: string;
  CountryCode: string;
  Phone?: string;
  IsResidential?: boolean;
  LeadTime?: string;
  ProofFileURL?: string;
  TeamColor?: string;
  Items: CustomOrderItem[];
}

export interface StockOrderItem {
  SKU: string;
  Warehouse: string;
  Quantity: number;
}

export interface StockOrderPayload {
  PO: string;
  ShipToFirstName: string;
  ShipToLastName: string;
  Address: string;
  Address2?: string;
  City: string;
  StateCode: string;
  ZIPCode: string;
  CountryCode: string;
  Phone?: string;
  IsResidential?: boolean;
  Autowarehouse?: boolean;
  ShippingMethod?: string;
  ShippingCustomerAccount?: string;
  Items: StockOrderItem[];
}

export interface OrderStatusResult {
  OrderNumber?: string;
  PO?: string;
  SalesID?: string;
  Status?: string;
  Lines?: Array<{
    TrackingNumber?: string;
    ShippingCarrier?: string;
    ShippingService?: string;
    SKUs?: Array<{
      SKU: string;
      Quantity: number;
    }>;
  }>;
}

export interface ChamproApiResponse {
  SessionID?: string;
  CostTotal?: number;
  SubOrders?: Array<{
    SubOrderID: string;
    CostTotal?: number;
  }>;
  RequestErrors?: string[];
  OrderErrors?: string[];
  SubOrderErrors?: Array<{
    SubOrderID?: string;
    Errors?: string[];
  }>;
  error?: string;
}

export async function placeCustomOrder(payload: CustomOrderPayload): Promise<ChamproApiResponse> {
  const { data, error } = await supabase.functions.invoke("champro-api", {
    body: payload,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add action query param by calling with different approach
  const { data: result, error: fetchError } = await supabase.functions.invoke(
    "champro-api?action=customOrder",
    {
      body: payload,
    }
  );

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  return result;
}

export async function placeStockOrder(payload: StockOrderPayload): Promise<ChamproApiResponse> {
  const { data: result, error: fetchError } = await supabase.functions.invoke(
    "champro-api?action=stockOrder",
    {
      body: payload,
    }
  );

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  return result;
}

export async function getOrderStatus(subOrderId: string): Promise<OrderStatusResult> {
  const { data: result, error: fetchError } = await supabase.functions.invoke(
    `champro-api?action=orderStatus&subOrderId=${encodeURIComponent(subOrderId)}`,
    {
      method: "GET",
    }
  );

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  return result;
}
