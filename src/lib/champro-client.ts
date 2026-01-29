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
  OrderItems: CustomOrderItem[];
}

export interface StockOrderItem {
  SKU: string;
  Warehouse?: string;
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
  OrderItems: StockOrderItem[];
}

// Champro API Response types matching their documentation
export interface ChamproOrderItem {
  SKU: string;
  TeamName?: string;
  PlayerName?: string;
  PlayerNumber?: string;
  Quantity: number;
  Warehouse?: string;
  Cost?: number | null;
}

export interface ChamproSubOrder {
  Warehouse: string;
  SubOrderID: string | number;
  SubOrderItems: ChamproOrderItem[];
  SubOrderErrors?: Array<{ Response: string }> | null;
}

export interface ChamproOrder {
  PO: string;
  OrderType: string;
  ShipToLastName: string;
  ShipToFirstName: string;
  Address: string;
  Address2?: string;
  City: string;
  StateCode: string;
  ZIPCode: string;
  CountryCode: string;
  Phone?: string;
  IsResidential?: boolean;
  LeadTime?: string | null;
  ProofFileURL?: string | null;
  TeamColor?: string | null;
  CostTotal?: number;
  OrderItems: ChamproOrderItem[];
  OrderErrors?: Array<{ Response: string }> | null;
  SubOrders?: ChamproSubOrder[];
}

export interface ChamproApiResponse {
  SessionID?: string;
  APICustomerKey?: string;
  RequestType?: string;
  Autowarehouse?: string;
  RequestErrors?: Array<{ Response: string }> | null;
  Orders?: ChamproOrder[];
  error?: string;
}

export interface OrderStatusSKU {
  SKU: string;
  Quantity: number;
}

export interface OrderStatusLine {
  TrackingNumber?: string;
  ShippingCarrier?: string;
  ShippingService?: string;
  SKUs?: OrderStatusSKU[];
}

export interface OrderStatusResult {
  OrderNumber?: string | number;
  PO?: string;
  SalesID?: string;
  Lines?: OrderStatusLine[];
  Status?: string;
  Error?: string | null;
}

export async function placeCustomOrder(payload: CustomOrderPayload): Promise<ChamproApiResponse> {
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

export async function getOrderStatus(orderNumber: string): Promise<OrderStatusResult> {
  const { data: result, error: fetchError } = await supabase.functions.invoke(
    `champro-api?action=orderStatus&orderNumber=${encodeURIComponent(orderNumber)}`,
    {
      method: "GET",
    }
  );

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  return result;
}

// Shipping methods for Stock orders
export const SHIPPING_METHODS = [
  { value: "UPS GROUND", label: "UPS Ground" },
  { value: "UPS 3 DAY SELECT", label: "UPS 3 Day Select" },
  { value: "UPS 2ND DAY AIR A.M.", label: "UPS 2nd Day Air A.M." },
  { value: "UPS 2ND DAY AIR", label: "UPS 2nd Day Air" },
  { value: "UPS NEXT DAY AIR SAVER", label: "UPS Next Day Air Saver" },
  { value: "UPS NEXT DAY AIR EARLY", label: "UPS Next Day Air Early" },
  { value: "UPS NEXT DAY AIR", label: "UPS Next Day Air" },
  { value: "FIRST_OVERNIGHT", label: "FedEx First Overnight" },
  { value: "PRIORITY_OVERNIGHT", label: "FedEx Priority Overnight" },
  { value: "STANDARD_OVERNIGHT", label: "FedEx Standard Overnight" },
  { value: "FEDEX_2_DAY_AM", label: "FedEx 2 Day A.M." },
  { value: "FEDEX_2_DAY", label: "FedEx 2 Day" },
  { value: "FEDEX_EXPRESS_SAVER", label: "FedEx Express Saver" },
  { value: "GROUND_HOME_DELIVERY", label: "FedEx Ground Home Delivery" },
  { value: "FEDEX_GROUND", label: "FedEx Ground" },
  { value: "SMART_POST", label: "FedEx SmartPost" },
  // Third Party / Collect options
  { value: "UPS GROUND THIRD PARTY", label: "UPS Ground (Third Party)" },
  { value: "UPS GROUND COLLECT", label: "UPS Ground (Collect)" },
  { value: "FEDEX GROUND THIRD PARTY", label: "FedEx Ground (Third Party)" },
  { value: "FEDEX GROUND COLLECT", label: "FedEx Ground (Collect)" },
  { value: "UPS NEXT DAY AIR THIRD PARTY", label: "UPS Next Day Air (Third Party)" },
  { value: "UPS NEXT DAY AIR COLLECT", label: "UPS Next Day Air (Collect)" },
  { value: "PRIORITY OVERNIGHT THIRD PARTY", label: "Priority Overnight (Third Party)" },
  { value: "PRIORITY OVERNIGHT COLLECT", label: "Priority Overnight (Collect)" },
];
