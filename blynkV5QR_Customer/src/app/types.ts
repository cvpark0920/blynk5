export interface MenuOption {
  id: string;
  labelKO: string;
  labelVN: string;
  labelEN?: string;
  priceVND: number;
}

export interface MenuItem {
  id: string;
  nameKO: string;
  nameVN: string;
  nameEN?: string;
  priceVND: number;
  category: 'food' | 'drink' | 'dessert';
  imageQuery: string;
  descriptionKO?: string;
  descriptionVN?: string;
  descriptionEN?: string;
  options?: MenuOption[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'system' | 'staff';
  textKO: string;
  textVN: string;
  textEN?: string;
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
  icon: string;
  labelKO: string;
  labelVN: string;
  labelEN?: string;
  action: 'message' | 'toggle_feature';
  messageKO?: string;
  messageVN?: string;
  messageEN?: string;
}
