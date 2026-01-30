export interface MenuOption {
  id: string;
  labelKO: string;
  labelVN: string;
  labelEN?: string;
  labelZH?: string;
  priceVND: number;
}

export interface MenuItem {
  id: string;
  nameKO: string;
  nameVN: string;
  nameEN?: string;
  nameZH?: string;
  priceVND: number;
  category: 'food' | 'drink' | 'dessert'; // 하위 호환성을 위해 유지
  categoryId: string; // 실제 카테고리 ID
  imageQuery: string;
  descriptionKO?: string;
  descriptionVN?: string;
  descriptionEN?: string;
  descriptionZH?: string;
  options?: MenuOption[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'system' | 'staff';
  textKO: string;
  textVN: string;
  textEN?: string;
  detectedLanguage?: 'ko' | 'vn' | 'en' | null;
  timestamp: Date;
  type: 'text' | 'order' | 'request' | 'image';
  metadata?: any; // For order details
  imageUrl?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedOptions?: MenuOption[];
  notes?: string[]; // e.g., ["No Cilantro"]
}

export interface QuickChip {
  id: string;
  templateKey?: string;
  icon: string;
  labelKO: string;
  labelVN: string;
  labelEN?: string;
  labelZH?: string;
  action: 'message' | 'toggle_feature';
  messageKO?: string;
  messageVN?: string;
  messageEN?: string;
  messageZH?: string;
}
